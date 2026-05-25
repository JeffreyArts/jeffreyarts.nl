import Matter from "matter-js"
import { collisionWall } from "@/model/physics/collisions"

export class Polygon {
    composite: Matter.Composite
    body: Matter.Body
    world: Matter.World
    id: string
    points: { x: number; y: number }[]
    color: string
    isDestroyed: boolean = false

    constructor(options: {
        id: string
        points: { x: number; y: number }[]
        color?: string
    }, world: Matter.World) {
        this.world = world
        this.id = options.id
        this.points = options.points
        this.color = options.color ?? "#FF3B5C"

        this.composite = Matter.Composite.create({ label: `polygon,${this.id}` })

        this.#createBody()

        Matter.World.add(this.world, this.composite)
    }

    #createBody() { 
        const verts = this.points.map(p => ({ x: p.x, y: p.y }))
        const cx = this.points.reduce((s, p) => s + p.x, 0) / this.points.length
        const cy = this.points.reduce((s, p) => s + p.y, 0) / this.points.length

        this.body = Matter.Bodies.rectangle(cx, cy, 1, 1, {
            label: "polygon",
            isStatic: true,
            collisionFilter: collisionWall,        
            friction: 1,
            frictionStatic: 10,
            render: {
                fillStyle: this.color + "38",
                strokeStyle: this.color,
                lineWidth: 2,
            }
        })

        Matter.Body.setVertices(this.body, verts)
        Matter.Body.setPosition(this.body, { x: cx, y: cy })

        Matter.World.add(this.world, this.body)
    }

    updatePoints = (points: { x: number; y: number }[]) => {
        this.points = points

        // Remove old body and recreate with new vertices
        Matter.World.remove(this.world, this.body)
        this.#createBody()
    }

    destroy = () => {
        this.isDestroyed = true
        Matter.World.remove(this.world, this.body)
    }
}

export default Polygon