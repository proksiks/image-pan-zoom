/**
 * ImagePanZoom - A lightweight library for pan and zoom functionality
 * @version 1.0.0
 */

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

  private touchStartDistance: number = 0
  private touchStartScale: number = 1
  private touchCenterX: number = 0
  private touchCenterY: number = 0
  private isPinching: boolean = false
  private lastTouchCenterX: number = 0
  private lastTouchCenterY: number = 0

  private transitionDuration: number = 300
  private transitionEasing: string = 'ease-out'
  private isTransitioning: boolean = false
  private transitionTimeout: number | null = null

  private lastTouchEndTime: number = 0
  private lastTouchX: number = 0
  private lastTouchY: number = 0
  private readonly DOUBLE_TAP_DELAY: number = 300
  private readonly DOUBLE_TAP_THRESHOLD: number = 10

  private elasticX: number = 0
  private elasticY: number = 0
  private isAnimatingElastic: boolean = false
  private elasticAnimationId: number | null = null

  private boundWheel: (e: WheelEvent) => void
  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void
  private boundDoubleClick: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void


  /**
   * Constructor for ImagePanZoom class
   * @param {HTMLElement} container - The container element that contains the zoomable content
   * @param {HTMLElement} content - The content element that is being zoomed
   * @param {ImagePanZoomOptions} options - Options for the zooming behavior
   */

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
      transition: options.transition ?? false,
      pinchSpeed: options.pinchSpeed ?? 1,
      elastic: options.elastic ?? true,
      elasticResistance: options.elasticResistance ?? 0.15,
      elasticBounce: options.elasticBounce ?? 0.3,
      minElasticDistance: options.minElasticDistance ?? 5,
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
    this.boundTouchStart = this.onTouchStart.bind(this)
    this.boundTouchMove = this.onTouchMove.bind(this)
    this.boundTouchEnd = this.onTouchEnd.bind(this)

    this.init()
  }

  /**
   * Initializes the pan and zoom functionality.
   */
  private init(): void {
    this.content.style.touchAction = 'none'
    this.content.style.userSelect = 'none'

    this.applyTransform()
    this.attachEvents()
  }

  private attachEvents(): void {
    this.container.addEventListener('wheel', this.boundWheel, { passive: false })
    this.content.addEventListener('pointerdown', this.boundPointerDown)
    this.content.addEventListener('dblclick', this.boundDoubleClick)
    window.addEventListener('pointermove', this.boundPointerMove)
    window.addEventListener('pointerup', this.boundPointerUp)

    this.container.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    this.container.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    this.container.addEventListener('touchend', this.boundTouchEnd, { passive: false })
  }

  /**
   * Calculate and return the sizes of container and content elements
   */
  public getSizes(): ElementSizes {
    const contRect = this.container.getBoundingClientRect()
    const contW = contRect.width
    const contH = contRect.height
    const pad = Math.min(contW, contH) * this.options.boundsPadding

    const rawW = this.content.offsetWidth
    const rawH = this.content.offsetHeight

    const rad = this.rotation * Math.PI / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))

    const rotatedW = rawW * this.scale * cos + rawH * this.scale * sin
    const rotatedH = rawW * this.scale * sin + rawH * this.scale * cos

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
  private calculateBoundaries(useElastic: boolean = false): { minX: number, maxX: number, minY: number, maxY: number } {
    const sizes = this.getSizes()

    if (!useElastic || !this.options.elastic) {
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

    const currentX = this.x + this.elasticX
    const currentY = this.y + this.elasticY

    if (!sizes.fitsHorizontally) {
      if (currentX < minX) {
        const overshoot = minX - currentX
        this.elasticX = -this.calculateElasticOffset(overshoot)
      } else if (currentX > maxX) {
        const overshoot = currentX - maxX
        this.elasticX = this.calculateElasticOffset(overshoot)
      } else {
        this.elasticX *= this.options.elasticResistance
      }
    }

    if (!sizes.fitsVertically) {
      if (currentY < minY) {
        const overshoot = minY - currentY
        this.elasticY = -this.calculateElasticOffset(overshoot)
      } else if (currentY > maxY) {
        const overshoot = currentY - maxY
        this.elasticY = this.calculateElasticOffset(overshoot)
      } else {
        this.elasticY *= this.options.elasticResistance
      }
    }

    return {
      minX: minX - this.elasticX,
      maxX: maxX - this.elasticX,
      minY: minY - this.elasticY,
      maxY: maxY - this.elasticY
    }
  }

  /**
   * Calculate elastic offset using easeOutBounce-like function
   */
  private calculateElasticOffset(overshoot: number): number {
    if (overshoot < this.options.minElasticDistance) {
      return overshoot * this.options.elasticResistance
    }

    const normalized = overshoot / 100
    return overshoot * this.options.elasticResistance * (1 - Math.exp(-normalized))
  }

  private clampPosition(nextX: number, nextY: number, useElastic: boolean = false): { x: number; y: number } {
    const bounds = this.calculateBoundaries(useElastic)

    const clampedX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX))
    const clampedY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY))

    return { x: clampedX, y: clampedY }
  }

  private applyTransform(useTransition: boolean = false): void {
    this.container.style.overflow = 'hidden'
    if (!this.container.style.position) {
      this.container.style.position = 'relative'
    }

    this.container.style.minHeight = '25vh'
    this.content.style.position = 'absolute'
    this.content.style.top = '50%'
    this.content.style.left = '50%'
    this.content.style.transformOrigin = '50% 50%'

    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    this.elasticX = 0
    this.elasticY = 0

    if (this.options.transition && useTransition && !this.isTransitioning) {
      this.content.style.transition = `transform ${this.transitionDuration}ms ${this.transitionEasing}`
      this.isTransitioning = true

      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout)
      }
      this.transitionTimeout = window.setTimeout(() => {
        this.content.style.transition = ''
        this.isTransitioning = false
        this.transitionTimeout = null
      }, this.transitionDuration)
    } else if (!useTransition) {
      this.content.style.transition = 'none'
      this.isTransitioning = false
    }

    const totalX = this.x + this.elasticX
    const totalY = this.y + this.elasticY

    this.content.style.transform = `translate(-50%, -50%) translate(${totalX}px, ${totalY}px) rotate(${this.rotation}deg) scale(${this.scale})`
  }

  /**
   * Apply elastic bounce animation when released
   */
  private animateElasticReturn(): void {
    if (this.isAnimatingElastic || !this.options.elastic) return

    const sizes = this.getSizes()
    const bounds = this.calculateBoundaries(false)

    const needsBounceX = !sizes.fitsHorizontally && (this.x < bounds.minX || this.x > bounds.maxX)
    const needsBounceY = !sizes.fitsVertically && (this.y < bounds.minY || this.y > bounds.maxY)

    if (!needsBounceX && !needsBounceY) return

    this.isAnimatingElastic = true
    this.stopAnimation()

    const startX = this.x
    const startY = this.y
    const targetX = Math.min(bounds.maxX, Math.max(bounds.minX, startX))
    const targetY = Math.min(bounds.maxY, Math.max(bounds.minY, startY))

    const startTime = Date.now()
    const duration = 300

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easedProgress = 1 - Math.pow(1 - progress, 3)

      this.x = startX + (targetX - startX) * easedProgress
      this.y = startY + (targetY - startY) * easedProgress

      this.applyTransform(false)

      if (progress < 1) {
        this.elasticAnimationId = requestAnimationFrame(animate)
      } else {
        this.isAnimatingElastic = false
        this.elasticAnimationId = null
      }
    }

    this.elasticAnimationId = requestAnimationFrame(animate)
  }


  /**
   * Clamp the given scale to the range of [minScale, maxScale]
   * @param {number} next - the scale to be clamped
   * @returns {number} the clamped scale
   */

  private clampScale(next: number): number {
    return Math.min(this.options.maxScale, Math.max(this.options.minScale, next))
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.elasticAnimationId !== null) {
      cancelAnimationFrame(this.elasticAnimationId)
      this.elasticAnimationId = null
      this.isAnimatingElastic = false
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

    const clamped = this.clampPosition(this.x, this.y, true)
    this.x = clamped.x
    this.y = clamped.y

    this.applyTransform(false)
  }

  /**
   * Move the center of the view to the specified coordinates
   */
  public moveTo(targetX: number, targetY: number, useTransition?: boolean): void {
    this.stopAnimation()

    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    this.x = targetX - centerX
    this.y = targetY - centerY

    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Move by specified delta values
   */
  public moveBy(deltaX: number, deltaY: number, useTransition?: boolean): void {
    this.stopAnimation()

    this.x += deltaX
    this.y += deltaY

    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Zoom to specific scale at specified point
   */
  public zoomTo(scale: number, pointX?: number, pointY?: number, useTransition?: boolean): void {
    this.stopAnimation()

    const rect = this.container.getBoundingClientRect()
    const targetX = pointX !== undefined ? pointX : rect.width / 2
    const targetY = pointY !== undefined ? pointY : rect.height / 2

    const prevScale = this.scale
    const nextScale = this.clampScale(scale)

    if (nextScale === prevScale) return

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const localX = targetX - centerX - this.x
    const localY = targetY - centerY - this.y

    const k = nextScale / prevScale
    const newLocalX = localX * k
    const newLocalY = localY * k

    this.scale = nextScale
    this.x += localX - newLocalX
    this.y += localY - newLocalY

    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  private animateKinetic = (): void => {
    if (Math.abs(this.velocityX) < 0.5 && Math.abs(this.velocityY) < 0.5 && Math.abs(this.velocityScale) < 0.001) {
      this.stopAnimation()
      this.animateElasticReturn()
      this.applyTransform(false)
      return
    }

    this.x += this.velocityX
    this.y += this.velocityY
    this.scale += this.velocityScale

    this.scale = this.clampScale(this.scale)

    const clamped = this.clampPosition(this.x, this.y, true)
    this.x = clamped.x
    this.y = clamped.y

    this.velocityX *= this.options.friction
    this.velocityY *= this.options.friction
    this.velocityScale *= this.options.friction

    this.applyTransform(false)
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
    this.isAnimatingElastic = false

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


  /**
   * Called when user moves pointer while pressing primary mouse button
   * It calculates velocity of pan and scale and applies it to the transform
   * @param {PointerEvent} e - Pointer event
   */

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPanning) return

    const dx = e.clientX - this.startClientX
    const dy = e.clientY - this.startClientY

    if (!this.didMove && Math.hypot(dx, dy) < this.DRAG_THRESHOLD) return
    this.didMove = true

    const nextX = this.startX + dx
    const nextY = this.startY + dy

    const clamped = this.clampPosition(nextX, nextY, true)
    this.x = clamped.x
    this.y = clamped.y

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

    this.applyTransform(false)
  }


  private onPointerUp(e: PointerEvent): void {
    if (!this.isPanning) return
    this.isPanning = false

    try {
      this.content.releasePointerCapture(e.pointerId)
    } catch { }

    if (this.didMove) {
      if (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1 || Math.abs(this.velocityScale) > 0.001) {
        this.animationFrameId = requestAnimationFrame(this.animateKinetic)
      } else {
        this.animateElasticReturn()
      }
    }
  }


  /**
   * Called when user double clicks on the image.
   * Zooms the image in by 50% if the current scale is less than the maximum scale.
   * @param {MouseEvent} e - The double click event.
   */

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

    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    this.applyTransform(true)
  }


  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.stopAnimation();
      this.isPinching = true;
      this.velocityX = 0;
      this.velocityY = 0;
      this.velocityScale = 0;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      this.touchCenterX = (touch1.clientX + touch2.clientX) / 2;
      this.touchCenterY = (touch1.clientY + touch2.clientY) / 2;
      this.lastTouchCenterX = this.touchCenterX;
      this.lastTouchCenterY = this.touchCenterY;

      this.touchStartDistance = dist;
      this.touchStartScale = this.scale;

      this.isPanning = false;
      this.didMove = false;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const syntheticEvent = new PointerEvent('pointerdown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0
      });
      this.onPointerDown(syntheticEvent);
    }
  }


  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2 && this.isPinching) {
      e.preventDefault()

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const currentDist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      )

      const currentCenterX = (touch1.clientX + touch2.clientX) / 2
      const currentCenterY = (touch1.clientY + touch2.clientY) / 2


      const scaleMultiplier = currentDist / this.touchStartDistance
      const newScale = this.touchStartScale * scaleMultiplier * this.options.pinchSpeed
      const clampedScale = this.clampScale(newScale)

      if (clampedScale !== this.scale) {
        const deltaX = currentCenterX - this.lastTouchCenterX
        const deltaY = currentCenterY - this.lastTouchCenterY

        this.x += deltaX
        this.y += deltaY

        const scaleFactor = clampedScale / this.scale
        this.zoomToPoint(this.touchCenterX, this.touchCenterY, scaleFactor)

        this.lastTouchCenterX = currentCenterX
        this.lastTouchCenterY = currentCenterY
      }
    } else if (e.touches.length === 1 && !this.isPinching) {
      const touch = e.touches[0]
      const syntheticEvent = new PointerEvent('pointermove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      })
      this.onPointerMove(syntheticEvent)
    }
  }


  /**
   * Handle touchend event.
   * If the event is triggered by a single touch point (i.e. the user lifted their finger)
   * and the last move event happened less than 100ms ago, calculate the velocity of the move.
   * If the velocity is greater than 1, start the kinetic animation.
   * If the velocity is less than or equal to 1, start the elastic return animation.
   * If the event is triggered by no touch points (i.e. the user lifted all their fingers), check if the user was panning.
   * If the user was panning, simulate a pointerup event to finish the pan.
   * If the user was not panning, start the double tap check.
   */

  private onTouchEnd(e: TouchEvent): void {
    if (this.isPinching && e.touches.length < 2) {
      this.isPinching = false;

      const now = Date.now();
      const dt = now - this.lastMoveTime;
      if (dt > 0 && dt < 100) {
        const vx = (this.lastTouchCenterX - this.touchCenterX) / dt * 16;
        const vy = (this.lastTouchCenterY - this.touchCenterY) / dt * 16;

        this.velocityX = Math.max(-this.options.maxSpeed, Math.min(this.options.maxSpeed, vx));
        this.velocityY = Math.max(-this.options.maxSpeed, Math.min(this.options.maxSpeed, vy));

        if (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1) {
          this.animationFrameId = requestAnimationFrame(this.animateKinetic);
        } else {
          this.animateElasticReturn();
        }
      } else {
        this.animateElasticReturn();
      }
    }

    if (e.touches.length === 0) {
      if (this.isPanning) {
        const syntheticEvent = new PointerEvent('pointerup', {
          clientX: 0,
          clientY: 0,
          button: 0
        });
        this.onPointerUp(syntheticEvent);
      }
      this.isPinching = false;

      this.handleDoubleTapCheck(e);
    }
  }

  /**
   * Handle double tap detection for touch devices
   */
  private handleDoubleTapCheck(e: TouchEvent): void {
    const now = Date.now();
    const touch = e.changedTouches[0];

    if (!touch) return;

    const touchX = touch.clientX;
    const touchY = touch.clientY;

    if (now - this.lastTouchEndTime < this.DOUBLE_TAP_DELAY &&
      Math.abs(touchX - this.lastTouchX) < this.DOUBLE_TAP_THRESHOLD &&
      Math.abs(touchY - this.lastTouchY) < this.DOUBLE_TAP_THRESHOLD) {

      this.handleDoubleTap(touchX, touchY);

      this.lastTouchEndTime = 0;
      this.lastTouchX = 0;
      this.lastTouchY = 0;
    } else {
      this.lastTouchEndTime = now;
      this.lastTouchX = touchX;
      this.lastTouchY = touchY;
    }
  }

  /**
   * Handle double tap zoom (similar to double click)
   */
  private handleDoubleTap(clientX: number, clientY: number): void {
    this.stopAnimation();
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const targetScale = Math.min(this.scale * 1.5, this.options.maxScale);
    const scaleRatio = targetScale / this.scale;

    const localX = clickX - centerX - this.x;
    const localY = clickY - centerY - this.y;
    this.scale = targetScale;

    const newLocalX = localX * scaleRatio;
    const newLocalY = localY * scaleRatio;
    this.x += localX - newLocalX;
    this.y += localY - newLocalY;

    const clamped = this.clampPosition(this.x, this.y, false);
    this.x = clamped.x;
    this.y = clamped.y;

    this.applyTransform(true);
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
    this.elasticX = 0
    this.elasticY = 0
    this.isAnimatingElastic = false

    this.applyTransform(true)
  }

  /**
   * Rotate content by specified degrees
   */
  public rotate(deg: number): void {
    this.stopAnimation()
    this.rotation = (this.rotation + deg) % 360


    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    this.applyTransform(true)
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
  public setTransform(transform: Partial<Transform>, useTransition?: boolean): void {
    this.stopAnimation()

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


    const clamped = this.clampPosition(this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Get the current viewport bounds in container coordinates
   */
  public getViewportBounds(): { left: number; top: number; right: number; bottom: number } {
    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const sizes = this.getSizes()

    return {
      left: centerX + this.x - sizes.contentWidth / 2,
      top: centerY + this.y - sizes.contentHeight / 2,
      right: centerX + this.x + sizes.contentWidth / 2,
      bottom: centerY + this.y + sizes.contentHeight / 2
    }
  }

  /**
   * Convert container coordinates to image coordinates
   */
  public containerToImage(containerX: number, containerY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect()
    const contentRect = this.content.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const relativeX = containerX - centerX - this.x
    const relativeY = containerY - centerY - this.y

    const imageX = (relativeX / this.scale) + (contentRect.width / 2 / this.scale)
    const imageY = (relativeY / this.scale) + (contentRect.height / 2 / this.scale)

    return { x: imageX, y: imageY }
  }

  /**
   * Convert image coordinates to container coordinates
   */
  public imageToContainer(imageX: number, imageY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect()
    const contentRect = this.content.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const relativeX = (imageX - (contentRect.width / 2 / this.scale)) * this.scale
    const relativeY = (imageY - (contentRect.height / 2 / this.scale)) * this.scale

    const containerX = centerX + this.x + relativeX
    const containerY = centerY + this.y + relativeY

    return { x: containerX, y: containerY }
  }

  /**
   * Center on specific image coordinates
   */
  public centerOnImagePoint(imageX: number, imageY: number, useTransition?: boolean): void {
    const containerCoords = this.imageToContainer(imageX, imageY)
    this.moveTo(containerCoords.x, containerCoords.y, useTransition)
  }

  /**
   * Destroy instance and remove all event listeners
   */
  public destroy(): void {
    this.stopAnimation()

    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout)
      this.transitionTimeout = null
    }

    this.container.removeEventListener('wheel', this.boundWheel)
    this.content.removeEventListener('pointerdown', this.boundPointerDown)
    this.content.removeEventListener('dblclick', this.boundDoubleClick)
    window.removeEventListener('pointermove', this.boundPointerMove)
    window.removeEventListener('pointerup', this.boundPointerUp)

    this.container.removeEventListener('touchstart', this.boundTouchStart)
    this.container.removeEventListener('touchmove', this.boundTouchMove)
    this.container.removeEventListener('touchend', this.boundTouchEnd)

    this.content.style.transform = ''
    this.content.style.touchAction = ''
  }
}

/**
 * Factory function to create a new ImagePanZoom instance
 */
export function createImagePanZoom(
  container: HTMLElement,
  content: HTMLElement,
  options?: ImagePanZoomOptions
): ImagePanZoom {
  return new ImagePanZoom(container, content, options)
}