import Matter from "matter-js"

export class Ball {
    body: Matter.Body
    world: Matter.World

    constructor(x: number, y: number, radius: number, world: Matter.World) {
        this.world = world

        // Set body
        this.body = Matter.Bodies.circle(x, y, radius, { isStatic: false })
        this.body.label = "ball"
        this.body.collisionFilter.group = 1

        // Add to world
        Matter.World.add(this.world, this.body)
    }
}