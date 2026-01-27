import { clampPosition, clampScale } from './utils'

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
    enableRotation: boolean
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
  touchStartAngle: number
  initialRotation: number
  isPinching: boolean
  isRotating: boolean


  touchIds: [number | null, number | null]
  touchPoints: Map<number, { clientX: number, clientY: number }>


  elasticX: number
  elasticY: number
  isAnimatingElastic: boolean
  elasticAnimationId: number | null


  lastTouchEndTime: number
  lastTouchX: number
  lastTouchY: number
  DOUBLE_TAP_DELAY: number
  DOUBLE_TAP_THRESHOLD: number


  transitionDuration: number
  transitionEasing: string
  isTransitioning: boolean
  transitionTimeout: number | null


  stopAnimation: () => void
  applyTransform: (useTransition?: boolean) => void
  animateKinetic: () => void
  animateElasticReturn: () => void
}


function getAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1)
}


function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}


function getCenter(x1: number, y1: number, x2: number, y2: number): { x: number, y: number } {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2
  }
}


function worldToLocal(
  instance: ImagePanZoomInstance,
  worldX: number,
  worldY: number
) {
  const rect = instance.container.getBoundingClientRect()
  const containerCenterX = rect.left + rect.width / 2
  const containerCenterY = rect.top + rect.height / 2


  const pointX = worldX - containerCenterX - instance.x
  const pointY = worldY - containerCenterY - instance.y


  const angle = -instance.rotation * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const rotatedX = pointX * cos - pointY * sin
  const rotatedY = pointX * sin + pointY * cos


  return {
    x: rotatedX / instance.scale,
    y: rotatedY / instance.scale
  }
}


function applyAroundPivot(
  instance: ImagePanZoomInstance,
  pivotWorldX: number,
  pivotWorldY: number,
  newScale: number,
  newRotation: number
) {
  const rect = instance.container.getBoundingClientRect()
  const containerCenterX = rect.left + rect.width / 2
  const containerCenterY = rect.top + rect.height / 2


  const currentAngle = instance.rotation * Math.PI / 180
  const currentCos = Math.cos(currentAngle)
  const currentSin = Math.sin(currentAngle)


  const pivotToContainerX = pivotWorldX - containerCenterX - instance.x
  const pivotToContainerY = pivotWorldY - containerCenterY - instance.y


  const localX = (pivotToContainerX * currentCos + pivotToContainerY * currentSin) / instance.scale
  const localY = (-pivotToContainerX * currentSin + pivotToContainerY * currentCos) / instance.scale


  const newAngle = newRotation * Math.PI / 180
  const newCos = Math.cos(newAngle)
  const newSin = Math.sin(newAngle)

  const newPivotToContainerX = (localX * newCos - localY * newSin) * newScale
  const newPivotToContainerY = (localX * newSin + localY * newCos) * newScale


  instance.x = pivotWorldX - containerCenterX - newPivotToContainerX
  instance.y = pivotWorldY - containerCenterY - newPivotToContainerY

  instance.scale = newScale
  instance.rotation = newRotation
}

export function handleWheel(instance: ImagePanZoomInstance, e: WheelEvent) {
  e.preventDefault()
  instance.stopAnimation()

  const delta = -e.deltaY * instance.options.wheelZoomSpeed
  const factor = 1 + delta
  if (factor <= 0) return

  const targetScale = clampScale(instance, instance.scale * factor)

  applyAroundPivot(
    instance,
    e.clientX,
    e.clientY,
    targetScale,
    instance.rotation
  )

  instance.applyTransform(false)
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

export function handleTouchStart(instance: ImagePanZoomInstance, e: TouchEvent) {
  if (e.touches.length === 1) {

    const touch = e.touches[0]
    instance.isPanning = true
    instance.didMove = false
    instance.startClientX = touch.clientX
    instance.startClientY = touch.clientY
    instance.startX = instance.x
    instance.startY = instance.y

    instance.lastClientX = touch.clientX
    instance.lastClientY = touch.clientY
    instance.lastScale = instance.scale
    instance.lastMoveTime = Date.now()

    return
  }

  if (e.touches.length === 2) {
    e.preventDefault()
    instance.isPinching = true
    instance.isPanning = false

    const touch1 = e.touches[0]
    const touch2 = e.touches[1]

    instance.touchIds = [touch1.identifier, touch2.identifier]
    instance.touchPoints = new Map()
    instance.touchPoints.set(touch1.identifier, { clientX: touch1.clientX, clientY: touch1.clientY })
    instance.touchPoints.set(touch2.identifier, { clientX: touch2.clientX, clientY: touch2.clientY })

    instance.touchStartDistance = getDistance(
      touch1.clientX, touch1.clientY,
      touch2.clientX, touch2.clientY
    )
    instance.touchStartAngle = getAngle(
      touch1.clientX, touch1.clientY,
      touch2.clientX, touch2.clientY
    )
    instance.touchStartScale = instance.scale
    instance.initialRotation = instance.rotation
  }
}

export function handleTouchMove(instance: ImagePanZoomInstance, e: TouchEvent) {
  if (instance.isPinching && e.touches.length === 2) {
    e.preventDefault()

    let touch1: Touch | null = null
    let touch2: Touch | null = null

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i]
      if (touch.identifier === instance.touchIds[0]) touch1 = touch
      if (touch.identifier === instance.touchIds[1]) touch2 = touch
    }

    if (!touch1 || !touch2) {

      touch1 = e.touches[0]
      touch2 = e.touches[1]

      instance.touchIds = [touch1.identifier, touch2.identifier]
    }

    instance.touchPoints.set(touch1.identifier, { clientX: touch1.clientX, clientY: touch1.clientY })
    instance.touchPoints.set(touch2.identifier, { clientX: touch2.clientX, clientY: touch2.clientY })

    const currentDistance = getDistance(
      touch1.clientX, touch1.clientY,
      touch2.clientX, touch2.clientY
    )
    const currentAngle = getAngle(
      touch1.clientX, touch1.clientY,
      touch2.clientX, touch2.clientY
    )

    const scale = instance.touchStartScale *
      (currentDistance / instance.touchStartDistance) *
      instance.options.pinchSpeed
    const clampedScale = clampScale(instance, scale)

    let rotation = instance.rotation
    if (instance.options.enableRotation) {
      const angleDelta = currentAngle - instance.touchStartAngle
      rotation = instance.initialRotation + angleDelta * (180 / Math.PI)
      rotation = ((rotation + 180) % 360) - 180
    }

    const center = getCenter(
      touch1.clientX, touch1.clientY,
      touch2.clientX, touch2.clientY
    )

    applyAroundPivot(
      instance,
      center.x,
      center.y,
      clampedScale,
      rotation
    )

    instance.applyTransform(false)
  } else if (instance.isPanning && e.touches.length === 1) {

    const touch = e.touches[0]
    const dx = touch.clientX - instance.startClientX
    const dy = touch.clientY - instance.startClientY

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
      const vx = (touch.clientX - instance.lastClientX) / dt * 16
      const vy = (touch.clientY - instance.lastClientY) / dt * 16

      instance.velocityX = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vx))
      instance.velocityY = Math.max(-instance.options.maxSpeed, Math.min(instance.options.maxSpeed, vy))
    }

    instance.lastClientX = touch.clientX
    instance.lastClientY = touch.clientY
    instance.lastMoveTime = now

    instance.applyTransform(false)
  }
}

export function handleTouchEnd(instance: ImagePanZoomInstance, e: TouchEvent) {
  if (e.touches.length === 0) {
    if (instance.isPinching) {
      instance.isPinching = false
      instance.touchIds = [null, null]
      instance.touchPoints.clear()

      if (instance.didMove && (Math.abs(instance.velocityX) > 1 || Math.abs(instance.velocityY) > 1)) {
        instance.animationFrameId = requestAnimationFrame(instance.animateKinetic)
      } else {
        instance.animateElasticReturn()
      }
    } else if (instance.isPanning) {
      instance.isPanning = false
      if (instance.didMove && (Math.abs(instance.velocityX) > 1 || Math.abs(instance.velocityY) > 1)) {
        instance.animationFrameId = requestAnimationFrame(instance.animateKinetic)
      } else {
        instance.animateElasticReturn()
      }
    }
  } else if (e.touches.length === 1) {
    if (instance.isPinching) {
      instance.isPinching = false
      instance.isPanning = true

      const touch = e.touches[0]
      instance.startClientX = touch.clientX
      instance.startClientY = touch.clientY
      instance.startX = instance.x
      instance.startY = instance.y
      instance.didMove = false

      instance.lastClientX = touch.clientX
      instance.lastClientY = touch.clientY
      instance.lastMoveTime = Date.now()
    }
  }


  handleDoubleTapCheck(instance, e)
}

export function handleDoubleTapCheck(instance: ImagePanZoomInstance, e: TouchEvent): void {
  const now = Date.now()
  const touch = e.changedTouches[0]

  if (!touch) return

  const touchX = touch.clientX
  const touchY = touch.clientY

  if (now - instance.lastTouchEndTime < instance.DOUBLE_TAP_DELAY &&
    Math.abs(touchX - instance.lastTouchX) < instance.DOUBLE_TAP_THRESHOLD &&
    Math.abs(touchY - instance.lastTouchY) < instance.DOUBLE_TAP_THRESHOLD) {

    handleDoubleTap(instance, touchX, touchY)

    instance.lastTouchEndTime = 0
    instance.lastTouchX = 0
    instance.lastTouchY = 0
  } else {
    instance.lastTouchEndTime = now
    instance.lastTouchX = touchX
    instance.lastTouchY = touchY
  }
}

export function handleDoubleTap(instance: ImagePanZoomInstance, clientX: number, clientY: number): void {
  instance.stopAnimation()
  const rect = instance.container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const clickX = clientX - rect.left
  const clickY = clientY - rect.top

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