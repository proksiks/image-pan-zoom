import { ImagePanZoomOptions, Transform } from './interfaces'
import { getSizes, clampPosition, clampScale } from './utils'
import { handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick, handleTouchStart, handleTouchMove, handleTouchEnd, handleDoubleTapCheck, handleDoubleTap } from './events'
import { animateElasticReturn, stopAnimation } from './animations'

export class ImagePanZoom {
  private container: HTMLElement
  private content: HTMLElement
  private options: Required<ImagePanZoomOptions>

  private scale: number
  private x: number
  private y: number
  private rotation: number


  private velocityX: number = 0
  private velocityY: number = 0
  private velocityScale: number = 0



  private transitionDuration: number = 300
  private transitionEasing: string = 'ease-out'
  private isTransitioning: boolean = false
  private transitionTimeout: number | null = null


  private elasticX: number = 0
  private elasticY: number = 0

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

    const clamped = clampPosition(this as any, this.x, this.y, false)
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


  private onWheel(e: WheelEvent): void {
    handleWheel(this as any, e)
  }

  private onPointerDown(e: PointerEvent): void {
    handlePointerDown(this as any, e)
  }

  private onPointerMove(e: PointerEvent): void {
    handlePointerMove(this as any, e)
  }

  private onPointerUp(e: PointerEvent): void {
    handlePointerUp(this as any, e)
  }

  private onDoubleClick(e: MouseEvent): void {
    handleDoubleClick(this as any, e)
  }

  private onTouchStart(e: TouchEvent): void {
    handleTouchStart(this as any, e)
  }

  private onTouchMove(e: TouchEvent): void {
    handleTouchMove(this as any, e)
  }

  private onTouchEnd(e: TouchEvent): void {
    handleTouchEnd(this as any, e)
  }



  /**
   * Wrapper methods to allow modules to access private methods
   */
  public animateKinetic = (): void => {
    if (Math.abs(this.velocityX) < 0.5 && Math.abs(this.velocityY) < 0.5 && Math.abs(this.velocityScale) < 0.001) {
      this.stopAnimation()
      this.animateElasticReturn()
      this.applyTransform(false)
      return
    }

    this.x += this.velocityX
    this.y += this.velocityY
    this.scale += this.velocityScale

    // Make sure scale stays within bounds
    if (this.scale < this.options.minScale) this.scale = this.options.minScale
    if (this.scale > this.options.maxScale) this.scale = this.options.maxScale

    const clamped = clampPosition(this as any, this.x, this.y, true)
    this.x = clamped.x
    this.y = clamped.y

    this.velocityX *= this.options.friction
    this.velocityY *= this.options.friction
    this.velocityScale *= this.options.friction

    this.applyTransform(false)
  }

  public animateElasticReturn(): void {
    animateElasticReturn(this as any)
  }

  public stopAnimation(): void {
    stopAnimation(this as any)
  }

  public zoomToPoint(clientX: number, clientY: number, deltaScale: number): void {
    const rect = this.container.getBoundingClientRect()
    const prevScale = this.scale
    const nextScale = clampScale(this as any, prevScale * deltaScale)

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

    const clamped = clampPosition(this as any, this.x, this.y, true)
    this.x = clamped.x
    this.y = clamped.y

    this.applyTransform(false)
  }

  /**
   * Reset transform to initial state
   */
  public reset(): void {
    stopAnimation(this as any)
    this.scale = this.options.initialScale
    this.x = 0
    this.y = 0
    this.rotation = 0
    this.velocityX = 0
    this.velocityY = 0
    this.velocityScale = 0
    this.elasticX = 0
    this.elasticY = 0

    this.applyTransform(true)
  }

  /**
   * Rotate content by specified degrees
   */
  public rotate(deg: number): void {
    stopAnimation(this as any)
    this.rotation = (this.rotation + deg) % 360


    const clamped = clampPosition(this as any, this.x, this.y, false)
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
    stopAnimation(this as any)

    if (transform.scale !== undefined) {
      this.scale = clampScale(this as any, transform.scale)
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


    const clamped = clampPosition(this as any, this.x, this.y, false)
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

    const sizes = getSizes(this as any)

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
   * Move the center of the view to the specified coordinates
   */
  public moveTo(targetX: number, targetY: number, useTransition?: boolean): void {
    this.stopAnimation()

    const rect = this.container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    this.x = targetX - centerX
    this.y = targetY - centerY

    const clamped = clampPosition(this as any, this.x, this.y, false)
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

    const clamped = clampPosition(this as any, this.x, this.y, false)
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
    const nextScale = clampScale(this as any, scale)

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

    const clamped = clampPosition(this as any, this.x, this.y, false)
    this.x = clamped.x
    this.y = clamped.y

    const shouldUseTransition = useTransition !== undefined ? useTransition : true
    this.applyTransform(shouldUseTransition && this.options.transition)
  }

  /**
   * Destroy instance and remove all event listeners
   */
  public destroy(): void {
    stopAnimation(this as any)

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