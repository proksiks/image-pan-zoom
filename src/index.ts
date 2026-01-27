/**
 * ImagePanZoom - A lightweight library for pan and zoom functionality
 * @version 1.0.0
 */

import { ImagePanZoom as ImagePanZoomCore } from './modules/core'
import { ImagePanZoomOptions } from './modules/interfaces'

/**
 * Factory function to create a new ImagePanZoom instance
 */
export function createImagePanZoom(
  container: HTMLElement,
  content: HTMLElement,
  options?: ImagePanZoomOptions
): ImagePanZoomCore {
  return new ImagePanZoomCore(container, content, options)
}

export { ImagePanZoomCore as ImagePanZoom }