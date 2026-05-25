import Matter from "matter-js"
import type { Constraint } from "matter-js"
import { markRaw } from "vue"
import { MatterSetup } from "./setup"
import { Draw } from "./draw"

import storyStore from "@/stores/story"

import { Wall } from "./create/wall"
import { Catterpillar } from "./create/catterpillar"
import CatterpillarModel from "@/model/catterpillar"
import type { IdentityField } from "@/model/catterpillar/identity"

type Listener = { type: string; fn: (...args: any[]) => void }

export class MatterController {
    private listeners: Listener[] = []
    storyStore = storyStore()
    ref: MatterSetup
    catterpillar?: CatterpillarModel
    mousePin = undefined as Matter.Constraint | undefined
    draw: Draw
    config: {
        offsetBottom?: number
    } = {}
    cooldown: number = 0
    disableDragging: boolean = false
    identity: IdentityField = {
        id: 1,
        name: "Catterpillar",
        textureIndex: 1,
        colorSchemeIndex: 1,
        offset: 0,
        gender: 0,
        thickness: 16,
        length: 8
    }

    constructor(target: HTMLElement, options?: {
        identity?: IdentityField,
        catterpillarPos?: { x: number, y: number }
        offsetBottom?: number
    } ) {

        const catterpillarOptions = {} as { identity: IdentityField }

        if (!options) {
            options = {}
        }
        const { identity, offsetBottom } = options
        if (identity) {
            this.identity = identity
        }
        
        if (catterpillarOptions && identity) {
            catterpillarOptions.identity = identity
        }
        
        this.ref = new MatterSetup(target, {
            devMode: true
        })

        const width = this.ref.renderer.options.width || 0
        const height = this.ref.renderer.options.height || 0
        
        
        if (offsetBottom) {
            this.config.offsetBottom = offsetBottom
        } else {
            this.config.offsetBottom = 0
        }
        
        this.draw = markRaw(new Draw(this.ref.two, this.ref.renderer))
        
        let startPosition = { x: width / 2, y: height }
        if (options?.catterpillarPos) {
            startPosition = options.catterpillarPos
        }
        
        
        this.createCatterpillar(startPosition, catterpillarOptions)
        this.#createWalls()
        
        // this.ref.addpointerMoveEvent(this.#lookAtMouse.bind(this), "lookAtMouse")
        this.ref.addpointerDownEvent(this.#grabCatterpillar.bind(this), "grabCatterpillar")
        this.ref.addpointerUpEvent(this.#releaseCatterpillar.bind(this), "releaseCatterpillar")
        this.ref.addpointerMoveEvent(this.#dragCatterpillar.bind(this), "dragCatterpillar")
        this.ref.addResizeEvent(this.#resizeCanvas.bind(this), "resizeCanvas")
        this.ref.addResizeEvent(this.#updateWalls.bind(this), "updateWalls")
        window.addEventListener("layoutChange", this.#resizeCanvas.bind(this))
        window.addEventListener("layoutChange", this.#updateWalls.bind(this))
        
        if (this.storyStore?.initialised) {
            this.storyStore.initialised.then(async () => {
                this.storyStore.setController(this)
                this.storyStore.setIdentity(this.identity)
            })
        }
        
        requestAnimationFrame(this.#loop.bind(this))
    }
    #loop() {
        const width = this.ref.renderer.options.width || 0
        const height = this.ref.renderer.options.height || 0
        if (this.catterpillar && (this.catterpillar.y > height || this.catterpillar.y < - 300 || this.catterpillar.x < -300 || this.catterpillar.x > width + 300)) {
            // Re-center Catterpillar
            this.catterpillar.destroy()
            this.createCatterpillar({ x: width / 2, y: 0}, { identity: this.identity })  
        }

        requestAnimationFrame(this.#loop.bind(this))
    }

    #resizeCanvas() {
        const parentElement = this.ref.renderer.element.parentElement
        if (!parentElement) return 

        this.ref.renderer.options.width = parentElement.clientWidth
        this.ref.renderer.options.height = parentElement.clientHeight

        this.ref.two.width = this.ref.renderer.options.width
        this.ref.two.height = this.ref.renderer.options.height
        Matter.Render.setPixelRatio(this.ref.renderer, window.devicePixelRatio)
    }

    #createWalls() {
        const offsetBottom = this.config.offsetBottom || 0
        const width = this.ref.renderer.options.width || 0
        const height = this.ref.renderer.options.height || 0
        const wallThickness = 100
        
        // Top wall
        // const top = new Wall({
        //     x: width / 2,
        //     y: 0 - wallThickness / 2,
        //     width: width * 2,
        //     height: wallThickness,
        //     id: "top",
        // }, this.ref.world)
        // top.body.collisionFilter.group = -1 // Ignore collisions with everything that is in the same group

        // Bottom
        new Wall({
            x: width / 2,
            y: height + wallThickness/2 - offsetBottom,
            width: width ,
            height: wallThickness,
            id: "bottom",
        }, this.ref.world)

        // // Right wall
        // new Wall({
        //     x: width + wallThickness / 2,
        //     y: height / 2,
        //     width: wallThickness,
        //     height: height * 2,
        //     id: "right",
        // }, this.ref.world)

        // // Left wall
        // new Wall({
        //     x: -wallThickness / 2,
        //     y: height / 2,
        //     width: wallThickness,
        //     height: height * 2,
        //     id: "left",
        // }, this.ref.world)
    }

    #updateWalls() {
        // Get Walls
        Matter.Composite.allBodies(this.ref.world).forEach(body => {
            const labels = body.label.split(",")
            if (labels.includes("wall")) {
                Matter.Composite.remove(this.ref.world, body)
            }
        })

        this.#createWalls()
    }

    #grabCatterpillar({ x, y }: { x: number, y: number }, event: PointerEvent | MouseEvent) {
        if (this.disableDragging) return
        if (!this.catterpillar) return

        this.catterpillar?.bodyParts.forEach(bodyPart => {
            if (!this.catterpillar) return
            const bounds = bodyPart.body.bounds
            if (x >= bounds.min.x && x <= bounds.max.x && y >= bounds.min.y && y <= bounds.max.y) {
                // Create constraint and attach to body part
                this.mousePin = this.catterpillar.pin(bodyPart, { x, y, name: "mousePin" })
            }
        })
        
        if (this.mousePin) {
            event.preventDefault()
        }
    }

    #releaseCatterpillar() {
        if (!this.catterpillar) return

        this.mousePin = undefined
        this.catterpillar.pins.forEach(pin => {
            if (!this.catterpillar) return
            const labels = pin.label.split(",")

            if (labels.includes("mousePin")) {
                this.catterpillar.unpin(pin)
            }
        })
    }

    #dragCatterpillar(mouse: { x: number, y: number }) {
        if (this.disableDragging) return
        if (!this.mousePin) return
        if (!this.catterpillar) return

        const contractions = this.catterpillar?.contraction
        if (contractions) {
            if (contractions.bellyConstraint) {
                this.catterpillar.unpin(contractions.bellyConstraint)
                contractions.bellyConstraint = undefined
            }

            if (contractions.headConstraint) {
                this.catterpillar.unpin(contractions.headConstraint)
                contractions.headConstraint = undefined
            }
            
            if (contractions.buttConstraint) {
                this.catterpillar.unpin(contractions.buttConstraint)
                contractions.buttConstraint = undefined
            }
        }

        const width = this.ref.renderer.options.width || 0
        const height = this.ref.renderer.options.height || 0

        let x = mouse.x
        let y = mouse.y
        
        if (mouse.x < 0) {
            x = 0
        }
        if (mouse.x > width) {
            x = width
        }

        if (mouse.y < 0) {
            y = 0
        }
        if (mouse.y > height) {
            y = height
        }
        if (this.mousePin) {
            this.mousePin.pointB = { x, y } 
        }
    }

    #lookAtMouse(mouse: { x: number, y: number }) {
        
        if (this.catterpillar) {
            if (this.catterpillar.leftEye.isFollowing) {
                return
            }
            this.catterpillar.leftEye.lookAt({ x: mouse.x, y: mouse.y })
            this.catterpillar.rightEye.lookAt({ x: mouse.x, y: mouse.y })
        }
    }

    on(eventName: string, callback: (...args: any[]) => void) {
        this.listeners.push({ type: eventName, fn: callback })
    }

    // Event afvuren
    emit(eventName: string, ...args: any[]) {
        this.listeners
            .filter(listener => listener.type === eventName)
            .forEach(listener => listener.fn(...args))
    }

    // Event verwijderen (optioneel)
    off(eventName: string, callback?: (...args: any[]) => void) {
        this.listeners = this.listeners.filter(listener => {
            if (listener.type !== eventName) return true
            if (callback && listener.fn !== callback) return true
            return false
        })
    }

    switchClickEvent(name: string) {
        this.ref.clickEvents = []
        let fn

        if (name == "moveCatterpillar") {
            fn = ({ x, /* y */ }: { x: number, y: number }) => {
                if (!this.catterpillar) return

                if (this.catterpillar.isPointingLeft()) {
                    if (x < this.catterpillar.x) {
                        this.catterpillar.move()
                    } else {
                        this.catterpillar.turnAround()
                    }
                } else {
                    if (x > this.catterpillar.x) {
                        this.catterpillar.move()
                    } else {
                        this.catterpillar.turnAround()
                    }
                }
            }
        } else if (name == "createCatterpillar") {
            fn = ({ x,y }: { x: number, y: number }) => {
                const id = this.ref.world.composites.filter(c => c.label.startsWith("catterpillar")).length + 1
                new Catterpillar({
                    x: x,
                    y: y,
                    identity: { id, name: `Catterpillar${id}`, textureIndex: 1, colorSchemeIndex: 1, offset: 0, gender: 0, length: 14, thickness: 10 },
                }, this.ref.world) 
            }
        } else if (name == "standUpCatterpillar") {
            fn = () => {
                if (!this.catterpillar) return

                this.catterpillar.standUp(0, .5)
                let a = 0
                const interval = setInterval(async () => {
                    if (!this.catterpillar) return
                    if (a >= 5) {
                        clearInterval(interval)
                        this.catterpillar.releaseStance()
                        return
                    }

                    if (a % 2 === 0) {
                        this.catterpillar.standUp(90, .5)
                    } else {
                        this.catterpillar.standUp(-90, .5)
                    }

                    a++
                }, 800)
            }
        } else if (name == "turnAround") {
            fn = () => {
                if (!this.catterpillar) return
                this.catterpillar.turnAround()
            }
        }
        if (!fn) return
        
        this.ref.addClickEvent(fn, name)
    }

    createCatterpillar(position: { x: number, y: number }, options?: { identity?: IdentityField }) {
        let { identity } = options || {}

        if (!identity) {
            const id = this.ref.world.composites.filter(c => c.label.startsWith("catterpillar")).length + 1

            identity = {
                id,
                name: "catterpillar",
                textureIndex: Math.floor(Math.random() * 399),
                colorSchemeIndex: Math.floor(Math.random() * 96),
                offset: Math.floor(Math.random() * 16),
                gender: Math.random() > 0.5 ? 1 : 0,
                thickness: 16,
                length: 6
            }

            if (options?.identity) {
                if (options.identity.textureIndex) {
                    identity.textureIndex = options.identity.textureIndex
                }

                if (options.identity.colorSchemeIndex) {
                    identity.colorSchemeIndex = options.identity.colorSchemeIndex
                }
                if (options.identity.offset) {
                    identity.offset = options.identity.offset
                }
            }
        }
        this.identity = identity

        this.catterpillar = new Catterpillar({
            x: position.x,
            y: position.y,
            identity: identity as IdentityField
        }, this.ref.world).ref

        // Custom colors for the main catterpillar
        this.catterpillar.bodyParts.forEach((part, index) => {
            if (!this.catterpillar) return

            if (index === 0) {
                part.body.render.fillStyle = "tomato"
            } else if (index === this.catterpillar.bodyParts.length - 1) {
                part.body.render.fillStyle = "brown"
            } else {
                part.body.render.fillStyle = `hsl(128, ${Math.random() * 10 + 90}%,  ${Math.random() * 10 + 45}%)`
            }
        })

        this.draw.addCatterpillar(this.catterpillar)
        return this.catterpillar
    }

    destroy() {
        this.ref.world.bodies.length = 0
        this.ref.world.composites.length = 0
        this.ref.world.constraints.length = 0
        
        this.ref.removePrivateEvents()
        
        Matter.Render.stop(this.ref.renderer)

        this.ref.renderer.canvas.remove()
        this.listeners = []

        this.draw.two.clear()
        this.draw.two.remove()
        this.draw.two.renderer.domElement.remove()
    }
}