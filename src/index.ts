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

  private boundWheel: (e: WheelEvent) => void
  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void
  private boundDoubleClick: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void


  /**
   * Creates a new ImagePanZoom instance.
   * @param {HTMLElement} container - The container element that will hold the zoomable content.
   * @param {HTMLElement} content - The content element that will be zoomed and panned.
   * @param {ImagePanZoomOptions} options - The options for configuring the ImagePanZoom behavior.
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
   * Sets touch-action and user-select CSS properties on the content element.
   * If transition is enabled, sets the transition CSS property on the content element.
   * Applies the initial transform to the content element.
   * Attaches wheel, pointerdown, pointermove, and pointerup event listeners.
   */
  private init(): void {
    this.content.style.touchAction = 'none'
    this.content.style.userSelect = 'none'

    this.applyTransform()
    this.attachEvents()
  }


  /**
   * Attaches event listeners to the container and content elements for wheel, pointer and touch events.
   * Passive event listeners are used to prevent the default behavior of the events from being triggered.
   */

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
   * @returns Object containing container width/height, padding, and scaled content dimensions
   */
  private getSizes() {
    const contRect = this.container.getBoundingClientRect()
    const contW = contRect.width
    const contH = contRect.height
    const pad = Math.min(contW, contH) * this.options.boundsPadding

    const rawW = this.content.offsetWidth
    const rawH = this.content.offsetHeight

    const rad = this.rotation * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const rotatedW = Math.abs(rawW * this.scale * cos) + Math.abs(rawH * this.scale * sin)
    const rotatedH = Math.abs(rawW * this.scale * sin) + Math.abs(rawH * this.scale * cos)

    return {
      contW,
      contH,
      pad,
      w: rotatedW,
      h: rotatedH
    }
  }


  /**
   * Clamp the given x and y coordinates to the nearest valid position within the container bounds
   * @param {number} nextX - The x coordinate to clamp
   * @param {number} nextY - The y coordinate to clamp
   * @returns {Object} - An object containing the clamped x and y coordinates
   */

  private clampPosition(nextX: number, nextY: number): { x: number; y: number } {
    const contRect = this.container.getBoundingClientRect()
    const contW = contRect.width
    const contH = contRect.height
    const pad = Math.min(contW, contH) * this.options.boundsPadding

    const rawW = this.content.offsetWidth
    const rawH = this.content.offsetHeight

    const rad = this.rotation * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const rotatedW = Math.abs(rawW * this.scale * cos) + Math.abs(rawH * this.scale * sin)
    const rotatedH = Math.abs(rawW * this.scale * sin) + Math.abs(rawH * this.scale * cos)

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

    const clampedX = fitsHorizontally ? 0 : Math.min(maxX, Math.max(minX, nextX))
    const clampedY = fitsVertically ? 0 : Math.min(maxY, Math.max(minY, nextY))

    return { x: clampedX, y: clampedY }
  }


  /**
   * Applies the current transformation to the content element.
   * If the transition option is enabled and useTransition is true, applies a transition to the content element.
   * If useTransition is false, removes any transition from the content element.
   * @param {boolean} useTransition - Whether to apply a transition to the content element
   */

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

    const clamped = this.clampPosition(this.x, this.y)
    this.x = clamped.x
    this.y = clamped.y

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

    this.content.style.transform = `translate(-50%, -50%) translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg) scale(${this.scale})`
  }


  /**
   * Clamp the given scale value to the nearest valid scale value within the max and min scale options
   * @param {number} next - The scale value to clamp
   * @returns {number} - The clamped scale value
   */

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

    this.applyTransform(false)
  }

  /**
   * Move the center of the view to the specified coordinates
   * @param targetX - Target X coordinate in container pixels
   * @param targetY - Target Y coordinate in container pixels
   * @param useTransition - Whether to use transition animation (default: true if option is enabled)
   */
  public moveTo(targetX: number, targetY: number, useTransition?: boolean): void {
    this.stopAnimation()

    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    this.x = targetX - centerX
    this.y = targetY - centerY

    const clamped = this.clampPosition(this.x, this.y)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Move by specified delta values
   * @param deltaX - Delta X to move by
   * @param deltaY - Delta Y to move by
   * @param useTransition - Whether to use transition animation (default: true if option is enabled)
   */
  public moveBy(deltaX: number, deltaY: number, useTransition?: boolean): void {
    this.stopAnimation()

    this.x += deltaX
    this.y += deltaY

    const clamped = this.clampPosition(this.x, this.y)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Zoom to specific scale at specified point
   * @param scale - Target scale
   * @param pointX - X coordinate for zoom center (optional, defaults to container center)
   * @param pointY - Y coordinate for zoom center (optional, defaults to container center)
   * @param useTransition - Whether to use transition animation (default: true if option is enabled)
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

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }


  /**
   * Animates the kinetic movement of the image based on the current velocity.
   * This function is called recursively using requestAnimationFrame until the velocity
   * is too low to continue animating.
   * The animation is stopped by calling stopAnimation() and applying the
   * final transform without animation.
   * @private
   */

  private animateKinetic(): void {
    if (Math.abs(this.velocityX) < 0.5 && Math.abs(this.velocityY) < 0.5 && Math.abs(this.velocityScale) < 0.001) {
      this.stopAnimation()
      this.applyTransform(false)
      return
    }

    this.x += this.velocityX
    this.y += this.velocityY
    this.scale += this.velocityScale

    this.scale = this.clampScale(this.scale)

    this.velocityX *= this.options.friction
    this.velocityY *= this.options.friction
    this.velocityScale *= this.options.friction

    this.applyTransform(false)
    this.animationFrameId = requestAnimationFrame(this.animateKinetic)
  }


  /**
   * Handles wheel event to zoom image.
   * @param e - Wheel event object.
   */

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


  /**
   * Handles pointer move event while panning.
   * Calculates velocity and scales the image accordingly.
   * @param e - Pointer move event object.
   */

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

    this.applyTransform(false)
  }


  private onPointerUp(e: PointerEvent): void {
    if (!this.isPanning) return
    this.isPanning = false

    try {
      this.content.releasePointerCapture(e.pointerId)
    } catch { }

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
   * Handles touch end event.
   * If the event is triggered because the user has stopped pinching, it calculates the velocity of the pan gesture and starts an animation to smoothly stop the pan gesture.
   * If the event is triggered because the user has lifted their finger off the screen, it checks if the event is a double tap and handles it accordingly.
   * @param e - Touch end event object.
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
        }
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
   * @param e - Touch event
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
   * @param clientX - X coordinate of the tap
   * @param clientY - Y coordinate of the tap
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

    this.applyTransform(true)
  }

  /**
   * Rotate content by specified degrees
   * @param deg - Degrees to rotate
   */
  public rotate(deg: number): void {
    this.rotation = (this.rotation + deg) % 360
    this.applyTransform(true)
  }

  /**
   * Get current transform state
   * @returns Current transform object with scale, x, y, and rotation values
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
   * @param transform - Transform object with scale, x, y, and/or rotation values to set
   */
  public setTransform(transform: Partial<Transform>, useTransition?: boolean): void {
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

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Get the current viewport bounds in container coordinates
   * @returns Object with left, top, right, bottom bounds
   */
  public getViewportBounds(): { left: number; top: number; right: number; bottom: number } {
    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rawW = this.content.offsetWidth
    const rawH = this.content.offsetHeight
    const rad = this.rotation * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const rotatedW = Math.abs(rawW * this.scale * cos) + Math.abs(rawH * this.scale * sin)
    const rotatedH = Math.abs(rawW * this.scale * sin) + Math.abs(rawH * this.scale * cos)

    return {
      left: centerX + this.x - rotatedW / 2,
      top: centerY + this.y - rotatedH / 2,
      right: centerX + this.x + rotatedW / 2,
      bottom: centerY + this.y + rotatedH / 2
    }
  }

  /**
   * Convert container coordinates to image coordinates
   * @param containerX - X coordinate in container
   * @param containerY - Y coordinate in container
   * @returns Object with x, y in image coordinates
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
   * @param imageX - X coordinate in image
   * @param imageY - Y coordinate in image
   * @returns Object with x, y in container coordinates
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
   * @param imageX - X coordinate in image
   * @param imageY - Y coordinate in image
   * @param useTransition - Whether to use transition animation (default: true if option is enabled)
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
 * @param container - Container element to hold the content
 * @param content - Content element to apply pan and zoom to
 * @param options - Options to configure the behavior
 * @returns A new ImagePanZoom instance
 */
export function createImagePanZoom(
  container: HTMLElement,
  content: HTMLElement,
  options?: ImagePanZoomOptions
): ImagePanZoom {
  return new ImagePanZoom(container, content, options)
}