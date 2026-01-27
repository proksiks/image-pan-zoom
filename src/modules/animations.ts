import { calculateBoundaries, clampPosition, getSizes } from './utils'

interface ImagePanZoomInstance {
  x: number
  y: number
  scale: number
  rotation: number
  options: Required<{
    minScale: number
    maxScale: number
    initialScale: number
    wheelZoomSpeed: number
    boundsPadding: number
    friction: number
    maxSpeed: number
    transition: boolean
    pinchSpeed: number
    elastic: boolean
    elasticResistance: number
    elasticBounce: number
    minElasticDistance: number
  }>
  velocityX: number
  velocityY: number
  velocityScale: number
  animationFrameId: number | null
  isAnimatingElastic: boolean
  elasticAnimationId: number | null
  elasticX: number
  elasticY: number
  container: HTMLElement
  content: HTMLElement
  applyTransform: (useTransition?: boolean) => void
  stopAnimation: () => void
}

export function stopAnimation(instance: ImagePanZoomInstance): void {
  if (instance.animationFrameId !== null) {
    cancelAnimationFrame(instance.animationFrameId)
    instance.animationFrameId = null
  }

  if (instance.elasticAnimationId !== null) {
    cancelAnimationFrame(instance.elasticAnimationId)
    instance.elasticAnimationId = null
    instance.isAnimatingElastic = false
  }
}

export function animateKinetic(instance: ImagePanZoomInstance): void {
  if (Math.abs(instance.velocityX) < 0.5 && Math.abs(instance.velocityY) < 0.5 && Math.abs(instance.velocityScale) < 0.001) {
    stopAnimation(instance)
    animateElasticReturn(instance)
    instance.applyTransform(false)
    return
  }

  instance.x += instance.velocityX
  instance.y += instance.velocityY
  instance.scale += instance.velocityScale

  // Make sure scale stays within bounds
  if (instance.scale < instance.options.minScale) instance.scale = instance.options.minScale
  if (instance.scale > instance.options.maxScale) instance.scale = instance.options.maxScale

  const clamped = clampPosition(instance, instance.x, instance.y, true)
  instance.x = clamped.x
  instance.y = clamped.y

  instance.velocityX *= instance.options.friction
  instance.velocityY *= instance.options.friction
  instance.velocityScale *= instance.options.friction

  instance.applyTransform(false)
  instance.animationFrameId = requestAnimationFrame(() => animateKinetic(instance))
}

/**
 * Apply elastic bounce animation when released
 */
export function animateElasticReturn(instance: ImagePanZoomInstance): void {
  if (instance.isAnimatingElastic || !instance.options.elastic) return

  const sizes = getSizes(instance)
  const bounds = calculateBoundaries(instance, false)

  const needsBounceX = !sizes.fitsHorizontally && (instance.x < bounds.minX || instance.x > bounds.maxX)
  const needsBounceY = !sizes.fitsVertically && (instance.y < bounds.minY || instance.y > bounds.maxY)

  if (!needsBounceX && !needsBounceY) return

  instance.isAnimatingElastic = true
  stopAnimation(instance)

  const startX = instance.x
  const startY = instance.y
  const targetX = Math.min(bounds.maxX, Math.max(bounds.minX, startX))
  const targetY = Math.min(bounds.maxY, Math.max(bounds.minY, startY))

  const startTime = Date.now()
  const duration = 300

  const animate = () => {
    const now = Date.now()
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)

    const easedProgress = 1 - Math.pow(1 - progress, 3)

    instance.x = startX + (targetX - startX) * easedProgress
    instance.y = startY + (targetY - startY) * easedProgress

    instance.applyTransform(false)

    if (progress < 1) {
      instance.elasticAnimationId = requestAnimationFrame(animate)
    } else {
      instance.isAnimatingElastic = false
      instance.elasticAnimationId = null
    }
  }

  instance.elasticAnimationId = requestAnimationFrame(animate)
}