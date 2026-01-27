import { ElementSizes } from './interfaces'

// We'll define a minimal interface that matches the properties needed by utility functions
interface ImagePanZoomInstance {
  container: HTMLElement
  content: HTMLElement
  scale: number
  x: number
  y: number
  rotation: number
  options: Required<{ 
    minScale: number,
    maxScale: number,
    initialScale: number,
    wheelZoomSpeed: number,
    boundsPadding: number,
    friction: number,
    maxSpeed: number,
    transition: boolean,
    pinchSpeed: number,
    elastic: boolean,
    elasticResistance: number,
    elasticBounce: number,
    minElasticDistance: number
  }>
  elasticX: number
  elasticY: number
}

/**
 * Calculate and return the sizes of container and content elements
 */
export function getSizes(instance: ImagePanZoomInstance): ElementSizes {
  const contRect = instance.container.getBoundingClientRect()
  const contW = contRect.width
  const contH = contRect.height
  const pad = Math.min(contW, contH) * instance.options.boundsPadding

  const rawW = instance.content.offsetWidth
  const rawH = instance.content.offsetHeight

  const rad = instance.rotation * Math.PI / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))

  const rotatedW = rawW * instance.scale * cos + rawH * instance.scale * sin
  const rotatedH = rawW * instance.scale * sin + rawH * instance.scale * cos

  const fitsHorizontally = rotatedW <= contW
  const fitsVertically = rotatedH <= contH

  let minX: number, maxX: number, minY: number, maxY: number
  if (fitsHorizontally) {
    minX = maxX = 0
  } else {
    const halfContW = contW / 2
    const halfRotatedW = rotatedW / 2

    maxX = halfRotatedW - halfContW + pad
    minX = -(halfRotatedW - halfContW) - pad
  }

  if (fitsVertically) {
    minY = maxY = 0
  } else {
    const halfContH = contH / 2
    const halfRotatedH = rotatedH / 2

    maxY = halfRotatedH - halfContH + pad
    minY = -(halfRotatedH - halfContH) - pad
  }

  return {
    containerWidth: contW,
    containerHeight: contH,
    boundsPadding: pad,
    contentWidth: rotatedW,
    contentHeight: rotatedH,
    fitsHorizontally,
    fitsVertically,
    minX,
    maxX,
    minY,
    maxY
  }
}

/**
 * Calculate boundaries with optional elastic effect
 */
export function calculateBoundaries(instance: ImagePanZoomInstance, useElastic: boolean = false): { minX: number, maxX: number, minY: number, maxY: number } {
  const sizes = getSizes(instance)

  if (!useElastic || !instance.options.elastic) {
    return {
      minX: sizes.minX,
      maxX: sizes.maxX,
      minY: sizes.minY,
      maxY: sizes.maxY
    }
  }

  let minX = sizes.minX
  let maxX = sizes.maxX
  let minY = sizes.minY
  let maxY = sizes.maxY

  if (sizes.fitsHorizontally && sizes.fitsVertically) {
    return { minX, maxX, minY, maxY }
  }

  const currentX = instance.x + instance.elasticX
  const currentY = instance.y + instance.elasticY

  if (!sizes.fitsHorizontally) {
    if (currentX < minX) {
      const overshoot = minX - currentX
      instance.elasticX = -calculateElasticOffset(instance, overshoot)
    } else if (currentX > maxX) {
      const overshoot = currentX - maxX
      instance.elasticX = calculateElasticOffset(instance, overshoot)
    } else {
      instance.elasticX *= instance.options.elasticResistance
    }
  }

  if (!sizes.fitsVertically) {
    if (currentY < minY) {
      const overshoot = minY - currentY
      instance.elasticY = -calculateElasticOffset(instance, overshoot)
    } else if (currentY > maxY) {
      const overshoot = currentY - maxY
      instance.elasticY = calculateElasticOffset(instance, overshoot)
    } else {
      instance.elasticY *= instance.options.elasticResistance
    }
  }

  return {
    minX: minX - instance.elasticX,
    maxX: maxX - instance.elasticX,
    minY: minY - instance.elasticY,
    maxY: maxY - instance.elasticY
  }
}

/**
 * Calculate elastic offset using easeOutBounce-like function
 */
export function calculateElasticOffset(instance: ImagePanZoomInstance, overshoot: number): number {
  if (overshoot < instance.options.minElasticDistance) {
    return overshoot * instance.options.elasticResistance
  }

  const normalized = overshoot / 100
  return overshoot * instance.options.elasticResistance * (1 - Math.exp(-normalized))
}

export function clampPosition(instance: ImagePanZoomInstance, nextX: number, nextY: number, useElastic: boolean = false): { x: number; y: number } {
  const bounds = calculateBoundaries(instance, useElastic)

  const clampedX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX))
  const clampedY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY))

  return { x: clampedX, y: clampedY }
}

/**
 * Clamp the given scale to the range of [minScale, maxScale]
 * @param {number} next - the scale to be clamped
 * @returns {number} the clamped scale
 */
export function clampScale(instance: ImagePanZoomInstance, next: number): number {
  return Math.min(instance.options.maxScale, Math.max(instance.options.minScale, next))
}