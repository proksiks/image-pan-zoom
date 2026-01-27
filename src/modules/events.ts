import { clampPosition, clampScale, getSizes } from './utils'

interface ImagePanZoomInstance {
  container: HTMLElement
  content: HTMLElement
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

  scale: number
  x: number
  y: number
  rotation: number

  isPanning: boolean
  didMove: boolean
  startClientX: number
  startClientY: number
  startX: number
  startY: number

  velocityX: number
  velocityY: number
  velocityScale: number
  lastMoveTime: number
  lastClientX: number
  lastClientY: number
  lastScale: number
  animationFrameId: number | null

  DRAG_THRESHOLD: number

  touchStartDistance: number
  touchStartScale: number
  touchCenterX: number
  touchCenterY: number
  isPinching: boolean
  lastTouchCenterX: number
  lastTouchCenterY: number

  transitionDuration: number
  transitionEasing: string
  isTransitioning: boolean
  transitionTimeout: number | null

  lastTouchEndTime: number
  lastTouchX: number
  lastTouchY: number
  DOUBLE_TAP_DELAY: number
  DOUBLE_TAP_THRESHOLD: number

  elasticX: number
  elasticY: number
  isAnimatingElastic: boolean
  elasticAnimationId: number | null

  stopAnimation: () => void
  applyTransform: (useTransition?: boolean) => void
  animateKinetic: () => void
  animateElasticReturn: () => void
  zoomToPoint: (clientX: number, clientY: number, deltaScale: number) => void
}


export function handleWheel(instance: ImagePanZoomInstance, e: WheelEvent): void {
  e.preventDefault()
  instance.stopAnimation()
  instance.velocityX = 0
  instance.velocityY = 0
  instance.velocityScale = 0

  const delta = -e.deltaY * instance.options.wheelZoomSpeed
  const factor = 1 + delta
  if (factor === 0) return

  instance.zoomToPoint(e.clientX, e.clientY, factor)
}


export function handlePointerDown(instance: ImagePanZoomInstance, e: PointerEvent): void {
  if (e.button !== 0) return

  instance.stopAnimation()
  instance.isAnimatingElastic = false

  instance.isPanning = true
  instance.didMove = false
  instance.startClientX = e.clientX
  instance.startClientY = e.clientY
  instance.startX = instance.x
  instance.startY = instance.y

  instance.lastClientX = e.clientX
  instance.lastClientY = e.clientY
  instance.lastScale = instance.scale
  instance.lastMoveTime = Date.now()
  instance.velocityX = 0
  instance.velocityY = 0
  instance.velocityScale = 0

  instance.content.setPointerCapture(e.pointerId)
}
/**
 * Handles the pointer move event to update the position and velocity of the instance.
 * @param {ImagePanZoomInstance} instance - The instance to update.
 * @param {PointerEvent} e - The event to handle.
 */

export function handlePointerMove(instance: ImagePanZoomInstance, e: PointerEvent): void {
  if (!instance.isPanning) return

  const dx = e.clientX - instance.startClientX
  const dy = e.clientY - instance.startClientY

  if (!instance.didMove && Math.hypot(dx, dy) < instance.DRAG_THRESHOLD) return
  instance.didMove = true

  const nextX = instance.startX + dx
  const nextY = instance.startY + dy

  const clamped = clampPosition(instance, nextX, nextY, true)
  instance.x = clamped.x
  instance.y = clamped.y

  const now = Date.now()
  const dt = now - instance.lastMoveTime
  if (dt > 0) {
    const vx = (e.clientX - instance.lastClientX) / dt * 16
    const vy = (e.clientY - instance.lastClientY) / dt * 16
    const scaleDiff = instance.scale - instance.lastScale
    const scaleVelocity = scaleDiff / dt * 16

    instance.velocityX = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vx))
    instance.velocityY = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vy))
    instance.velocityScale = Math.max(-0.01, Math.min(0.01, scaleVelocity))
  }

  instance.lastClientX = e.clientX
  instance.lastClientY = e.clientY
  instance.lastScale = instance.scale
  instance.lastMoveTime = now

  instance.applyTransform(false)
}


export function handlePointerUp(instance: ImagePanZoomInstance, e: PointerEvent): void {
  if (!instance.isPanning) return
  instance.isPanning = false

  try {
    instance.content.releasePointerCapture(e.pointerId)
  } catch { }

  if (instance.didMove) {
    if (Math.abs(instance.velocityX) > 1 || Math.abs(instance.velocityY) > 1 || Math.abs(instance.velocityScale) > 0.001) {
      instance.animationFrameId = requestAnimationFrame(instance.animateKinetic)
    } else {
      instance.animateElasticReturn()
    }
  }
}


export function handleDoubleClick(instance: ImagePanZoomInstance, e: MouseEvent): void {
  instance.stopAnimation()
  const rect = instance.container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  const targetScale = Math.min(instance.scale * 1.5, instance.options.maxScale)
  const scaleRatio = targetScale / instance.scale

  const localX = clickX - centerX - instance.x
  const localY = clickY - centerY - instance.y
  instance.scale = targetScale

  const newLocalX = localX * scaleRatio
  const newLocalY = localY * scaleRatio
  instance.x += localX - newLocalX
  instance.y += localY - newLocalY

  const clamped = clampPosition(instance, instance.x, instance.y, false)
  instance.x = clamped.x
  instance.y = clamped.y

  instance.applyTransform(true)
}
/**
 * Handle touch start event.
 * If two touch points are detected, it will start pinching mode.
 * If one touch point is detected, it will start dragging mode.
 */

export function handleTouchStart(instance: ImagePanZoomInstance, e: TouchEvent): void {
  if (e.touches.length === 2) {
    e.preventDefault();
    instance.stopAnimation();
    instance.isPinching = true;
    instance.velocityX = 0;
    instance.velocityY = 0;
    instance.velocityScale = 0;

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    const dist = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );

    instance.touchCenterX = (touch1.clientX + touch2.clientX) / 2;
    instance.touchCenterY = (touch1.clientY + touch2.clientY) / 2;
    instance.lastTouchCenterX = instance.touchCenterX;
    instance.lastTouchCenterY = instance.touchCenterY;

    instance.touchStartDistance = dist;
    instance.touchStartScale = instance.scale;

    instance.isPanning = false;
    instance.didMove = false;
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    const syntheticEvent = new PointerEvent('pointerdown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0
    });
    handlePointerDown(instance, syntheticEvent);
  }
}


export function handleTouchMove(instance: ImagePanZoomInstance, e: TouchEvent): void {
  if (e.touches.length === 2 && instance.isPinching) {
    e.preventDefault()

    const touch1 = e.touches[0]
    const touch2 = e.touches[1]

    const currentDist = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    )

    const currentCenterX = (touch1.clientX + touch2.clientX) / 2
    const currentCenterY = (touch1.clientY + touch2.clientY) / 2


    const scaleMultiplier = currentDist / instance.touchStartDistance
    const newScale = instance.touchStartScale * scaleMultiplier * instance.options.pinchSpeed
    const clampedScale = clampScale(instance, newScale)

    if (clampedScale !== instance.scale) {
      const deltaX = currentCenterX - instance.lastTouchCenterX
      const deltaY = currentCenterY - instance.lastTouchCenterY

      instance.x += deltaX
      instance.y += deltaY

      const scaleFactor = clampedScale / instance.scale
      instance.zoomToPoint(instance.touchCenterX, instance.touchCenterY, scaleFactor)

      instance.lastTouchCenterX = currentCenterX
      instance.lastTouchCenterY = currentCenterY
    }
  } else if (e.touches.length === 1 && !instance.isPinching) {
    const touch = e.touches[0]
    const syntheticEvent = new PointerEvent('pointermove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    handlePointerMove(instance, syntheticEvent)
  }
}
/**
 * Handle touch end event
 * @param {ImagePanZoomInstance} instance - The current instance
 * @param {TouchEvent} e - The touch event
 */

export function handleTouchEnd(instance: ImagePanZoomInstance, e: TouchEvent): void {
  if (instance.isPinching && e.touches.length < 2) {
    instance.isPinching = false;

    const now = Date.now();
    const dt = now - instance.lastMoveTime;
    if (dt > 0 && dt < 100) {
      const vx = (instance.lastTouchCenterX - instance.touchCenterX) / dt * 16;
      const vy = (instance.lastTouchCenterY - instance.touchCenterY) / dt * 16;

      instance.velocityX = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vx));
      instance.velocityY = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vy));

      if (Math.abs(instance.velocityX) > 1 || Math.abs(instance.velocityY) > 1) {
        instance.animationFrameId = requestAnimationFrame(instance.animateKinetic);
      } else {
        instance.animateElasticReturn();
      }
    } else {
      instance.animateElasticReturn();
    }
  }

  if (e.touches.length === 0) {
    if (instance.isPanning) {
      const syntheticEvent = new PointerEvent('pointerup', {
        clientX: 0,
        clientY: 0,
        button: 0
      });
      handlePointerUp(instance, syntheticEvent);
    }
    instance.isPinching = false;

    handleDoubleTapCheck(instance, e);
  }
}

/**
 * Handle double tap detection for touch devices
 */
export function handleDoubleTapCheck(instance: ImagePanZoomInstance, e: TouchEvent): void {
  const now = Date.now();
  const touch = e.changedTouches[0];

  if (!touch) return;

  const touchX = touch.clientX;
  const touchY = touch.clientY;

  if (now - instance.lastTouchEndTime < instance.DOUBLE_TAP_DELAY &&
    Math.abs(touchX - instance.lastTouchX) < instance.DOUBLE_TAP_THRESHOLD &&
    Math.abs(touchY - instance.lastTouchY) < instance.DOUBLE_TAP_THRESHOLD) {

    handleDoubleTap(instance, touchX, touchY);

    instance.lastTouchEndTime = 0;
    instance.lastTouchX = 0;
    instance.lastTouchY = 0;
  } else {
    instance.lastTouchEndTime = now;
    instance.lastTouchX = touchX;
    instance.lastTouchY = touchY;
  }
}

/**
 * Handle double tap zoom (similar to double click)
 */
export function handleDoubleTap(instance: ImagePanZoomInstance, clientX: number, clientY: number): void {
  instance.stopAnimation();
  const rect = instance.container.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const clickX = clientX - rect.left;
  const clickY = clientY - rect.top;

  const targetScale = Math.min(instance.scale * 1.5, instance.options.maxScale);
  const scaleRatio = targetScale / instance.scale;

  const localX = clickX - centerX - instance.x;
  const localY = clickY - centerY - instance.y;
  instance.scale = targetScale;

  const newLocalX = localX * scaleRatio;
  const newLocalY = localY * scaleRatio;
  instance.x += localX - newLocalX;
  instance.y += localY - newLocalY;

  const clamped = clampPosition(instance, instance.x, instance.y, false);
  instance.x = clamped.x;
  instance.y = clamped.y;

  instance.applyTransform(true);
}