import Matter from "matter-js"
import Two from "two.js"
export type mouseEventFunction = (mousePos: { x: number, y: number }, event: PointerEvent) => void
export type pointerDownEventFunction = (mousePos: { x: number, y: number }, event: PointerEvent) => void
export type resizeEventFunction = () => void
export class MatterSetup {
    engine: Matter.Engine
    world: Matter.World
    renderer: Matter.Render
    el: HTMLElement
    twoEl: HTMLCanvasElement
    two: Two
    devMode: boolean = false
    clickEvents: Array<{ fn: mouseEventFunction, name: string }> = []
    pointerDownEvents: Array<{ fn: pointerDownEventFunction, name: string }> = []
    pointerUpEvents: Array<{ fn: mouseEventFunction, name: string }> = []
    pointerMoveEvents: Array<{ fn: mouseEventFunction, name: string }> = []
    resizeEvents: Array<{ fn: resizeEventFunction, name: string }> = []
    isClicking: boolean = false

    constructor(target: HTMLElement, options?: { devMode: boolean }) {
        this.engine = Matter.Engine.create()
        this.world = this.engine.world
        this.el = target

        // Create Two.js canvas
        this.twoEl = document.createElement("canvas")
        this.twoEl.style.position = "absolute"
        this.twoEl.style.inset = "0 0 0 0"
        this.twoEl.style.height = "100%"
        this.twoEl.style.width = "100%"
        this.twoEl.id = "two-js"
        this.el.appendChild(this.twoEl)
        this.two = new Two({
            width: target.clientWidth,
            height: target.clientHeight,
            domElement: this.twoEl,
        }).appendTo(this.el)

        this.renderer = Matter.Render.create({
            element: this.el,
            engine: this.engine,
            options: {
                width: target.clientWidth,
                height: target.clientHeight,
                wireframes: false,
                showCollisions: true,
                showVelocity: true,
            }
        })
        this.renderer.canvas.id = "matter"

        

        this.devMode = options?.devMode || false
        
        if (this.devMode) {
            Matter.Render.run(this.renderer)
        }
        
        this.engine.constraintIterations = 16

        // Manually handle initial resize
        setTimeout(() => { 
            // Fire resize event
            document.dispatchEvent(new Event("resize"))
        })
        
        new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === "devMode") {
                    if (target["devMode"] == true) {
                        Matter.Render.run(target.renderer)
                    } else {
                        Matter.Render.stop(target.renderer)
                    }

                    return target.devMode
                }
                return Reflect.get(target, prop, receiver)
            }
        })

        requestAnimationFrame(this.#animate.bind(this))
        // window.addEventListener("click", this.#onClick.bind(this))
        window.addEventListener("touchstart", this.#disableScrollToRefresh, { passive: false })
        window.addEventListener("pointerdown", this.#onPointerDown.bind(this))
        window.addEventListener("pointerup", this.#onPointerUp.bind(this))
        window.addEventListener("pointermove", this.#onPointerMove.bind(this))
        window.addEventListener("resize", this.#onResize.bind(this))
    }
    #animate = () => {
        Matter.Engine.update(this.engine, 1000 / 40) // update engine met 40 fps
        requestAnimationFrame(this.#animate)
    }

    
    #disableScrollToRefresh(event: TouchEvent) {
        const target = event.target as HTMLElement
        if (target.id == "two-js" || target.id == "matter" || target.classList.contains("buttons-container")) {
            event.preventDefault()
        }
    }

    // Resize events
    #onResize() {
        this.two.width = this.el.clientWidth
        this.two.height = this.el.clientHeight
        this.resizeEvents.forEach(resizeEvent => {
            resizeEvent.fn()
        })
    }

    addResizeEvent(fn: resizeEventFunction, name: string) {
        this.resizeEvents.push({ fn, name })
    }

    removeResizeEvent(name: string) {
        this.resizeEvents = this.resizeEvents.filter(fn => {
            return fn.name !== name
        })
    }

    // Pointer events
    #onPointerUp(event: PointerEvent) {
        const rect = (this.el as HTMLElement).getBoundingClientRect()
        const x = event.clientX - rect.left + this.renderer.bounds.min.x
        const y = event.clientY - rect.top + this.renderer.bounds.min.y

        if (this.isClicking) {
            this.clickEvents.forEach(clickEvent => {
                if (typeof clickEvent.fn === "function") {
                    clickEvent.fn({ x, y }, event)
                }
            })
            this.isClicking = false
        }

        this.pointerUpEvents.forEach(pointerUpEvent => {
            pointerUpEvent.fn({ x, y }, event)
        })
    }

    #onPointerDown(event: PointerEvent) {
        const rect = (this.el as HTMLElement).getBoundingClientRect()
        const x = event.clientX - rect.left + this.renderer.bounds.min.x
        const y = event.clientY - rect.top + this.renderer.bounds.min.y
        this.isClicking = true
        setTimeout(() => {
            this.isClicking = false
        }, 240)
        
        this.pointerDownEvents.forEach(pointerDownEvent => {
            pointerDownEvent.fn({ x, y }, event)
        })
    }

    #onPointerMove(event: PointerEvent) {
        const rect = (this.el as HTMLElement).getBoundingClientRect()
        const x = event.clientX - rect.left + this.renderer.bounds.min.x
        const y = event.clientY - rect.top + this.renderer.bounds.min.y

        this.pointerMoveEvents.forEach(pointerMoveEvent => {
            pointerMoveEvent.fn({ x, y }, event)
        })
    }

    addClickEvent(fn: mouseEventFunction, name: string) {
        this.clickEvents.push({ fn, name })
    }

    removeClickEvent(name: string) {
        this.clickEvents = this.clickEvents.filter(fn => {
            return fn.name !== name
        })
    }

    
    addpointerDownEvent(fn: mouseEventFunction, name: string) {
        this.pointerDownEvents.push({ fn, name })
    }
    
    addpointerUpEvent(fn: mouseEventFunction, name: string) {
        this.pointerUpEvents.push({ fn, name })
    }
    
    addpointerMoveEvent(fn: mouseEventFunction, name: string) {
        this.pointerMoveEvents.push({ fn, name })
    }

    removepointerDownEvent(name: string) {
        this.pointerDownEvents = this.pointerDownEvents.filter(fn => {
            return fn.name !== name
        })
    }

    removepointerUpEvent(name: string) {
        this.pointerUpEvents = this.pointerUpEvents.filter(fn => {
            return fn.name !== name
        })
    }

    removepointerMoveEvent(name: string) {
        this.pointerMoveEvents = this.pointerMoveEvents.filter(fn => {
            return fn.name !== name
        })
    }

    removePrivateEvents = () => {
        window.removeEventListener("touchstart", this.#disableScrollToRefresh)
        window.removeEventListener("pointerdown", this.#onPointerDown)
        window.removeEventListener("pointerup", this.#onPointerUp)
        window.removeEventListener("pointermove", this.#onPointerMove)
        window.removeEventListener("resize", this.#onResize)
    }

}