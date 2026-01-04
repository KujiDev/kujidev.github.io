/**
 * =============================================================================
 * A* PATHFINDING SYSTEM
 * =============================================================================
 * 
 * Grid-based A* pathfinding implementation.
 * 
 * FUTURE RAPIER INTEGRATION:
 * ==========================
 * When integrating with @react-three/rapier:
 * 1. Use rapier.castRay() to check walkability
 * 2. Bake navmesh from colliders
 * 3. Update isWalkable() to query physics world
 * 
 * CURRENT IMPLEMENTATION:
 * =======================
 * Uses a simple grid with configurable obstacles.
 * Obstacles can be added/removed dynamically.
 */

import * as THREE from 'three';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  // Grid settings
  cellSize: 0.5,           // Size of each navigation cell
  gridExtent: 50,          // Half-size of navigation grid (total = extent * 2)
  
  // Pathfinding settings
  diagonalCost: 1.414,     // sqrt(2) for diagonal movement
  straightCost: 1.0,       // Cost for straight movement
  maxIterations: 10000,    // Safety limit for pathfinding
  
  // Path smoothing
  smoothPath: true,        // Apply path smoothing
  smoothingIterations: 2,  // Number of smoothing passes
};

// =============================================================================
// PRIORITY QUEUE (Min-Heap for A*)
// =============================================================================

class PriorityQueue {
  constructor() {
    this.heap = [];
  }
  
  push(node, priority) {
    this.heap.push({ node, priority });
    this._bubbleUp(this.heap.length - 1);
  }
  
  pop() {
    if (this.heap.length === 0) return null;
    
    const top = this.heap[0];
    const last = this.heap.pop();
    
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    
    return top.node;
  }
  
  isEmpty() {
    return this.heap.length === 0;
  }
  
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }
  
  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      
      if (smallest === index) break;
      
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

// =============================================================================
// NAVIGATION GRID
// =============================================================================

class NavigationGrid {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.obstacles = new Set(); // Set of "x,z" strings for blocked cells
    
    // For future rapier integration
    this.rapierWorld = null;
    this.useRapier = false;
  }
  
  /**
   * Convert world position to grid coordinates
   */
  worldToGrid(worldX, worldZ) {
    const { cellSize, gridExtent } = this.config;
    return {
      x: Math.floor((worldX + gridExtent) / cellSize),
      z: Math.floor((worldZ + gridExtent) / cellSize),
    };
  }
  
  /**
   * Convert grid coordinates to world position (center of cell)
   */
  gridToWorld(gridX, gridZ) {
    const { cellSize, gridExtent } = this.config;
    return {
      x: (gridX * cellSize) - gridExtent + (cellSize / 2),
      z: (gridZ * cellSize) - gridExtent + (cellSize / 2),
    };
  }
  
  /**
   * Get grid key string for a position
   */
  getKey(x, z) {
    return `${x},${z}`;
  }
  
  /**
   * Check if a cell is walkable
   * 
   * RAPIER INTEGRATION POINT:
   * When useRapier is true, this will raycast to check for obstacles
   */
  isWalkable(gridX, gridZ) {
    const { gridExtent, cellSize } = this.config;
    const maxCell = Math.floor((gridExtent * 2) / cellSize);
    
    // Out of bounds check
    if (gridX < 0 || gridX >= maxCell || gridZ < 0 || gridZ >= maxCell) {
      return false;
    }
    
    // Check obstacle set
    if (this.obstacles.has(this.getKey(gridX, gridZ))) {
      return false;
    }
    
    // Future: Rapier raycast check
    if (this.useRapier && this.rapierWorld) {
      // TODO: Implement rapier collision check
      // const worldPos = this.gridToWorld(gridX, gridZ);
      // const ray = new RAPIER.Ray({ x: worldPos.x, y: 10, z: worldPos.z }, { x: 0, y: -1, z: 0 });
      // const hit = this.rapierWorld.castRay(ray, 20, true);
      // if (hit && hit.collider.isSensor() === false) return false;
    }
    
    return true;
  }
  
  /**
   * Add an obstacle at world position
   */
  addObstacle(worldX, worldZ, radius = 0.5) {
    const { cellSize } = this.config;
    const center = this.worldToGrid(worldX, worldZ);
    const cellRadius = Math.ceil(radius / cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        this.obstacles.add(this.getKey(center.x + dx, center.z + dz));
      }
    }
  }
  
  /**
   * Remove an obstacle at world position
   */
  removeObstacle(worldX, worldZ, radius = 0.5) {
    const { cellSize } = this.config;
    const center = this.worldToGrid(worldX, worldZ);
    const cellRadius = Math.ceil(radius / cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        this.obstacles.delete(this.getKey(center.x + dx, center.z + dz));
      }
    }
  }
  
  /**
   * Clear all obstacles
   */
  clearObstacles() {
    this.obstacles.clear();
  }
  
  /**
   * Set rapier world for collision queries
   * Call this when rapier is initialized
   */
  setRapierWorld(world) {
    this.rapierWorld = world;
    this.useRapier = true;
  }
  
  /**
   * Get neighboring cells (8-directional)
   */
  getNeighbors(gridX, gridZ) {
    const { straightCost, diagonalCost } = this.config;
    const neighbors = [];
    
    // 8 directions: N, NE, E, SE, S, SW, W, NW
    const directions = [
      { dx: 0, dz: -1, cost: straightCost },  // N
      { dx: 1, dz: -1, cost: diagonalCost },  // NE
      { dx: 1, dz: 0, cost: straightCost },   // E
      { dx: 1, dz: 1, cost: diagonalCost },   // SE
      { dx: 0, dz: 1, cost: straightCost },   // S
      { dx: -1, dz: 1, cost: diagonalCost },  // SW
      { dx: -1, dz: 0, cost: straightCost },  // W
      { dx: -1, dz: -1, cost: diagonalCost }, // NW
    ];
    
    for (const { dx, dz, cost } of directions) {
      const nx = gridX + dx;
      const nz = gridZ + dz;
      
      if (this.isWalkable(nx, nz)) {
        // For diagonal movement, check that adjacent cells are also walkable
        // This prevents corner-cutting through obstacles
        if (dx !== 0 && dz !== 0) {
          if (!this.isWalkable(gridX + dx, gridZ) || !this.isWalkable(gridX, gridZ + dz)) {
            continue;
          }
        }
        
        neighbors.push({ x: nx, z: nz, cost });
      }
    }
    
    return neighbors;
  }
}

// =============================================================================
// A* PATHFINDER
// =============================================================================

class Pathfinder {
  constructor(config = {}) {
    this.grid = new NavigationGrid(config);
    this.config = this.grid.config;
  }
  
  /**
   * Heuristic function (Euclidean distance)
   */
  heuristic(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    return Math.sqrt(dx * dx + dz * dz);
  }
  
  /**
   * Find path from start to goal (world coordinates)
   * 
   * @param {number} startX - Start X position (world)
   * @param {number} startZ - Start Z position (world)
   * @param {number} goalX - Goal X position (world)
   * @param {number} goalZ - Goal Z position (world)
   * @returns {Array<{x: number, z: number}>} Path in world coordinates, or empty if no path
   */
  findPath(startX, startZ, goalX, goalZ) {
    const start = this.grid.worldToGrid(startX, startZ);
    const goal = this.grid.worldToGrid(goalX, goalZ);
    
    // Quick check: if goal is not walkable, find nearest walkable cell
    if (!this.grid.isWalkable(goal.x, goal.z)) {
      const nearest = this._findNearestWalkable(goal.x, goal.z);
      if (!nearest) return [];
      goal.x = nearest.x;
      goal.z = nearest.z;
    }
    
    // Quick check: if start is not walkable, something is wrong
    if (!this.grid.isWalkable(start.x, start.z)) {
      console.warn('Pathfinder: Start position is not walkable');
      return [];
    }
    
    // A* algorithm
    const openSet = new PriorityQueue();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    const startKey = this.grid.getKey(start.x, start.z);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start.x, start.z, goal.x, goal.z));
    openSet.push(start, fScore.get(startKey));
    
    const closedSet = new Set();
    let iterations = 0;
    
    while (!openSet.isEmpty() && iterations < this.config.maxIterations) {
      iterations++;
      
      const current = openSet.pop();
      const currentKey = this.grid.getKey(current.x, current.z);
      
      // Goal reached!
      if (current.x === goal.x && current.z === goal.z) {
        return this._reconstructPath(cameFrom, current);
      }
      
      if (closedSet.has(currentKey)) continue;
      closedSet.add(currentKey);
      
      // Explore neighbors
      for (const neighbor of this.grid.getNeighbors(current.x, current.z)) {
        const neighborKey = this.grid.getKey(neighbor.x, neighbor.z);
        
        if (closedSet.has(neighborKey)) continue;
        
        const tentativeG = gScore.get(currentKey) + neighbor.cost;
        
        if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          
          const h = this.heuristic(neighbor.x, neighbor.z, goal.x, goal.z);
          const f = tentativeG + h;
          fScore.set(neighborKey, f);
          
          openSet.push({ x: neighbor.x, z: neighbor.z }, f);
        }
      }
    }
    
    // No path found
    console.warn('Pathfinder: No path found after', iterations, 'iterations');
    return [];
  }
  
  /**
   * Reconstruct path from A* result
   */
  _reconstructPath(cameFrom, current) {
    const pathGrid = [current];
    let currentKey = this.grid.getKey(current.x, current.z);
    
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey);
      currentKey = this.grid.getKey(current.x, current.z);
      pathGrid.unshift(current);
    }
    
    // Convert to world coordinates
    let pathWorld = pathGrid.map(cell => {
      const world = this.grid.gridToWorld(cell.x, cell.z);
      return new THREE.Vector3(world.x, 0, world.z);
    });
    
    // Apply path smoothing if enabled
    if (this.config.smoothPath) {
      pathWorld = this._smoothPath(pathWorld);
    }
    
    return pathWorld;
  }
  
  /**
   * Smooth the path using Chaikin's algorithm
   */
  _smoothPath(path) {
    if (path.length < 3) return path;
    
    let smoothed = path;
    
    for (let iter = 0; iter < this.config.smoothingIterations; iter++) {
      const newPath = [smoothed[0]]; // Keep start point
      
      for (let i = 0; i < smoothed.length - 1; i++) {
        const p0 = smoothed[i];
        const p1 = smoothed[i + 1];
        
        // Create two new points at 25% and 75% along the segment
        const q = new THREE.Vector3().lerpVectors(p0, p1, 0.25);
        const r = new THREE.Vector3().lerpVectors(p0, p1, 0.75);
        
        newPath.push(q, r);
      }
      
      newPath.push(smoothed[smoothed.length - 1]); // Keep end point
      smoothed = newPath;
    }
    
    return smoothed;
  }
  
  /**
   * Find nearest walkable cell to a given position
   */
  _findNearestWalkable(gridX, gridZ, maxRadius = 10) {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r || Math.abs(dz) === r) {
            if (this.grid.isWalkable(gridX + dx, gridZ + dz)) {
              return { x: gridX + dx, z: gridZ + dz };
            }
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Expose grid methods
   */
  addObstacle(worldX, worldZ, radius) {
    this.grid.addObstacle(worldX, worldZ, radius);
  }
  
  removeObstacle(worldX, worldZ, radius) {
    this.grid.removeObstacle(worldX, worldZ, radius);
  }
  
  clearObstacles() {
    this.grid.clearObstacles();
  }
  
  setRapierWorld(world) {
    this.grid.setRapierWorld(world);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const pathfinder = new Pathfinder();

export default Pathfinder;
