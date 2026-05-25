import Matter from "matter-js"
import { collisionBodyPart } from "@/model/physics/collisions"

export type BodyPartOptions = {
    size: number,
    damping?: number,
    slop?: number,
    points?: number,
    restitution?: number,
}


export class BodyPart {
    x: number
    y: number
    radius: number
    body: Matter.Body
    options: {
        restitution: number
        slop: number,
    }
    dev: boolean
    type: "bodyPart" | "head" | "butt"
    world?: Matter.World


    constructor (
        options: {
            radius: number,
            x?: number,
            y?: number,
            restitution?: number,
            slop?: number,
            type?: "head" | "butt",
        },
        world?: Matter.World
    ) {
        this.dev = true
        this.options = {
            restitution: 0.8,
            slop: .01,
        }

        this.x = options?.x ? options.x : 0
        this.y = options?.y ? options.y : 0
        this.radius = options?.radius ? options.radius : 8
        
        if (world) {
            this.world = world
        }

        // Set label
        this.type = "bodyPart"
        if (options?.type) {
            this.type = options.type
        }
        
        
        if (options?.restitution) {
            this.options.restitution = options.restitution
        }

        if (options?.slop) {
            this.options.slop = options.slop
        }
        
        const label = this.type == "bodyPart" ? "bodyPart" : `bodyPart,${this.type}`

        // this.collisionGroup = options?.collisionGroup ? options.collisionGroup : 0
        
        this.body = Matter.Bodies.circle(this.x, this.y, this.radius, { 
            collisionFilter: collisionBodyPart,
            mass: 1,
            density: .2,
            friction: .8,
            frictionAir: .01,
            restitution: this.options.restitution,
            slop: .1,
            label,
            render: {
                visible: this.dev,
            }
        })

        requestAnimationFrame(() => this.#loop())
    }


    #loop() {
        this.x = this.body.position.x
        this.y = this.body.position.y
        
        // Does not seem relevant (also causes issues with catapult story, deployment of launcherwurmpjes )
        // if (this.world) {
        //     const boundaries = this.#getWorldBoundaries()
        //     // check of body binnen de world boundaries is
        //     const inside = this.y >= boundaries.top &&
        //                this.x >= boundaries.left &&
        //                this.x <= boundaries.right &&
        //                this.y <= boundaries.bottom

        //     // update collisionFilter.mask dynamisch
        //     if (inside) {
        //         this.body.collisionFilter.mask = collisionBodyPart.mask // standaard mask, bv CATEGORY_WALL
        //     } else {
        //         this.body.collisionFilter.mask = 0 // bots met niets
        //     }
        // }
        

        requestAnimationFrame(() => this.#loop())
    }

    #getWorldBoundaries() {
        if (!this.world) return null

        const walls = Matter.Composite.allBodies(this.world).filter((body) => {
            return body.label.split(",").includes("wall")
        })

        let top, bottom, left, right = 0
        walls.forEach((wall) => {
            if (wall.label.includes("top")) { 
                top = wall.bounds.max.y
            } else if (wall.label.includes("bottom")) {
                bottom = wall.bounds.min.y
            } else if (wall.label.includes("left")) {
                left = wall.bounds.max.x
            } else if (wall.label.includes("right")) {
                right = wall.bounds.min.x
            }
        })

        return {
            top,
            bottom,
            left,
            right,
        }
    }
}

export default BodyPart