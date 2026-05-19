import Matter from "matter-js"
import Paper from "paper"

export type PhysicsBlock = {
    x: number,
    y: number,
    width: number,
    height: number,
    id: string,
    domEl?: HTMLElement,
    composite?: Matter.Composite
}

export type PhysicsPolygon = {
    id: string
    points: { x: number; y: number }[]
    composite: Matter.Composite
}

// Exported so other modules (e.g. PolygonDrawer) can draw on the same
// Paper project without calling Paper.setup() a second time.
export let paperScope: paper.PaperScope | null = null

export default class Physics {
    private anchorOffset = 8
    private layoutWidth: number
    private layoutHeight: number
    public blocks: Array<PhysicsBlock>
    public polygons: Array<PhysicsPolygon> = []
    private ceiling: Matter.Body
    private ground: Matter.Body
    public engine: Matter.Engine
    private render: Matter.Render
    private runner: Matter.Runner
    private resizeTimeout: NodeJS.Timeout | null = null
    
    constructor(options?: { 
        
    }) {
        this.layoutWidth = window.innerWidth
        this.layoutHeight = window.innerHeight
        this.blocks = []
        this.polygons = []

        const domEl = document.createElement("canvas")
        domEl.id = "physics"

        const paperEl = document.createElement("canvas")
        paperEl.id = "paper"
        paperEl.width = window.innerWidth
        paperEl.height = window.innerHeight

        Paper.setup(paperEl)

        // Expose the active PaperScope so other modules can share the same
        // Paper project without calling setup() again.
        paperScope = Paper

        // Parse the query string
        const urlParams = new URLSearchParams(window.location.search);

        if (!urlParams.has("dev")) {
            domEl.style.display = "none"
        }

        document.body.appendChild(domEl)
        document.body.appendChild(paperEl)

        // Set-up the physics engine
        this.engine = Matter.Engine.create(),
        this.render = Matter.Render.create({
            canvas: domEl,
            engine: this.engine,
            options: {
                width: this.layoutWidth,
                height: this.layoutHeight,
                wireframes: false,
                showCollisions: true
            }
        })

        Matter.Render.run(this.render);

        // create runner
        this.runner = Matter.Runner.create();

        // run the engine
        Matter.Runner.run(this.runner, this.engine);
     
        // Add ground
        this.ground = Matter.Bodies.rectangle(this.layoutWidth/2, this.layoutHeight + 194, this.layoutWidth, 400, {
            isStatic: true,
            label: "ground",
            collisionFilter: {
                category: 0x0003,
                mask: 0x0002
            }
        })
        // Add ceiling
        this.ceiling = Matter.Bodies.rectangle(this.layoutWidth/2, -600, this.layoutWidth, 400, {
            isStatic: true,
            label: "ceilng",
            collisionFilter: {
                category: 0x0003,
                mask: 0x0002
            }
        })
        Matter.World.add(this.engine.world, [this.ground, this.ceiling])
        window.addEventListener("resize", this.onResize.bind(this))
    }

    onResize() {
        if (!this.render) {
            return
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout)
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.resizeTimeout = null

            this.layoutWidth = window.innerWidth
            this.layoutHeight = window.innerHeight

            // this.blocks.forEach(block => {
            //     if (!block.composite || !block.domEl) {
            //         return
            //     }
                
            //     const dimensions = this.extractDimensionsFromElement(block.domEl)

            //     if (dimensions)  {
            //         this.updateBlock(block.id, {...dimensions})
            //     }
            // })

            // Verwijder oude ground
            Matter.World.remove(this.engine.world, this.ground)
            
            // Voeg nieuwe ground toe
            this.ground = Matter.Bodies.rectangle(this.layoutWidth/2, this.layoutHeight + 194, this.layoutWidth, 400, {
                isStatic: true,
                label: "ground",
                collisionFilter: {
                    category: 0x0003,
                    mask: 0x0002
                }
            })
            Matter.World.add(this.engine.world, this.ground)

            // @ts-ignore
            Matter.Render.setSize(this.render, this.layoutWidth, this.layoutHeight)

            Paper.view.viewSize.width = window.innerWidth
            Paper.view.viewSize.height = window.innerHeight
        },50)
    }

    extractDimensionsFromElement(el: HTMLElement) {
        const dimension = el.getBoundingClientRect();
        const style = window.getComputedStyle(el)

        if (el.parentElement) {
            const offsetY = el.parentElement.offsetTop + el.offsetTop
            const y = offsetY + parseInt(style.paddingTop)

            const x = (dimension.x + window.scrollX) + parseInt(style.paddingLeft)
            const width = dimension.width - parseInt(style.paddingLeft) - parseInt(style.paddingRight)
            const height = dimension.height - parseInt(style.paddingTop) - parseInt(style.paddingBottom)
            return { x, y, width, height }
        }
            
        return undefined
    }

    updateBlock(id: string, options: {x?: number, y?: number, width?: number, height?: number}) {
        const block = this.blocks.find(b => b.id === id)
        if (!block) {
            return
        }

        if (options.x) {
            block.x = options.x
        }
        if (options.y) {
            block.y = options.y
        }
        if (options.width) {
            block.width = options.width
        }
        if (options.height) {
            block.height = options.height
        }

        if (block.composite) {
            const oldBody = block.composite.bodies.find(body => body.label === "block") as Matter.Body
            const newBody = Matter.Bodies.rectangle(block.x + block.width/2, block.y + block.height/2 - window.scrollY, block.width, block.height, {
                label: "block",
                isStatic: true,
                mass: block.width * block.height / 1000,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0x0001
                }
            })

            Matter.Composite.remove(block.composite, oldBody);
            Matter.Composite.add(block.composite, newBody);
            // Update anchor points
            block.composite.bodies.forEach(bodyBlock => {
                switch (bodyBlock.label) {
                    case "pointTopLeft":
                        Matter.Body.setPosition(bodyBlock, { x: block.x - this.anchorOffset, y: block.y - window.scrollY - this.anchorOffset })
                        break
                    case "pointTopRight":
                        Matter.Body.setPosition(bodyBlock, { x: block.x + block.width + this.anchorOffset, y: block.y - window.scrollY - this.anchorOffset})
                        break
                    case "pointBottomLeft":
                        Matter.Body.setPosition(bodyBlock, { x: block.x, y: block.y - window.scrollY + block.height })
                        break
                    case "pointBottomRight":
                        Matter.Body.setPosition(bodyBlock, { x: block.x + block.width, y: block.y - window.scrollY + block.height })
                        break
                }
            })
            
            // Update constraints
            block.composite.constraints.forEach(constraint => { 
                constraint.bodyA = newBody
                switch (constraint.label) {
                    case "constraintTopLeft":
                        constraint.pointA = { x: -block.width/2, y: -block.height/2 }
                        break
                    case "constraintTopRight":
                        constraint.pointA = { x: block.width/2, y: -block.height/2 }
                        break
                    case "constraintBottomLeft":
                        constraint.pointA = { x: -block.width/2, y: block.height/2 }
                        break
                    case "constraintBottomRight":
                        constraint.pointA = { x: block.width/2, y: block.height/2 }
                        break
                }
            })

        }
    }

    addBlock(el: HTMLElement) {
        const id = el.id.toString()
        
        if (this.blocks.find(b => b.id.toString() === id)) {
            const newDimensions = this.extractDimensionsFromElement(el)
            if (newDimensions) {
                this.updateBlock(id, newDimensions)
            }
            return
        }

        // Get the dimensions 
        const newDimensions = this.extractDimensionsFromElement(el)
        if (!newDimensions) {
            return
        }
        const {x,y,width,height} = newDimensions

        // Create block
        const block = Matter.Bodies.rectangle(x + width/2, y+height/2 - window.scrollY, width, height,{
            label: "block",
            mass: width * height / 1000,
            isStatic: true,
            collisionFilter: {
                category: 0x0001,
                mask: 0x0001 | 0x0002
            }
        })

        // Compose the composite
        const blockComposite = Matter.Composite.create({label: "block"})
        Matter.Composite.add(blockComposite, [block])
        
        // Add the composite to the world
        Matter.World.add(this.engine.world, blockComposite)

        // Add block to the list
        this.blocks.push({
            x,
            y,
            width,
            height,
            id,
            domEl: el,
            composite: blockComposite
        })
    }

    clearBlocks() {
        this.blocks.forEach(block => {
            if (block.composite) {
                const bodies = block.composite.bodies

                bodies.forEach(bodyBlock => {
                    if (!block.composite) {
                        return
                    }

                    Matter.Composite.remove(block.composite, bodyBlock)
                })

                const constraints = block.composite.constraints
                constraints.forEach(constraint => {
                    if (!block.composite) {
                        return
                    }

                    Matter.Composite.remove(block.composite, constraint)
                })
                Matter.World.remove(this.engine.world,block.composite)
                Matter.Composite.clear(block.composite, true)
            }
        })
        this.blocks = []
    }

    // ─── Polygon methods ───────────────────────────────────────────────────────

    /**
     * Build a Matter.js Composite from a closed polygon defined by screen-space
     * points.  The body uses fromVertices so it works with any convex or (via
     * decomp) concave shape.  It is static so it acts as a solid collider.
     */
    addPolygon(id: string, points: { x: number; y: number }[]): PhysicsPolygon | null {
        if (points.length < 3) return null

        // Remove existing polygon with same id first
        this.removePolygon(id)

        // Matter.Bodies.fromVertices needs a centre position + vertex list.
        // We compute the centroid ourselves so the body lands exactly on the
        // drawn shape without any offset surprise.
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length

        const vertices = points.map(p => ({ x: p.x, y: p.y }))

        const body = Matter.Bodies.fromVertices(cx, cy, [vertices], {
            label: "polygon",
            isStatic: true,
            collisionFilter: {
                category: 0x0001,
                mask: 0x0001 | 0x0002
            },
            // Keep the body visually clean in wireframe/dev mode
            render: {
                fillStyle: "#ffffff22",
                strokeStyle: "#ffffff",
                lineWidth: 1
            }
        }, true) // true = flagInternal, removes internal edges from decomposed shapes

        if (!body) return null

        // fromVertices may shift the body centre after decomposition — realign
        Matter.Body.setPosition(body, { x: cx, y: cy })

        const composite = Matter.Composite.create({ label: `polygon:${id}` })
        Matter.Composite.add(composite, body)
        Matter.World.add(this.engine.world, composite)

        const polygon: PhysicsPolygon = { id, points, composite }
        this.polygons.push(polygon)
        return polygon
    }

    /**
     * Replace the vertex data of an existing polygon body in-place.
     * Called while the user drags an anchor point in the editor.
     */
    updatePolygon(id: string, points: { x: number; y: number }[]): void {
        if (points.length < 3) return

        const existing = this.polygons.find(p => p.id === id)
        if (!existing) {
            // Not yet registered — create it fresh
            this.addPolygon(id, points)
            return
        }

        // Update stored points
        existing.points = points

        // Remove old body from composite and world
        const oldBodies = [...existing.composite.bodies]
        oldBodies.forEach(b => Matter.Composite.remove(existing.composite, b))

        // Build new body
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length
        const vertices = points.map(p => ({ x: p.x, y: p.y }))

        const newBody = Matter.Bodies.fromVertices(cx, cy, [vertices], {
            label: "polygon",
            isStatic: true,
            collisionFilter: {
                category: 0x0001,
                mask: 0x0001 | 0x0002
            },
            render: {
                fillStyle: "#ffffff22",
                strokeStyle: "#ffffff",
                lineWidth: 1
            }
        }, true)

        if (!newBody) return

        Matter.Body.setPosition(newBody, { x: cx, y: cy })
        Matter.Composite.add(existing.composite, newBody)
    }

    /**
     * Remove a single polygon by id.
     */
    removePolygon(id: string): void {
        const idx = this.polygons.findIndex(p => p.id === id)
        if (idx === -1) return

        const polygon = this.polygons[idx]
        Matter.World.remove(this.engine.world, polygon.composite)
        Matter.Composite.clear(polygon.composite, true)
        this.polygons.splice(idx, 1)
    }

    /**
     * Remove all polygons from the world and clear the list.
     */
    clearPolygons(): void {
        this.polygons.forEach(polygon => {
            Matter.World.remove(this.engine.world, polygon.composite)
            Matter.Composite.clear(polygon.composite, true)
        })
        this.polygons = []
    }
}