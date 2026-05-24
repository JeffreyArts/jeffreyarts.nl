import Matter from "matter-js"
import { collisionWall } from "@/model/physics/collisions"

type Point = { x: number; y: number }

export class Polygon {
    world: Matter.World
    body: Matter.Body

    id: string
    points: { x: number; y: number }[]
    color: string

    constructor(
        options: {
            id: string
            points: { x: number; y: number }[]
            color?: string
        },
        world: Matter.World
    ) {
        this.world = world
        this.id = options.id
        this.color = options.color ?? "#FF3B5C"

        // ALWAYS clone on entry (critical)
        this.points = options.points.map(p => ({ ...p }))

        this.body = this.createBody()
        Matter.World.add(this.world, this.body)
    }

    private createBody(): Matter.Body {
        const verts = this.points.map(p => ({ ...p }))

        const cx = verts.reduce((s, p) => s + p.x, 0) / verts.length
        const cy = verts.reduce((s, p) => s + p.y, 0) / verts.length

        const body = Matter.Bodies.fromVertices(cx, cy, [verts], {
            isStatic: true,
            collisionFilter: collisionWall,
            render: {
                fillStyle: this.color + "38",
                strokeStyle: this.color,
                lineWidth: 2,
            }
        }, true)

        return body
    }

    updatePoints(next: { x: number; y: number }[]) {
        // 🔥 BREAK ALL REFERENCES IMMEDIATELY
        this.points = next.map(p => ({ ...p }))

        Matter.World.remove(this.world, this.body)
        this.body = this.createBody()
        Matter.World.add(this.world, this.body)
    }

    destroy() {
        Matter.World.remove(this.world, this.body)
    }
}