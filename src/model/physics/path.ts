export class Point {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }
}

export class Path {
    points: Array<Point>

    constructor(points?: Array<Point>) {
        if (!points) {
            this.points = []
            return
        }
        this.points = points
    }
}

export class Circle extends Path {
    x: number
    y: number
    radius: number
    constructor({ x, y, radius, segments }: { x: number, y: number, radius: number, segments?: number }) {
        super()
        this.x = x
        this.y = y
        this.radius = radius
        this.points = []

        const seg = segments ? segments : 4
        for (let i = 0; i < seg; i++) {
            const theta = (i / seg) * (2 * Math.PI)
            const pointX = this.x + this.radius * Math.cos(theta)
            const pointY = this.y + this.radius * Math.sin(theta)
            this.points.push(new Point(pointX, pointY))
        }

    }
}