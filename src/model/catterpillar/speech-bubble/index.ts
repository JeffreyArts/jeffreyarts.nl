import Matter from "matter-js"
import { collisionBorderPoint } from "@/model/physics/collisions"
import gsap from "gsap"

export type SpeechBubbleOptions = {
    x?: number
    y?: number
    text?: string,
    parentElement?: HTMLElement
} 

class SpeechBubble  {
    id: number
    anchor: {
        width: number,
        height: number
    }
    bubble: {
        left: Matter.Composite,
        right: Matter.Composite,
        anchor: Matter.Composite,
        outline: Array<Matter.Body>
    }
    size: number
    parentElement: HTMLElement
    x: number
    y: number
    text: string
    animatedText: string = ""
    domElement: HTMLDivElement
    composite: Matter.Composite
    world: Matter.World
    isDestroyed: boolean = false

    constructor (
        world: Matter.World,
        options = {
            x: 128,
            y: 122,
            text: "..."
        } as SpeechBubbleOptions) {
        this.id = Date.now()
        this.isDestroyed = false
        this.world = world
        this.text = options.text ? options.text : "..."
        this.parentElement = document.body
        this.anchor = {
            width: 20,
            height: 22
        }

        if (!options.x) {
            options.x = 128
        }

        if (!options.y) {
            options.y = 128
        }

        if (options.parentElement) {
            this.parentElement = options.parentElement
        }
        
        this.x = options.x
        this.y = options.y
        this.domElement = this.#createDomElement(this.text)
        this.size = this.domElement.clientHeight

        this.#createBubble(this.x, this.y)
        // setTimeout(() => {
        //     this.updatePosition()
        // })


        Matter.World.add(this.world, this.composite)
        
        this.#loop()
            
        // return new Proxy(this, {
        //     set: function (target: SpeechBubble, key, value) {
        //         if (key === "x" || key === "y") {
        //             target[key] = value
        //             target.updatePosition()
        //         }

        //         if (key === "text") {
        //             target[key] = value
        //             target.updateText()
        //         }

        //         return true
        //     }
        // })
    }

    #createDomElement (text: string) {
        const domElement = document.createElement("div")
        if (this.parentElement) {
            this.parentElement.appendChild(domElement)
        }
        domElement.classList.add("speech-bubble")
        domElement.id = "speech-bubble-" + this.id.toString()
        domElement.innerText = text
        domElement.style.position = "absolute"
        domElement.style.transform = "translateY(-50%)"
        domElement.style.left = this.x + "px"
        domElement.style.top = this.y + "px"
        return domElement
    }


    #createCircle (x: number, y: number, angles: Array<number>) {
        const res = Matter.Composite.create({})
        if (this.size != this.domElement.clientHeight) {
            gsap.to(this, {
                size: this.domElement.clientHeight,
                duration: .32
            })
        }
        const centerPoint = Matter.Bodies.circle(x,y, 5, {
            label: "centerPoint",
            isStatic: true,
            render: {
                fillStyle: "#f90"
            }
        })

        Matter.Composite.add(res, [centerPoint])
        angles.forEach(angle => {
            const borderX = x + Math.cos(angle * Math.PI/180) * this.size
            const borderY = y + Math.sin(angle * Math.PI/180) * this.size

            const borderPoint = Matter.Bodies.circle(
                borderX,
                borderY,
                2, 
                {
                    label: `borderPoint-${angle}`,
                    isStatic: false,
                    collisionFilter: collisionBorderPoint
                }
            )

            const constraint = Matter.Constraint.create({
                bodyA: centerPoint,
                bodyB: borderPoint,
                length: this.size,
                stiffness: .048,
                damping: .6,
                render: {
                    lineWidth: 1,
                    type: "line"
                }
            })
            Matter.Composite.add(res, [borderPoint, constraint])
        })

        // const Path = new Paper.Path(this.imgBlob.points)
        // Path.closed = true

        // if (this.options.smooth) {
        //     Path.smooth()
        // }

        return res
    }
    
    #createAnchor () {
        if (!this.bubble.left || this.bubble.left.bodies.length <= 0) {
            throw new Error("First create bubble with createBubble function")
        }
        const res = Matter.Composite.create({
            label: "anchor"
        })

        const pointA = this.bubble.left.bodies[1]
        const pointB = this.bubble.left.bodies[2]
        
        
        const centerPoint = Matter.Bodies.circle(this.x,this.y, 5, {
            label: "anchorPoint",
            isStatic: true
        })
        const constraintA = Matter.Constraint.create({
            bodyA: centerPoint,
            bodyB: pointA,
            stiffness: 0.02,
            damping: 0.02,
            render: {
                strokeStyle: "#9f0",
                type: "line"
            }
        })
        const constraintB = Matter.Constraint.create({
            bodyA: centerPoint,
            bodyB: pointB,
            stiffness: 0.02,
            damping: 0.02,
            render: {
                strokeStyle: "#9f0",
                type: "line"
            }
        })

        Matter.Composite.add(res,[centerPoint, constraintA, constraintB])

        return res
    }

    #createBubble (x: number, y: number) {
        this.bubble = {
            left: this.#createCircle(x,y - this.anchor.height - this.size / 2, [90, 135, 180, 225, 270]),
            right: this.#createCircle(x + this.domElement.clientWidth,y - this.anchor.height - this.size / 2, [270, 315, 0, 45, 90]),
            anchor: Matter.Composite.create({ label: "false" }),
            outline: []
        }
        this.bubble.outline = [...this.bubble.left.bodies, ...this.bubble.right.bodies]
        // Remove center points from outline
        this.bubble.outline = this.bubble.outline.filter(body => body.label !== "centerPoint" && body.label !== "anchorPoint")
        this.bubble.left.label = "leftside"
        this.bubble.right.label = "rightside"
        this.bubble.anchor.label = "anchor"

        this.composite = Matter.Composite.create({
            composites: [this.bubble.left, this.bubble.right],
            label: "speechBubble",
        })

        this.bubble.anchor = this.#createAnchor()
        Matter.Composite.add(this.composite, this.bubble.anchor)
        
        const leftTop = this.bubble.left.bodies.find(b => b.label === "borderPoint-270")
        const rightTop = this.bubble.right.bodies.find(b => b.label === "borderPoint-270")
        const leftBottom = this.bubble.left.bodies.find(b => b.label === "borderPoint-90")
        const rightBottom = this.bubble.right.bodies.find(b => b.label === "borderPoint-90")
        
        if (leftTop && leftBottom) {
            const leftConstraint = Matter.Constraint.create({
                label: "leftConstraint",
                bodyA: leftTop,
                bodyB: leftBottom,
                stiffness: .024,
                length: this.size,
                render: {
                    lineWidth: 4,
                    strokeStyle: "#09f"
                }
            })
            Matter.Composite.add(this.composite, leftConstraint)
        }

        if (rightTop && rightBottom) {
            const rightConstraint = Matter.Constraint.create({
                label: "rightConstraint",
                bodyA: rightTop,
                bodyB: rightBottom,
                stiffness: .024,
                length: this.size,
                render: {
                    lineWidth: 4,
                    strokeStyle: "#09f"
                }
            })
            Matter.Composite.add(this.composite, rightConstraint)
        }

        let prevBody: Matter.Body | null = null
        this.bubble.outline.forEach((body, index) => {
            if (prevBody) {
                const constraint = Matter.Constraint.create({
                    bodyA: prevBody,
                    bodyB: body,
                    stiffness: .024,
                    label: index == 5 ? "topConstraint" : "outlineConstraint",
                    length: this.size / 2,
                    render: {
                        lineWidth: 2,
                        strokeStyle: "#f09"
                    }
                })
                Matter.Composite.add(this.composite, constraint)
            }

            prevBody = body
        })

        const constraint = Matter.Constraint.create({
            bodyA: this.bubble.outline[0],
            bodyB: this.bubble.outline[this.bubble.outline.length - 1],
            stiffness: .8,
            length: this.domElement.clientWidth,
            label: "bottomConstraint",
            render: {
                lineWidth: 2,
                strokeStyle: "#f09"
            }
        })
        Matter.Composite.add(this.composite, constraint)
        

        this.domElement.style.left = (this.x + this.anchor.width) + "px"
        this.domElement.style.top = (this.y - this.anchor.height - this.size / 2) + "px"

        return this.bubble
    }

    // #updateTextPosition() {
    //     const leftTop = this.bubble.left.bodies.find(b => b.label === "borderPoint-270")
    //     const leftBottom = this.bubble.left.bodies.find(b => b.label === "borderPoint-90")
        
    //     if (leftTop && leftBottom) {
    //         const x = leftTop.position.x
    //         const y = Math.abs(leftTop.position.y + leftBottom.position.y)/2
    //         this.domElement.style.top = y + "px"
    //         this.domElement.style.left = x + "px"
    //     }
    // }

    #updateSize() {
        const leftConstraint = this.composite.constraints.find( c => c.label === "leftConstraint" )
        const rightConstraint = this.composite.constraints.find( c => c.label === "rightConstraint" )
        
        if (leftConstraint) {
            leftConstraint.length = this.size
        }

        if (rightConstraint) {
            rightConstraint.length = this.size
        }

        this.bubble.left.constraints.forEach(constraint => {
            constraint.length = this.size/2
        })

        this.bubble.right.constraints.forEach(constraint => {
            constraint.length = this.size/2
        })

        this.composite.constraints.forEach(constraint => {
            if (constraint.label === "bottomConstraint") {
                constraint.length = this.domElement.clientWidth
            }
            if (constraint.label === "topConstraint") {
                constraint.length = this.domElement.clientWidth
            }
        })
    }

    #loop(){
        if (this.isDestroyed) { 
            return
        }
        const borderPointsLeft = this.composite.composites[0].bodies.filter(body => {
            return body.label.startsWith("borderPoint")
        })
        const borderPointsRight = this.composite.composites[1].bodies.filter(body => {
            return body.label.startsWith("borderPoint")
        })
        
        
        borderPointsLeft.forEach(this.#pushBorderPoint)
        borderPointsRight.forEach(this.#pushBorderPoint)
        this.#updateSize()
        // this.#updateTextPosition()

        this.updatePosition()
        requestAnimationFrame(() => this.#loop())
    }
    
    #pushBorderPoint(body: Matter.Body) {
        const force = 3.2
        const angle = parseInt(body.label.split("-")[1], 10)
        if (!angle && angle !== 0) {
            throw new Error("Border point must have angle specified in label name eg. borderPoint-90 for 90 degrees")
        }
        const x = Math.cos(angle * Math.PI/180) * force
        const y = Math.sin(angle * Math.PI/180) * force
        Matter.Body.setVelocity(body, Matter.Vector.create(x,y))
    }


    #animateTextLoop(duration = 100, index = 0) {
        const text = this.animatedText.slice(0, index+1)
        let dots = ""
        if (index >= text.length - 1) {
            if (text.length <= this.animatedText.length - 3) { 
                dots = "..."
            } else if (text.length <= this.animatedText.length - 2) { 
                dots = ".."
            } else if (text.length <= this.animatedText.length - 1) { 
                dots = "."
            }
        }

        let adjustedDuration
        const lastChar = text.slice(-1)
        if (lastChar === "." || lastChar === "!" || lastChar === "?") {
            adjustedDuration = duration * 3
        } else if (lastChar === ",") {
            adjustedDuration = duration * 1.5
        } else if (lastChar === " ") {
            adjustedDuration = duration * 1.2
        } else {
            adjustedDuration = duration
        }
            
        this.text = text + dots
        this.#updateInnerText()
        if (text.length - dots.length !== this.animatedText.length ) {
            setTimeout(() => {
                this.#animateTextLoop(duration, index+1)
            }, adjustedDuration)
        }
    }

    #updateInnerText() {
        this.domElement.innerText = this.text

        // const rightSide = this.bubble.right.bodies.find(b => b.label === "centerPoint")
        // if (this.size != this.domElement.clientHeight) {
        //     gsap.to(this, {
        //         size: this.domElement.clientHeight,
        //         duration: .32
        //     })
        // }

        // if (rightSide) {
        //     rightSide.position.x = this.x + this.domElement.clientWidth
        // }
        this.updatePosition()
    }

    updateText = (text: string, speed = 100) =>{
        if (!this.domElement) {
            console.warn("Missing domElement", this.isDestroyed)
            return
        }
        this.animatedText = text
        this.#animateTextLoop(speed)

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true)
            }, text.length * speed + 500)
        })
    }

    updatePosition(instant = false) {
        let duration = 0
        if (!instant) {
            duration = .32
        }

        const cpLeft = this.bubble.left.bodies.find(b => b.label === "centerPoint")
        const cpRight = this.bubble.right.bodies.find(b => b.label === "centerPoint")
        const anchor = this.bubble.anchor.bodies.find(b => b.label === "anchorPoint")
    

        if (cpLeft) {
            const pos = { x: cpLeft.position.x, y: cpLeft.position.y }
            gsap.to(pos, {
                x: this.x + this.anchor.width,
                y: this.y - this.anchor.height - this.size/2,
                duration: duration,
                onUpdate: () => {
                    Matter.Body.setPosition(cpLeft, Matter.Vector.create(pos.x, pos.y))
                    if (this.domElement) {
                        
                        const dynamicHeight = this.bubble.left.bodies[1].position.y - this.bubble.left.bodies[5].position.y 
                        const posY = this.bubble.left.bodies[5].position.y + dynamicHeight / 2

                        this.domElement.style.left = pos.x + "px"
                        this.domElement.style.top = posY + "px"
                        // this.domElement.style.lineHeight = Math.min(Math.max(this.size/dynamicHeight, .2), 1.2) + ""
                    }
                }
            })
        }

        if (cpRight) {
            const pos = { x: cpRight.position.x, y: cpRight.position.y }
            gsap.to(pos, {
                x: this.x + this.domElement.clientWidth + this.anchor.width,
                y: this.y - this.anchor.height - this.size/2,
                duration: duration,
                onUpdate: () => {
                    Matter.Body.setPosition(cpRight, Matter.Vector.create(pos.x, pos.y))
                }
            })
        }

        if (anchor) {
            gsap.killTweensOf(anchor.position)
            gsap.to(anchor.position, {
                x: this.x,
                y: this.y,
                duration: 0,
            })
        }
    }

    destroy() {
        this.isDestroyed = true
        this.text = ""
        Matter.Composite.remove(this.world, this.composite)
        this.domElement.remove()
        const el = document.getElementById("speech-bubble-" + this.id.toString())
        if (el) {
            el.remove()
        }
    }

}

export default SpeechBubble