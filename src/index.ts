/**
 * ImagePanZoom - A lightweight library for pan and zoom functionality
 * @version 1.0.0
 */

export interface ImagePanZoomOptions {
  minScale?: number
  maxScale?: number
  initialScale?: number
  wheelZoomSpeed?: number
  boundsPadding?: number
  friction?: number
  maxSpeed?: number
}

export interface Transform {
  scale: number
  x: number
  y: number
  rotation: number
}

export class ImagePanZoom {
  private container: HTMLElement
  private content: HTMLElement
  private options: Required<ImagePanZoomOptions>

  private scale: number
  private x: number
  private y: number
  private rotation: number

  private isPanning: boolean = false
  private didMove: boolean = false
  private startClientX: number = 0
  private startClientY: number = 0
  private startX: number = 0
  private startY: number = 0

  private velocityX: number = 0
  private velocityY: number = 0
  private velocityScale: number = 0
  private lastMoveTime: number = 0
  private lastClientX: number = 0
  private lastClientY: number = 0
  private lastScale: number = 1
  private animationFrameId: number | null = null

  private readonly DRAG_THRESHOLD = 3

  private boundWheel: (e: WheelEvent) => void
  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void
  private boundDoubleClick: (e: MouseEvent) => void

  constructor(container: HTMLElement, content: HTMLElement, options: ImagePanZoomOptions = {}) {
    this.container = container
    this.content = content
    this.options = {
      minScale: options.minScale ?? 0.5,
      maxScale: options.maxScale ?? 3,
      initialScale: options.initialScale ?? 1,
      wheelZoomSpeed: options.wheelZoomSpeed ?? 0.0015,
      boundsPadding: options.boundsPadding ?? 0.1,
      friction: options.friction ?? 0.92,
      maxSpeed: options.maxSpeed ?? 300,
    }

    this.scale = this.options.initialScale
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.lastScale = this.options.initialScale

    this.boundWheel = this.onWheel.bind(this)
    this.boundPointerDown = this.onPointerDown.bind(this)
    this.boundPointerMove = this.onPointerMove.bind(this)
    this.boundPointerUp = this.onPointerUp.bind(this)
    this.boundDoubleClick = this.onDoubleClick.bind(this)

    this.init()
  }

  private init(): void {
    this.content.style.touchAction = 'none'
    ;(this.content.style as any).userSelect = 'none'
    ;(this.content.style as any).webkitUserSelect = 'none'
    ;(this.content.style as any).MozUserSelect = 'none'
    ;(this.content.style as any).msUserSelect = 'none'
    ;(this.content.style as any)['-webkit-touch-callout'] = 'none'
    this.applyTransform()
    this.attachEvents()
  }

  private attachEvents(): void {
    this.container.addEventListener('wheel', this.boundWheel, { passive: false })
    this.content.addEventListener('pointerdown', this.boundPointerDown)
    this.content.addEventListener('dblclick', this.boundDoubleClick)
    window.addEventListener('pointermove', this.boundPointerMove)
    window.addEventListener('pointerup', this.boundPointerUp)
  }

  private getSizes() {
    const contRect = this.container.getBoundingClientRect()
    const contW = contRect.width
    const contH = contRect.height
    const pad = Math.min(contW, contH) * this.options.boundsPadding

    const rawW = this.content.offsetWidth
    const rawH = this.content.offsetHeight
    const w = rawW * this.scale
    const h = rawH * this.scale

    return { contW, contH, pad, w, h }
  }

  private clampPosition(nextX: number, nextY: number): { x: number; y: number } {
    const { contW, contH, pad, w, h } = this.getSizes()

    const fitsHorizontally = w <= contW
    const fitsVertically = h <= contH

    // Исправленная логика: гарантируем, что контент всегда виден
    let minX: number, maxX: number, minY: number, maxY: number

    if (fitsHorizontally) {
      // Если контент меньше контейнера, центрируем его
      minX = maxX = 0
    } else {
      // Контент больше контейнера - ограничиваем так, чтобы края были видны
      const halfContW = contW / 2
      const halfW = w / 2
      
      // Максимально можем сдвинуть влево (показываем правый край)
      maxX = halfW - halfContW + pad
      // Максимально можем сдвинуть вправо (показываем левый край)
      minX = -(halfW - halfContW) - pad
    }

    if (fitsVertically) {
      minY = maxY = 0
    } else {
      const halfContH = contH / 2
      const halfH = h / 2
      
      maxY = halfH - halfContH + pad
      minY = -(halfH - halfContH) - pad
    }

    const clampedX = fitsHorizontally ? 0 : Math.min(maxX, Math.max(minX, nextX))
    const clampedY = fitsVertically ? 0 : Math.min(maxY, Math.max(minY, nextY))

    return { x: clampedX, y: clampedY }
  }

  private applyTransform(): void {
    this.container.style.overflow = 'hidden'
    if (!this.container.style.position) {
      this.container.style.position = 'relative'
    }

    this.container.style.minHeight = '25vh'
    this.content.style.position = 'absolute'
    this.content.style.top = '50%'
    this.content.style.left = '50%'
    this.content.style.transformOrigin = '50% 50%'

    const clamped = this.clampPosition(this.x, this.y)
    this.x = clamped.x
    this.y = clamped.y

    this.content.style.transform = `translate(-50%, -50%) translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg) scale(${this.scale})`
  }

  private clampScale(next: number): number {
    return Math.min(this.options.maxScale, Math.max(this.options.minScale, next))
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private zoomToPoint(clientX: number, clientY: number, deltaScale: number): void {
    const rect = this.container.getBoundingClientRect()
    const prevScale = this.scale
    const nextScale = this.clampScale(prevScale * deltaScale)
    
    if (nextScale === prevScale) return

    const cx = clientX - rect.left
    const cy = clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const localX = cx - centerX - this.x
    const localY = cy - centerY - this.y

    const k = nextScale / prevScale
    const newLocalX = localX * k
    const newLocalY = localY * k

    this.scale = nextScale
    this.x += localX - newLocalX
    this.y += localY - newLocalY

    this.applyTransform()
  }

  private animateKinetic = (): void => {
    if (Math.abs(this.velocityX) < 0.5 && Math.abs(this.velocityY) < 0.5 && Math.abs(this.velocityScale) < 0.001) {
      this.stopAnimation()
      this.applyTransform()
      return
    }

    this.x += this.velocityX
    this.y += this.velocityY
    this.scale += this.velocityScale

    this.scale = this.clampScale(this.scale)

    this.velocityX *= this.options.friction
    this.velocityY *= this.options.friction
    this.velocityScale *= this.options.friction

    this.applyTransform()
    this.animationFrameId = requestAnimationFrame(this.animateKinetic)
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    this.stopAnimation()
    this.velocityX = 0
    this.velocityY = 0
    this.velocityScale = 0

    const delta = -e.deltaY * this.options.wheelZoomSpeed
    const factor = 1 + delta
    if (factor === 0) return
    
    this.zoomToPoint(e.clientX, e.clientY, factor)
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return

    this.stopAnimation()

    this.isPanning = true
    this.didMove = false
    this.startClientX = e.clientX
    this.startClientY = e.clientY
    this.startX = this.x
    this.startY = this.y

    this.lastClientX = e.clientX
    this.lastClientY = e.clientY
    this.lastScale = this.scale
    this.lastMoveTime = Date.now()
    this.velocityX = 0
    this.velocityY = 0
    this.velocityScale = 0

    this.content.setPointerCapture(e.pointerId)
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPanning) return

    const dx = e.clientX - this.startClientX
    const dy = e.clientY - this.startClientY

    if (!this.didMove && Math.hypot(dx, dy) < this.DRAG_THRESHOLD) return
    this.didMove = true

    const nextX = this.startX + dx
    const nextY = this.startY + dy

    this.x = nextX
    this.y = nextY

    const now = Date.now()
    const dt = now - this.lastMoveTime
    if (dt > 0) {
      const vx = (e.clientX - this.lastClientX) / dt * 16
      const vy = (e.clientY - this.lastClientY) / dt * 16
      const scaleDiff = this.scale - this.lastScale
      const scaleVelocity = scaleDiff / dt * 16

      this.velocityX = Math.max(-this.options.maxSpeed, Math.min(this.options.maxSpeed, vx))
      this.velocityY = Math.max(-this.options.maxSpeed, Math.min(this.options.maxSpeed, vy))
      this.velocityScale = Math.max(-0.01, Math.min(0.01, scaleVelocity))
    }

    this.lastClientX = e.clientX
    this.lastClientY = e.clientY
    this.lastScale = this.scale
    this.lastMoveTime = now

    this.applyTransform()
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isPanning) return
    this.isPanning = false

    try {
      this.content.releasePointerCapture(e.pointerId)
    } catch {}

    if (this.didMove && (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1 || Math.abs(this.velocityScale) > 0.001)) {
      this.animationFrameId = requestAnimationFrame(this.animateKinetic)
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    this.stopAnimation()
    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const targetScale = Math.min(this.scale * 1.5, this.options.maxScale)
    const scaleRatio = targetScale / this.scale

    const localX = clickX - centerX - this.x
    const localY = clickY - centerY - this.y
    this.scale = targetScale

    const newLocalX = localX * scaleRatio
    const newLocalY = localY * scaleRatio
    this.x += localX - newLocalX
    this.y += localY - newLocalY
    this.applyTransform()
  }

  /**
   * Reset transform to initial state
   */
  public reset(): void {
    this.stopAnimation()
    this.scale = this.options.initialScale
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.velocityX = 0
    this.velocityY = 0
    this.velocityScale = 0
    this.applyTransform()
  }

  /**
   * Rotate content by specified degrees
   */
  public rotate(deg: number): void {
    this.rotation = (this.rotation + deg) % 360
    this.content.style.transition = 'transform 0.5s ease-out'
    this.applyTransform()

    setTimeout(() => {
      this.content.style.transition = 'transform 0.3s ease-out'
    }, 500)
  }

  /**
   * Get current transform state
   */
  public getTransform(): Transform {
    return {
      scale: this.scale,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
    }
  }

  /**
   * Set transform state
   */
  public setTransform(transform: Partial<Transform>): void {
    if (transform.scale !== undefined) {
      this.scale = this.clampScale(transform.scale)
    }
    if (transform.x !== undefined) {
      this.x = transform.x
    }
    if (transform.y !== undefined) {
      this.y = transform.y
    }
    if (transform.rotation !== undefined) {
      this.rotation = transform.rotation
    }
    this.applyTransform()
  }

  /**
   * Destroy instance and remove all event listeners
   */
  public destroy(): void {
    this.stopAnimation()
    this.container.removeEventListener('wheel', this.boundWheel)
    this.content.removeEventListener('pointerdown', this.boundPointerDown)
    this.content.removeEventListener('dblclick', this.boundDoubleClick)
    window.removeEventListener('pointermove', this.boundPointerMove)
    window.removeEventListener('pointerup', this.boundPointerUp)
    
    this.content.style.transform = ''
    this.content.style.touchAction = ''
  }
}

// Factory function for easier usage
export function createImagePanZoom(
  container: HTMLElement,
  content: HTMLElement,
  options?: ImagePanZoomOptions
): ImagePanZoom {
  return new ImagePanZoom(container, content, options)
}