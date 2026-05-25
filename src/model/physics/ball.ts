import Matter from "matter-js"
import { collisionItem } from "@/model/physics/collisions"

export class Ball {
    composite: Matter.Composite
    world: Matter.World
    x: number
    y: number
    size: number
    color: string
    rotation: number = 0

    isMoving: boolean = false
    isMovingTimeout: ReturnType<typeof setTimeout> | number = 0
    isDestroyed: boolean = false

    constructor(options: {
        x: number,
        y: number,
        id?: string,
        color?: string,
        size?: number,
    }, world: Matter.World) {
        this.world = world
        this.x = options.x
        this.y = options.y
        this.size = options.size ? options.size : 16
        this.color = options.color ? options.color : "#00ff00"
        
        // Create composite
        this.composite = Matter.Composite.create({ label: `ball,${options.id}` })
        
        // Create body
        const body = Matter.Bodies.circle(this.x, this.y, this.size, {
            label: "ball",
            collisionFilter: collisionItem,
            friction: 0.1,
            frictionAir: 0.001,
            restitution: 0.9,
            // mass: .4,
            // density: .2,
            render: {
                fillStyle: "orange",
            }
        })
        
        Matter.Composite.add(this.composite, body)
        Matter.World.add(this.world, this.composite)
        requestAnimationFrame(this.#loop.bind(this))
    }

    #loop() {
        if (this.isDestroyed) {
            return
        }
        
        const targetBody = this.composite.bodies[0]

        if (Math.abs(this.x - targetBody.position.x) > 0.1 ||
            Math.abs(this.y - targetBody.position.y) > 0.1) {
            this.isMoving = true
            if (this.isMovingTimeout) {
                clearTimeout(this.isMovingTimeout)
            }
            this.isMovingTimeout = setTimeout(() => {
                this.isMoving = false
            }, 200)
        }
        
        this.x = targetBody.position.x
        this.y = targetBody.position.y
        this.rotation = targetBody.angle

        if (this.y < 100) {
            targetBody.collisionFilter.group = -1
        } else {
            targetBody.collisionFilter.group = 0
        }

        requestAnimationFrame(this.#loop.bind(this))
    }

    destroy() {
        this.isDestroyed = true
        Matter.World.remove(this.world, this.composite)
    }
}

export default Ball