/**
 * =============================================================================
 * GRAPH ENGINE - Runtime Graph Evaluation
 * =============================================================================
 * 
 * Evaluates computation graphs defined in JSON.
 * Used for skill scaling, stat calculations, conditional logic, etc.
 * 
 * ARCHITECTURE:
 * =============
 * - Graphs are pure data (JSON)
 * - This engine INTERPRETS graphs at runtime
 * - Nodes are evaluated in topological order
 * - Results are cached per evaluation
 * 
 * USAGE:
 * ======
 * import { evaluateGraph } from '@/engine/graph';
 * 
 * const result = evaluateGraph('spell_damage_scaling', {
 *   base_damage: 50,
 *   spell_power: 100,
 *   crit_chance: 0.25,
 *   crit_multiplier: 1.5
 * });
 * 
 * console.log(result.final_damage, result.is_crit);
 */

import { getGraphById } from './loader';

// =============================================================================
// NODE EVALUATORS
// =============================================================================

/**
 * Evaluator functions for each node type.
 * Each takes (node, inputs, context) and returns the output value.
 */
const NODE_EVALUATORS = {
  /**
   * Input node - reads from graph inputs
   */
  input: (node, inputs, context) => {
    const inputId = node.params?.inputId;
    if (inputId && inputId in context.inputs) {
      return context.inputs[inputId];
    }
    // Return default if defined
    const inputDef = context.graph.inputs?.find(i => i.id === inputId);
    return inputDef?.default ?? 0;
  },
  
  /**
   * Output node - just passes through
   */
  output: (node, inputs) => {
    return inputs.in ?? inputs[Object.keys(inputs)[0]] ?? 0;
  },
  
  /**
   * Constant node - returns a fixed value
   */
  constant: (node) => {
    return node.params?.value ?? 0;
  },
  
  /**
   * Stat read node - reads a stat from context
   */
  stat_read: (node, inputs, context) => {
    const statId = node.params?.stat;
    return context.stats?.[statId] ?? 0;
  },
  
  /**
   * Stat write node - writes to context (side effect)
   */
  stat_write: (node, inputs, context) => {
    const statId = node.params?.stat;
    if (statId) {
      context.statWrites = context.statWrites || {};
      context.statWrites[statId] = inputs.in ?? inputs.a ?? 0;
    }
    return inputs.in ?? inputs.a ?? 0;
  },
  
  /**
   * Math node - performs arithmetic operations
   */
  math: (node, inputs) => {
    const a = inputs.a ?? 0;
    const b = inputs.b ?? 0;
    
    switch (node.params?.operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return b !== 0 ? a / b : 0;
      case 'power': return Math.pow(a, b);
      case 'min': return Math.min(a, b);
      case 'max': return Math.max(a, b);
      case 'abs': return Math.abs(a);
      case 'floor': return Math.floor(a);
      case 'ceil': return Math.ceil(a);
      case 'round': return Math.round(a);
      default: return a;
    }
  },
  
  /**
   * Condition node - compares values
   */
  condition: (node, inputs) => {
    const a = inputs.a ?? 0;
    const b = inputs.b ?? 0;
    
    switch (node.params?.comparison) {
      case 'eq': return a === b;
      case 'neq': return a !== b;
      case 'gt': return a > b;
      case 'gte': return a >= b;
      case 'lt': return a < b;
      case 'lte': return a <= b;
      case 'and': return a && b;
      case 'or': return a || b;
      case 'not': return !a;
      default: return false;
    }
  },
  
  /**
   * Branch node - selects between true/false paths
   */
  branch: (node, inputs) => {
    const condition = inputs.condition ?? false;
    return condition ? (inputs.true ?? 0) : (inputs.false ?? 0);
  },
  
  /**
   * Event listener node - checks if event occurred
   */
  event_listener: (node, inputs, context) => {
    const eventName = node.params?.event;
    return context.events?.includes(eventName) ?? false;
  },
  
  /**
   * Effect node - triggers an effect (side effect)
   */
  effect: (node, inputs, context) => {
    const effectId = node.params?.effect;
    if (effectId && inputs.trigger) {
      context.effects = context.effects || [];
      context.effects.push({ id: effectId, params: node.params });
    }
    return inputs.trigger ?? false;
  },
  
  /**
   * Modifier node - applies a modifier to a value
   */
  modifier: (node, inputs) => {
    const value = inputs.value ?? inputs.a ?? 0;
    const modifier = inputs.modifier ?? inputs.b ?? 0;
    const type = node.params?.type ?? 'add';
    
    switch (type) {
      case 'add': return value + modifier;
      case 'multiply': return value * modifier;
      case 'percent': return value * (1 + modifier / 100);
      default: return value;
    }
  },
  
  /**
   * Random node - generates random value
   */
  random: (node) => {
    const min = node.params?.min ?? 0;
    const max = node.params?.max ?? 1;
    return min + Math.random() * (max - min);
  },
  
  /**
   * Clamp node - clamps value to range
   */
  clamp: (node, inputs) => {
    const value = inputs.value ?? inputs.a ?? 0;
    const min = node.params?.min ?? inputs.min ?? 0;
    const max = node.params?.max ?? inputs.max ?? 1;
    return Math.max(min, Math.min(max, value));
  },
  
  /**
   * Lerp node - linear interpolation
   */
  lerp: (node, inputs) => {
    const a = inputs.a ?? 0;
    const b = inputs.b ?? 1;
    const t = inputs.t ?? 0.5;
    return a + (b - a) * t;
  },
};

// =============================================================================
// GRAPH EVALUATION
// =============================================================================

/**
 * Build adjacency list from edges.
 */
function buildAdjacencyList(graph) {
  const adj = new Map();
  const inDegree = new Map();
  
  // Initialize all nodes
  for (const node of graph.nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  
  // Build edges
  for (const edge of graph.edges) {
    const fromNode = edge.from;
    const toNode = edge.to;
    
    if (adj.has(fromNode)) {
      adj.get(fromNode).push({
        to: toNode,
        fromPort: edge.fromPort || 'out',
        toPort: edge.toPort || 'in',
      });
    }
    
    if (inDegree.has(toNode)) {
      inDegree.set(toNode, inDegree.get(toNode) + 1);
    }
  }
  
  return { adj, inDegree };
}

/**
 * Topological sort using Kahn's algorithm.
 */
function topologicalSort(graph) {
  const { adj, inDegree } = buildAdjacencyList(graph);
  const queue = [];
  const result = [];
  
  // Start with nodes that have no incoming edges
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }
  
  while (queue.length > 0) {
    const nodeId = queue.shift();
    result.push(nodeId);
    
    for (const edge of adj.get(nodeId) || []) {
      const newDegree = inDegree.get(edge.to) - 1;
      inDegree.set(edge.to, newDegree);
      
      if (newDegree === 0) {
        queue.push(edge.to);
      }
    }
  }
  
  return result;
}

/**
 * Evaluate a graph with given inputs.
 * 
 * @param {string} graphId - Graph ID to evaluate
 * @param {Object} inputs - Input values for the graph
 * @param {Object} context - Additional context (stats, events, etc.)
 * @returns {Object} Output values from the graph
 */
export function evaluateGraph(graphId, inputs = {}, context = {}) {
  const graph = typeof graphId === 'string' ? getGraphById(graphId) : graphId;
  
  if (!graph) {
    console.error(`[Graph] Unknown graph: ${graphId}`);
    return {};
  }
  
  // Set up context
  const evalContext = {
    graph,
    inputs,
    stats: context.stats || {},
    events: context.events || [],
    effects: [],
    statWrites: {},
  };
  
  // Build node map for quick lookup
  const nodeMap = new Map();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }
  
  // Build reverse edge map (node -> incoming edges)
  const incomingEdges = new Map();
  for (const node of graph.nodes) {
    incomingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (incomingEdges.has(edge.to)) {
      incomingEdges.get(edge.to).push(edge);
    }
  }
  
  // Get evaluation order
  const order = topologicalSort(graph);
  
  // Cache for node outputs
  const nodeOutputs = new Map();
  
  // Evaluate nodes in order
  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    
    // Gather inputs from incoming edges
    const nodeInputs = {};
    for (const edge of incomingEdges.get(nodeId) || []) {
      const sourceOutput = nodeOutputs.get(edge.from);
      const port = edge.toPort || 'in';
      nodeInputs[port] = sourceOutput;
    }
    
    // Get evaluator for this node type
    const evaluator = NODE_EVALUATORS[node.type];
    if (!evaluator) {
      console.warn(`[Graph] Unknown node type: ${node.type}`);
      nodeOutputs.set(nodeId, 0);
      continue;
    }
    
    // Evaluate node
    const output = evaluator(node, nodeInputs, evalContext);
    nodeOutputs.set(nodeId, output);
  }
  
  // Collect outputs
  const outputs = {};
  for (const node of graph.nodes) {
    if (node.type === 'output') {
      const outputId = node.params?.outputId || node.id;
      outputs[outputId] = nodeOutputs.get(node.id);
    }
  }
  
  // Include side effects
  if (evalContext.effects.length > 0) {
    outputs._effects = evalContext.effects;
  }
  if (Object.keys(evalContext.statWrites).length > 0) {
    outputs._statWrites = evalContext.statWrites;
  }
  
  return outputs;
}

/**
 * Validate a graph definition.
 * Returns an array of validation errors (empty if valid).
 */
export function validateGraph(graph) {
  const errors = [];
  
  if (!graph.id) {
    errors.push('Graph must have an id');
  }
  
  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    errors.push('Graph must have a nodes array');
    return errors;
  }
  
  if (!graph.edges || !Array.isArray(graph.edges)) {
    errors.push('Graph must have an edges array');
    return errors;
  }
  
  // Check for duplicate node IDs
  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
    
    if (!node.type) {
      errors.push(`Node ${node.id} must have a type`);
    }
    
    if (!NODE_EVALUATORS[node.type]) {
      errors.push(`Node ${node.id} has unknown type: ${node.type}`);
    }
  }
  
  // Check edges reference valid nodes
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references unknown source node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references unknown target node: ${edge.to}`);
    }
  }
  
  // Check for cycles
  try {
    const order = topologicalSort(graph);
    if (order.length !== graph.nodes.length) {
      errors.push('Graph contains a cycle');
    }
  } catch (e) {
    errors.push('Graph contains a cycle');
  }
  
  return errors;
}
