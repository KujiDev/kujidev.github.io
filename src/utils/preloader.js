/**
 * =============================================================================
 * ASSET PRELOADER - Preload Scene Assets Before Transition
 * =============================================================================
 * 
 * Utility for preloading assets (models, textures, sounds) before a scene
 * becomes active. This prevents loading hitches during gameplay.
 * 
 * USAGE:
 * ======
 * // In scene component
 * useScenePreload(SCENES.GAME, async () => {
 *   await preloadModels(['town.glb', 'wizard.glb']);
 *   await preloadTextures(['ground.jpg']);
 * });
 * 
 * INTEGRATION:
 * ============
 * - Works with three.js GLTFLoader, TextureLoader, etc.
 * - Integrates with sceneStore.markPreloaded()
 * - Reports progress for loading UI
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import useSceneStore from '@/stores/sceneStore';

// =============================================================================
// LOADER INSTANCES (reused)
// =============================================================================

let gltfLoader = null;
let textureLoader = null;
let dracoLoader = null;

function getGLTFLoader() {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    
    // Set up Draco decoder for compressed models
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    gltfLoader.setDRACOLoader(dracoLoader);
  }
  return gltfLoader;
}

function getTextureLoader() {
  if (!textureLoader) {
    textureLoader = new THREE.TextureLoader();
  }
  return textureLoader;
}

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

/**
 * Preload a single GLTF model.
 * @param {string} url - URL to the model
 * @returns {Promise<THREE.Group>} The loaded model
 */
export function preloadModel(url) {
  return new Promise((resolve, reject) => {
    const loader = getGLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (import.meta.env.DEV) {
          console.log(`[Preloader] Model loaded: ${url}`);
        }
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        console.error(`[Preloader] Failed to load model: ${url}`, error);
        reject(error);
      }
    );
  });
}

/**
 * Preload multiple GLTF models.
 * @param {string[]} urls - URLs to the models
 * @returns {Promise<THREE.Group[]>} The loaded models
 */
export function preloadModels(urls) {
  return Promise.all(urls.map(preloadModel));
}

/**
 * Preload a single texture.
 * @param {string} url - URL to the texture
 * @returns {Promise<THREE.Texture>} The loaded texture
 */
export function preloadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = getTextureLoader();
    loader.load(
      url,
      (texture) => {
        if (import.meta.env.DEV) {
          console.log(`[Preloader] Texture loaded: ${url}`);
        }
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error(`[Preloader] Failed to load texture: ${url}`, error);
        reject(error);
      }
    );
  });
}

/**
 * Preload multiple textures.
 * @param {string[]} urls - URLs to the textures
 * @returns {Promise<THREE.Texture[]>} The loaded textures
 */
export function preloadTextures(urls) {
  return Promise.all(urls.map(preloadTexture));
}

/**
 * Preload an image (for UI elements).
 * @param {string} url - URL to the image
 * @returns {Promise<HTMLImageElement>} The loaded image
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (import.meta.env.DEV) {
        console.log(`[Preloader] Image loaded: ${url}`);
      }
      resolve(img);
    };
    img.onerror = (error) => {
      console.error(`[Preloader] Failed to load image: ${url}`, error);
      reject(error);
    };
    img.src = url;
  });
}

/**
 * Preload multiple images.
 * @param {string[]} urls - URLs to the images
 * @returns {Promise<HTMLImageElement[]>} The loaded images
 */
export function preloadImages(urls) {
  return Promise.all(urls.map(preloadImage));
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook to preload assets for a scene.
 * Runs once when component mounts, marks scene as preloaded when done.
 * 
 * @param {string} sceneId - The scene ID to mark as preloaded
 * @param {() => Promise<void>} preloadFn - Async function that preloads assets
 */
export function useScenePreload(sceneId, preloadFn) {
  const markPreloaded = useSceneStore((s) => s.markPreloaded);
  const hasRun = useRef(false);
  
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    async function doPreload() {
      try {
        await preloadFn();
        markPreloaded(sceneId);
      } catch (error) {
        console.error(`[Preloader] Failed to preload scene ${sceneId}:`, error);
        // Still mark as preloaded so we don't block the game
        markPreloaded(sceneId);
      }
    }
    
    doPreload();
  }, [sceneId, preloadFn, markPreloaded]);
}

/**
 * Hook to check if a scene is preloaded.
 * @param {string} sceneId - The scene ID to check
 * @returns {boolean} Whether the scene is preloaded
 */
export function useIsPreloaded(sceneId) {
  return useSceneStore((s) => s.preloadedScenes.has(sceneId));
}

// =============================================================================
// ASSET CACHE
// =============================================================================

// Cache for preloaded assets to prevent re-loading
const assetCache = new Map();

/**
 * Get a cached asset or load it.
 * @param {string} url - URL to the asset
 * @param {() => Promise<T>} loadFn - Function to load the asset
 * @returns {Promise<T>} The asset (cached or loaded)
 */
export async function getCachedAsset(url, loadFn) {
  if (assetCache.has(url)) {
    return assetCache.get(url);
  }
  
  const asset = await loadFn();
  assetCache.set(url, asset);
  return asset;
}

/**
 * Clear the asset cache (for scene disposal).
 * @param {string[]} urls - URLs to clear (or undefined to clear all)
 */
export function clearAssetCache(urls) {
  if (urls) {
    for (const url of urls) {
      assetCache.delete(url);
    }
  } else {
    assetCache.clear();
  }
}

export default {
  preloadModel,
  preloadModels,
  preloadTexture,
  preloadTextures,
  preloadImage,
  preloadImages,
  getCachedAsset,
  clearAssetCache,
};
