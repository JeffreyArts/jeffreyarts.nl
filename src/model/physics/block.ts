import Matter from "matter-js"
import { collisionWall, collisionFood} from "@/model/physics/collisions"

export class Block {
    composite: Matter.Composite
    body = undefined as Matter.Body | undefined
    world: Matter.World
    id: string
    rotation: number = 0
    el: HTMLElement
    blockEl: HTMLElement
    test  = 0
    size: { width: number, height: number }

    isMoving: boolean = false
    isMovingTimeout: ReturnType<typeof setTimeout> | number = 0
    isDestroyed: boolean = false

    constructor(options: {
        el: HTMLElement,
        id?: string
    }, world: Matter.World) {
        this.world = world
        this.el = options.el
        this.id = options.id ? options.id : ""
        this.size = this.el.getBoundingClientRect()
        if (!this.id) {
            this.id = this.el.id
        }

        if (!this.id) {
            this.id = crypto.randomUUID()
        }

        // Create composite
        this.composite = Matter.Composite.create({ label: `ball,${options.id}` })

        this.el.classList.add("hasMatter")
        
        const blockEl = this.el.querySelector("*")
        this.blockEl = blockEl as HTMLElement
        
        this.updateBody()
        // Matter.World.add(this.world, this.body)
        requestAnimationFrame(this.#loop.bind(this))
    }

    updateEl(el: HTMLElement) {
        this.el = el
        const blockEl = this.el.querySelector("*")
        if (blockEl) {
            this.blockEl = blockEl as HTMLElement
        }
    }

    updateBody() {
        // remove composite bodies
        this.composite.bodies.forEach(body => {
            Matter.World.remove(this.world, body)
        })

        this.body = Matter.Bodies.rectangle(this.x, this.y, this.width, this.height, {
            label: "block",
            mass: this.width * this.height / 1000,
            isStatic: true,
            collisionFilter: collisionWall,
            render: {
                fillStyle: "orange",
            }
        })

        Matter.World.add(this.world, this.body)
    }

    get height() {
        return this.blockEl.getBoundingClientRect().height
    }

    get width() {
        return this.blockEl.getBoundingClientRect().width
    }

    get x() {
        return this.blockEl.getBoundingClientRect().x + this.width/2
    }
    get y() {
        return this.blockEl.getBoundingClientRect().y + this.height/2
    }

    #loop() {

        if (!this.body) {
            requestAnimationFrame(this.#loop.bind(this))
            return
        }

        if (this.body.bounds.max.x - this.body.bounds.min.x !== this.width && this.width !== 0) {
            this.updateBody() 
        }
        
        if (this.isDestroyed) {
            return
        }
        
        // const {x,y,width,height} = this.#/() || {x: 0, y: 0, width: 0, height: 0}
        // this.body.position.x = x 
        if (this.y - this.height / 2 < 0  && this.body.collisionFilter !== collisionFood) {
            this.body.collisionFilter = collisionFood
        } else if (this.y - this.height / 2 >= 0 && this.body.collisionFilter !== collisionWall) {
            this.body.collisionFilter = collisionWall
        }
        if (this.id == "block-66ce15f04e59d8248a419bf8") {
            // console.log(this.y, this.body.collisionFilter)
        }
        Matter.Body.setPosition(this.body, { x: this.x, y: this.y })    
        // this.body.position.y = y

        requestAnimationFrame(this.#loop.bind(this))
    }

    destroy() {
        this.isDestroyed = true
        this.el.classList.remove("hasMatter")
        if (this.body) {
            Matter.World.remove(this.world, this.body)
        }
    }
}

export default Block