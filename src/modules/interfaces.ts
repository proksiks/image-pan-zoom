/**
 * Options for configuring the ImagePanZoom behavior
 */
export interface ImagePanZoomOptions {
  /**
   * Minimum scale value (default: 0.5)
   */
  minScale?: number
  /**
   * Maximum scale value (default: 3)
   */
  maxScale?: number
  /**
   * Initial scale value (default: 1)
   */
  initialScale?: number
  /**
   * Speed of zoom via mouse wheel (default: 0.0015)
   */
  wheelZoomSpeed?: number
  /**
   * Padding for boundaries in percentage (default: 0.1)
   */
  boundsPadding?: number
  /**
   * Friction coefficient for kinetic motion (default: 0.92)
   */
  friction?: number
  /**
   * Maximum speed for kinetic motion (default: 300)
   */
  maxSpeed?: number
  /**
   * Enable smooth transitions (default: false)
   */
  transition?: boolean
  /**
   * Speed for pinch zoom (default: 1)
   */
  pinchSpeed?: number
  /**
   * Enable elastic (rubber band) effect at boundaries (default: true)
   */
  elastic?: boolean
  /**
   * Elastic resistance factor (default: 0.15)
   */
  elasticResistance?: number
  /**
   * Elastic bounce factor (default: 0.3)
   */
  elasticBounce?: number
  /**
   * Minimum elastic distance (default: 5)
   */
  minElasticDistance?: number
  /**
   * Enable rotation gesture with two fingers (default: true)
   */
  enableRotation?: boolean
}

/**
 * Represents the current transformation state
 */
export interface Transform {
  /**
   * Current scale value
   */
  scale: number
  /**
   * X offset position
   */
  x: number
  /**
   * Y offset position
   */
  y: number
  /**
   * Rotation angle in degrees
   */
  rotation: number
}

/**
 * Represents element sizes and boundaries
 */
export interface ElementSizes {
  /**
   * Container width
   */
  containerWidth: number
  /**
   * Container height
   */
  containerHeight: number
  /**
   * Padding for boundaries
   */
  boundsPadding: number
  /**
   * Scaled and rotated content width
   */
  contentWidth: number
  /**
   * Scaled and rotated content height
   */
  contentHeight: number
  /**
   * Whether content fits horizontally
   */
  fitsHorizontally: boolean
  /**
   * Whether content fits vertically
   */
  fitsVertically: boolean
  /**
   * Minimum X position
   */
  minX: number
  /**
   * Maximum X position
   */
  maxX: number
  /**
   * Minimum Y position
   */
  minY: number
  /**
   * Maximum Y position
   */
  maxY: number
}