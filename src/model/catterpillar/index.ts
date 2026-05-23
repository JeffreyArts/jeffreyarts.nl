import Matter from "matter-js"
import gsap from "gsap"
import { Mouth } from "./mouth"
import { Eye } from "./eye"
import { BodyPart } from "./bodypart"
import Chroma from "chroma-js"
import SpeechBubble from "@/model/catterpillar/speech-bubble"

export type Emote = "happy" | "sad" | "kiss" | "surprised" | "hmm"

export type CatterpillarOptions = {
        textureIndex: number // 0-399
        colorSchemeIndex: number // 0-98
        offset: number // 0-15
        gender: number // 0 | 1
        length: number // 8 - 32
        thickness: number // 8 - 24     
}

export class Catterpillar {
    dev: boolean
    bodyParts: BodyPart[]
    composite: Matter.Composite
    world: Matter.World
    mouth: Mouth
    leftEye: Eye
    rightEye: Eye
    x: number
    y: number
    spine: Matter.Constraint
    pins: Matter.Constraint[]
    contraction?: {
        headConstraint?: Matter.Constraint,
        buttConstraint?: Matter.Constraint
        bellyConstraint?: Matter.Constraint
        tickerFn?: () => void,
        contractionTween?: gsap.core.Tween
    }
    length: number
    thickness: number
    stroke: number = 0
    primaryColor: string = "#00ff00"
    secondaryColor: string = "#007700"
    texture: { top?: string, "360"?: string, bottom?: string, vert?: string, stroke?: boolean } = {}
    blinkTimeout: NodeJS.Timeout | number = 0
    autoBlink: boolean = true
    defaultState: Emote = "happy"
    moveTowardsPoint: { x: number, y: number } | null = null
    
    isStanding: boolean = false
    isTurning: boolean = false
    isMoving: boolean = false
    isScared: boolean = false
    isDead: boolean = false
    isDestroyed: boolean = false
    isTalking: boolean = false
    
    speechBubble: undefined | SpeechBubble

    scared:{
        timeout?: ReturnType<typeof setTimeout> | number,
        timeoutAction?: ReturnType<typeof setTimeout> | number,
    } = {}


    get head () { return this.bodyParts[0] }
    get butt () { return this.bodyParts[this.bodyParts.length -1] }

    constructor(options: {
        id: string,
        x: number,
        y: number,
        primaryColor: string,
        secondaryColor: string,
        texture: { top?: string, "360"?: string, bottom?: string, vert?: string, stroke?: boolean },
        offset: number,
        length: number,
        thickness?: number,
    }, world: Matter.World) {
        this.world = world
        this.dev = true
        this.pins = []
        
        this.x = options.x
        this.y = options.y
        this.length = options.length
        this.thickness = options.thickness ? options.thickness : 16
        this.bodyParts = []
        
        if (options.primaryColor && options.secondaryColor ) {
            this.#setColors(options.primaryColor, options.secondaryColor, options.offset)
        }

        if (options.texture) {
            this.texture = options.texture
        }

        if (this.texture.stroke) {
            this.stroke = this.thickness * 0.05
        }


        // Create composite
        this.composite = Matter.Composite.create({ label: `catterpillar,${options.id}` })
        
        // Create body parts
        this.#createBodyParts()
        this.#createSpine()

        const scale = this.thickness / 16
        this.mouth = new Mouth({
            ref: this.head,
            scale: scale,
            offset: {
                x: 0,
                y: 2.4 * scale
            }
        })

        this.rightEye = new Eye({
            ref: this.head,
            width: 8 * scale,
            height: 8 * scale,
            offset: {
                x: 0, // wordt auto berekend in de #loop
                y: -8 * scale,
            }
        })

        this.leftEye = new Eye({
            ref: this.head,
            width: 8 * scale,
            height: 8 * scale,
            offset: {
                x: 0, // wordt auto berekend in de #loop
                y: -8 * scale,
            }
        })
        
        
        this.mouth.moveToState("🙂")

        Matter.World.add(this.world, this.composite)
        requestAnimationFrame(this.#loop.bind(this))
    }

    get isOnSolidGround() {
        const headCollisions = this.touchingSolidGround(this.head.body)
        const buttCollisions = this.touchingSolidGround(this.butt.body)
        
        return (headCollisions.length > 0 && buttCollisions.length > 0) 
    }

    private touchingSolidGround(body: Matter.Body) {
        return Matter.Query.collides(body, this.world.bodies.filter(b => {
            const isStatic = b.isStatic
            const isAboveGround = body.position.y < b.bounds.min.y
            const isBelowGround = body.position.y > b.bounds.max.y
            return isStatic && isAboveGround && !isBelowGround
        }))
    }

    #loop() {
        if (this.isDestroyed) {
            return
        }

        // Set X & Y values based on the center body part
        const centerIndex = Math.round(this.bodyParts.length / 2)
        this.x = this.bodyParts[centerIndex].body.position.x
        this.y = this.bodyParts[centerIndex].body.position.y


        // SETTING OFFSETS
        const offsetX = (this.head.x - this.x) / (this.#calculateLength() / 2)
        
        // Update mouth offset
        this.mouth.offset.x = offsetX * (this.thickness * 0.08) 
        
        // Update eyes offset
        this.leftEye.offset.x = offsetX * (this.thickness * 0.09) - this.leftEye.width * 1.1
        this.rightEye.offset.x = offsetX * (this.thickness * 0.09) //+ this.rightEye.width


        // Update speech bubble position if exist
        if (this.speechBubble) {
            this.speechBubble.x = this.head.x
            this.speechBubble.y = this.head.y - this.thickness
        }

        if (this.autoBlink) {
            this.#autoBlink()
        }
        this.#autoCheckScared()
        
        requestAnimationFrame(this.#loop.bind(this))
    }

    #autoBlink() {
        if (this.isMoving && this.blinkTimeout) {
            clearTimeout(this.blinkTimeout)
            this.blinkTimeout = setTimeout(() => {
                this.leftEye.blink()
                this.rightEye.blink()
                this.blinkTimeout = 0
            }, 500)
        }

        if (this.isScared && this.blinkTimeout) {
            clearTimeout(this.blinkTimeout)
            this.blinkTimeout = setTimeout(() => {
                this.leftEye.blink()
                this.rightEye.blink()
               
                this.blinkTimeout = setTimeout(() => {
                    this.leftEye.blink()
                    this.rightEye.blink()
                    this.blinkTimeout = setTimeout(() => {
                        this.leftEye.blink()
                        this.rightEye.blink()
                        this.blinkTimeout = setTimeout(() => {
                            this.leftEye.blink()
                            this.rightEye.blink()
                            this.blinkTimeout = setTimeout(() => {
                                this.leftEye.blink()
                                this.rightEye.blink()
                                this.blinkTimeout = 0
                            }, 800)
                        }, 400)
                    }, 400)
                }, 300)
            }, 200)
        }


        if (!this.blinkTimeout) {
            this.blinkTimeout = setTimeout(() => {
                this.leftEye.blink()
                this.rightEye.blink()
                
                if (Math.random() > 0.8) {

                    this.blinkTimeout = setTimeout(() => {
                        this.leftEye.blink()
                        this.rightEye.blink()
                        this.blinkTimeout = 0
                    }, 400)
                } else {
                    this.blinkTimeout = 0
                }
            }, 4000 + Math.random() * 2000)
                
        }
    }

    #autoCheckScared() {
        const head = this.head.body
        const butt = this.butt.body

        const velocity = Math.abs(head.velocity.x) + Math.abs(head.velocity.y) 
        if (velocity > 30 && !this.isMoving && (Math.abs(head.position.y - butt.position.y) > this.thickness)) {
            
            if (this.isScared) {
                clearTimeout(this.scared.timeout)
                clearTimeout(this.scared.timeoutAction)
            } else {
                // this.eye.left.stopBlinking()
                // this.eye.right.stopBlinking()
                setTimeout(() => {
                    this.mouth.moveToState("😮", 1.28)
                }, 500)
                this.isScared = true
            }
            
            this.scared.timeout = setTimeout(() => {
                this.scared.timeout = 0
                this.scared.timeoutAction = setTimeout(() => {
                    if (this.defaultState == "happy") {
                        this.mouth.moveToState("🙂", 2.4)
                    } else if (this.defaultState == "hmm") { 
                        this.mouth.moveToState("😐", 2.4)
                    } else if (this.defaultState == "sad") {
                        this.mouth.moveToState("🙁", 2.4)
                    }
                    this.isScared = false
                }, 1600)

            }, 200)
        }
    }

    #calculateLength() {
        return this.length * this.thickness - this.thickness
    }

    #setColors(primaryColor: string, secondaryColor: string, offset: number) {
        let c1 = Chroma(primaryColor)
        let c2 = Chroma(secondaryColor)

        const mixColors = ["#00ff99", "#ff00cc", "#ffff00", "#00ffff", "#ff6600", "#ff0066"]

        if (offset % 4 == 0) {
            c1 = c1.tint(offset/4 / 32)
            c2 = c2.tint(offset/4 / 32)
        }

        if (offset % 3 == 0) {
            c1 = c1.mix(Chroma(mixColors[offset/3]), .04)
            c2 = c2.mix(Chroma(mixColors[offset/3]), .04)
        }

        if (offset == 1) {
            c1 = c1.brighten(.1)
            c2 = c2.brighten(.1)
        } else if (offset == 5) {
            c1 = c1.brighten(.08)
            c2 = c2.brighten(.08)
        } else if (offset == 10) {
            c1 = c1.brighten(.12)
            c2 = c2.brighten(.08)
        } else if (offset == 15) {
            c1 = c1.brighten(0.1)
            c2 = c2.brighten(0.04)
        }

        this.primaryColor = c1.hex()
        this.secondaryColor = c2.hex()
    }

    #createSpine() {
        if (!this.head || !this.butt) {
            console.error("Invalid head or butt for #createSpine");
            return;
        }

        this.spine = Matter.Constraint.create({
            bodyA: this.head.body,
            bodyB: this.butt.body,
            length: this.#calculateLength(),
            stiffness: .01, // This influences the switching of direction .8 seems to cause issues with certain lengths
            damping: .1,
            label: "spine",
            render: {
                visible: this.dev,
                strokeStyle: "#4f0944",
                type: "spring",
            }
        })
        Matter.Composite.add(this.composite, this.spine)
    }

    #createBodyParts() {
        
        // Empty bodyparts
        this.bodyParts = []
        let prev: BodyPart | undefined

        for (let i = 0; i < this.length; i++) {
            let type: "head" | "butt" | undefined
            if (i == 0) {
                type = "head"
            } else if (i == this.length -1) {
                type = "butt"
            }

            const offsetX = this.length * this.thickness / 2
            const x = this.x - offsetX + i * this.thickness

            // Select amount of catterPillars in the world
            // const catterpillars = this.world.composites.filter(comp => {
            //     return comp.label.startsWith("catterpillar")
            // })
            
            const compositeParts = []
            const bodyPartOptions = {
                radius: this.thickness/2,
                x,
                y: this.y,
                // collisionGroup: 1 //-1 * catterpillars.length - 1,
            }

            if (type) {
                bodyPartOptions["type"] = type
            }


            const part = new BodyPart(bodyPartOptions, this.world)
            this.bodyParts.push(part)
            compositeParts.push(part.body)

            if (prev) {
                const length = (part.radius + prev.radius) + .1
                const constraint = Matter.Constraint.create({
                    bodyA: part.body,
                    bodyB: prev.body,
                    pointA: { x: 0, y:0 },
                    pointB: { x: 0, y:0 },
                    length,
                    stiffness: 0.16,
                    damping: 0.2,
                    label: `bodyPartConnection,${part.body.id},${prev.body.id}`,
                    render: {
                        visible: this.dev,
                        strokeStyle: "#444",
                        type:"line",
                    }
                })
                
                compositeParts.push(constraint)
            }

            
            Matter.Composite.add(
                this.composite, compositeParts
            )
            

            prev = part

        }
    }


    #removeContraction() {
        if (!this.contraction) {
            return
        }


        if (this.contraction.buttConstraint) {
            Matter.Composite.remove(this.composite, this.contraction.buttConstraint)
        }

        if (this.contraction.headConstraint) {
            Matter.Composite.remove(this.composite, this.contraction.headConstraint)
        }

        if (this.contraction.bellyConstraint) {
            Matter.Composite.remove(this.composite, this.contraction.bellyConstraint)
        }

        if (this.contraction.tickerFn) {
            gsap.ticker.remove(this.contraction.tickerFn)
        }

        if (this.contraction.contractionTween) {
            this.contraction.contractionTween.kill()
        }

        this.contraction = undefined
    }

    isPointingLeft() {
        return this.head.body.position.x < this.butt.body.position.x
    }

    isPointingRight() {
        return this.head.body.position.x > this.butt.body.position.x
    }

    // perc: number between 0 and 1 to determin the contraction width
    // duration: duration in seconds
    contractSpine = (perc = .5, duration = .5) => {

        return new Promise((resolve, reject) => {
            
            if (this.contraction) {
                // console.warn()
                return reject(new Error("Catterpillar is already in a contracting state"))
            }

            // Calculate new length
            const newLength = this.#calculateLength() * perc
            
            // Stick head to ground via a constraint
            const headConstraint = Matter.Constraint.create({
                bodyA: this.head.body,
                pointB: { x: this.head.body.position.x, y: this.head.body.position.y },
                length: 0,
                stiffness: 1,
                label: "headConstraint",
                render: {
                    visible: this.dev,
                    strokeStyle: "#9f0",
                    type: "line",
                }
            })

            // Stick butt to ground via a constraint
            const buttConstraint = Matter.Constraint.create({
                bodyA: this.butt.body,
                pointB: { x: this.butt.body.position.x, y: this.butt.body.position.y},
                length: 0,
                stiffness: .1,
                label: "buttConstraint",
                render: {
                    visible: this.dev,
                    strokeStyle: "brown",
                    type: "line",
                }
            })

            Matter.Composite.add(this.composite, headConstraint)
            Matter.Composite.add(this.composite, buttConstraint)
            
            // Save contraction state
            this.contraction = {
                headConstraint,
                buttConstraint,
            }

            // Start contraction via GSAP tween
            const obj = { ...this.spine, perc, buttX: Math.abs(this.butt.body.position.x - this.head.body.position.x) }
            this.spine.stiffness = .5
            this.contraction.contractionTween = gsap.to(obj, {
                length: newLength,
                duration: duration,
                perc: 1,
                ease:  "linear",
                buttX: obj.buttX - newLength/2,
                onUpdate: () => {
                    if (!this.touchingSolidGround(this.head.body)) {
                        this.releaseSpine()
                        return reject()
                    }

                    this.spine.length = obj.length
                    let maxVelocity = this.length / 100000
                    if ( this.length < 8) {
                        maxVelocity = maxVelocity * 16
                    } else if ( this.length < 12) {
                        maxVelocity = maxVelocity * 8
                    } else if ( this.length < 16) {
                        maxVelocity = maxVelocity * 4
                    } else if ( this.length < 20) {
                        maxVelocity = maxVelocity * 2
                    } else if ( this.length < 24) {
                        maxVelocity = maxVelocity
                    } else if ( this.length < 30) {
                        maxVelocity = maxVelocity * .5
                    } else if ( this.length < 32) {
                        maxVelocity = maxVelocity * .4
                    } else {
                        maxVelocity = maxVelocity * .3
                    }

                    // Move buttConstraint.pintB.x to simulate pushing off
                    if (this.butt.body.position.x > this.head.body.position.x) {
                        buttConstraint.pointB.x = this.head.body.position.x + obj.length
                    } else {
                        buttConstraint.pointB.x = this.head.body.position.x - obj.length
                    }


                    this.bodyParts.forEach((bp, index) => {
                        const centerIndex = this.#calculateLength() / 2
                        const distanceFromCenter = centerIndex - Math.abs(index - centerIndex)
                        let yForce = distanceFromCenter * -maxVelocity
                        if (index == this.length - 1) {
                            yForce = -.1
                        }
                        // change Y velocity to simulate bounce
                        Matter.Body.applyForce( bp.body, bp.body.position, {
                            // x: (this.head.position.x - this.butt.position.x),
                            x: 0,
                            y: yForce,
                        })

                    })
                },
                onComplete: () => {
                    if (!this.contraction) return

                    this.contraction.tickerFn = () => {
                        const centerIndex = this.bodyParts.length / 2
                        let maxVelocity = .48 - (this.length * 2) / 100
                        if (this.length >= 18) {
                            maxVelocity = .12
                        } else if (this.length >= 16) {
                            maxVelocity = .16
                        } 
                        
                        // Keep arch by setting Y velocity based on distance from center
                        this.bodyParts.forEach((bp, index) => {
                            const distanceFromCenter = centerIndex - Math.abs(index - centerIndex)

                            Matter.Body.setVelocity(bp.body, {
                                x: 0,
                                y: distanceFromCenter * -maxVelocity,
                            })
                        })
                    }
                    gsap.ticker.add(this.contraction.tickerFn)
                    
                    resolve(true)
                }
            })
        })
    }


    // duration: duration in seconds
    releaseSpine = (duration =  .4) : Promise<void> => {
        return new Promise((resolve) => {
            if (!this.contraction) {
                console.warn("Catterpillar is not in a contracting state")
                return resolve()
            }
            // Kill contraction tween when it is still running
            if (this.contraction.contractionTween) {
                this.contraction.contractionTween.kill()
            }

            // this.bodyParts.forEach((bp, index) => {
            //     Matter.Body.setVelocity(bp.body, {
            //         x: 0,
            //         y: 0,
            //     })
            // })

            if (this.contraction.tickerFn) {
                gsap.ticker.remove(this.contraction.tickerFn)
            }

            this.contraction.tickerFn = () => {
                const directionX =  this.isPointingLeft() ? -1 : 1
                Matter.Body.setVelocity(this.head.body, {
                    x: directionX,
                    y: 0
                })
            }
            gsap.ticker.add(this.contraction.tickerFn)

            if (this.contraction.headConstraint) {
                Matter.Composite.remove(this.composite, this.contraction.headConstraint)
            }

            if (this.contraction.buttConstraint) {
                this.contraction.buttConstraint.stiffness = 1
            }
            
            const newLength = this.#calculateLength()
            this.contraction.contractionTween =  gsap.to(this.spine, {
                length: newLength,
                duration: duration,
                ease:  "linear",
                onComplete: () => {
                    // remove constraints
                    this.#removeContraction()
                    this.spine.stiffness = .01

                    resolve()
                }
            })
        })
    }


    // angle: degrees between -45 & 45 where 0 is upright
    // speed: amount of seconds to reach the standing angle
    standUp = (angle = 0, speed = 2) => {
        return new Promise(async (resolve, reject) => {
            if (!this.isOnSolidGround && !this.isStanding) {
                // console.warn("Catterpillar is not touching solid ground, cannot stand up now")
                return reject()
            }

            if (this.isMoving) {
                console.warn("Catterpillar is moving, cannot stand up now")
                return reject()
            }

            const buttConstraint = Matter.Constraint.create({
                bodyA: this.butt.body,
                pointB: { x: this.butt.body.position.x, y: this.butt.body.position.y },
                length: 0,
                stiffness: 1,
                label: "buttConstraint",
                render: {
                    visible: this.dev,
                    strokeStyle: "brown",
                    type: "line",
                }
            })
            const bellyBody = this.bodyParts[Math.floor((this.bodyParts.length-1) / 2) + 1].body
            bellyBody.render.fillStyle = "purple"
            const bellyConstraint = Matter.Constraint.create({
                bodyA: bellyBody,
                pointB: { x: bellyBody.position.x, y: bellyBody.position.y },
                length: 0,
                stiffness: 0.16, // A higher stiffness make is harder to switch direction
                label: "bellyConstraint",
                render: {
                    visible: this.dev,
                    strokeStyle: "orange",
                    type: "line",
                }
            })

            if (!this.contraction) {
                this.contraction = {}
            } else {
                if (this.contraction.tickerFn) {
                    gsap.ticker.remove(this.contraction.tickerFn)
                }
                if (this.contraction.headConstraint) {
                    Matter.Composite.remove(this.composite, this.contraction.headConstraint)
                }
                if (this.contraction.contractionTween) {
                    this.contraction.contractionTween.kill()
                }

            }
            
            if (!this.contraction.buttConstraint) {
                this.contraction.buttConstraint = buttConstraint
                Matter.Composite.add(this.composite, buttConstraint)
            }

            if (!this.contraction.bellyConstraint) {
                this.contraction.bellyConstraint = bellyConstraint
                Matter.Composite.add(this.composite, bellyConstraint)
            }
            

            
            const obj = { perc: 0, angle: 0, spineLength: this.spine.length, bellyX: bellyBody.position.x }
            let angleX = 0
            let angleY = 0

            let factor = 2 - (1 + angle / 180)
            
            // This works for turn around, but not for left/right stand up
            if (bellyBody.position.x > this.butt.body.position.x) {
                factor = 2 - (1 + -angle / 180)
            }
                
            this.contraction.contractionTween = gsap.to(obj, {
                perc: 1,
                angle: angle,
                duration: speed,
                spineLength: this.#calculateLength() * .75 * factor,
                ease: "power1.out",
                onUpdate: () => {
                    const angleRad = (obj.angle - 90) * (Math.PI / 180)
                    const radius = this.thickness / 2


                    angleX = radius * Math.cos(angleRad) * obj.perc
                    angleY = radius * Math.sin(angleRad) * obj.perc
                
                    this.spine.length = obj.spineLength 

                    Matter.Body.setVelocity( this.head.body, {
                        x: angleX,
                        y: angleY,
                    })
                },
                onComplete: () => {
                    this.isStanding = true
                    this.contraction.tickerFn = () => {
                        Matter.Body.setVelocity( this.head.body, {
                            x: angleX,
                            y: angleY,
                        })
                    }
                    gsap.ticker.add(this.contraction.tickerFn)
                    resolve(true)
                }
            })
        })
    }

    releaseStance = () => {
        return new Promise((resolve, reject) => {
            this.isStanding = false
            if (!this.contraction) {
                return reject()
            }

            if (this.contraction.tickerFn) {
                gsap.ticker.remove(this.contraction.tickerFn)
            }

            let loosenConstraint, loosenConstraintStiffness

            this.composite.constraints.forEach(constraint => {
                if (constraint.label.startsWith(`bodyPartConnection,${this.butt.body.id}`)) {
                    loosenConstraint = constraint
                    loosenConstraintStiffness = constraint.stiffness
                    loosenConstraint.stiffness = 0.01
                }
            })


            if (this.contraction.bellyConstraint) {
                Matter.Composite.remove(this.composite, this.contraction.bellyConstraint)
            }
            
            if (this.contraction.buttConstraint) {
                Matter.Composite.remove(this.composite, this.contraction.buttConstraint)
            }

            gsap.to(this.spine, {
                length: this.#calculateLength(),
                duration:  .4,
                ease:  "linear",
                onComplete: () => {
                    
                    loosenConstraint.stiffness = loosenConstraintStiffness
                    
                    this.#removeContraction()
                    
                    resolve(true)
                }
            })

        })
    }

    moveTowards = (pos: { x: number, y: number }) => { 
        this.moveTowardsPoint = pos
        this.#moveTowards()
    }

    async #moveTowards(speed = 100) { 
        if (!this.moveTowardsPoint) {
            return
        }
        const xd = Math.abs(this.moveTowardsPoint.x - this.head.x)
        this.leftEye.lookAt(this.moveTowardsPoint, .5)
        this.rightEye.lookAt(this.moveTowardsPoint, .5)

        if (this.moveTowardsPoint.x < this.head.x ) {
            if (this.isPointingRight() && !this.isTurning && !this.isMoving) {
                await this.turnAround()
                await this.move()
            } else if (!this.isMoving && !this.isTurning) {
                await this.move()
            }
        } else if (this.moveTowardsPoint.x > this.head.x ) {
            if (this.isPointingLeft() && !this.isTurning && !this.isMoving) {
                await this.turnAround()
                await this.move()
            } else if (!this.isMoving && !this.isTurning) {
                await this.move()
            }
        }

        if (!this.moveTowardsPoint) {
            return
        }

        // Clear moveTowardsPoint if close enough
        if (xd < this.thickness) {
            this.moveTowardsPoint = null
        } else {
            setTimeout(() => {
                this.#moveTowards(speed)
            }, speed)
        }
        
    }

    move = async () => {
        this.isMoving = true

        if (!this.isOnSolidGround) {
            // console.warn("Catterpillar is not touching solid ground, cannot move now")
            this.isMoving = false
            return
        }
        
        try {
            await this.contractSpine(0.5, 0.8 * this.length / 10 * this.thickness / 12)
            await this.releaseSpine(0.8 * this.length / 10)
        } catch {
            
        }
        this.isMoving = false
    }

    turnAround = async () => {
        if (!this.isOnSolidGround) {
            // console.warn("Catterpillar is not touching solid ground, cannot turn around now")
            return
        }
        this.isTurning = true
        
        if (this.isPointingLeft()) {
            await this.standUp(90, 1 * this.length / 10)
        } else {
            await this.standUp(-90, 1 * this.length / 10)
        }

        await this.releaseStance()
        this.isTurning = false
    }

    say = async (text: string) => {
        if (this.isDead) {
            return
        }
        this.isTalking = true

        if (this.speechBubble) {
            this.speechBubble.destroy()
            this.speechBubble = undefined
        }


        if (!this.speechBubble) {
            this.speechBubble = new SpeechBubble(this.world,{
                x: this.head.x,
                y: this.head.y - this.thickness,
                text: text
            })

            return this.speechBubble.updateText(text, 80).then(() => {
                this.isTalking = false
            })
        }
    }

    pin(bodyPart: BodyPart, pinPos: { x: number, y: number, name?: string }) : Matter.Constraint {
        // Create constraint
        let label = `pinConstraint,${bodyPart.body.id}`
        if (pinPos.name) {
            label = `pinConstraint,${pinPos.name},${bodyPart.body.id}`
        }
        const pinConstraint = Matter.Constraint.create({
            bodyA: bodyPart.body,
            pointB: { x: pinPos.x, y: pinPos.y },
            length: 0,
            stiffness: 0.02,
            damping: 1,
            label,
            render: {
                visible: this.dev,
                strokeStyle: "blue",
                type: "line",
            }
        })
        Matter.Composite.add(this.composite, pinConstraint)
        this.pins.push(pinConstraint)
        return pinConstraint
    }

    unpin(pinConstraint:  Matter.Constraint) {
       
        if (pinConstraint) {
            Matter.Composite.remove(this.composite, pinConstraint)
        }

        this.pins = this.pins.filter(pin => pin !== pinConstraint)
    }

    emote(state: Emote, duration = 1) {
        if (!state){
            throw new Error("Catterpillar.emote: state is required")
        }

        if (state === "happy") {
            this.mouth.moveToState("🙂", duration)
        } else if (state === "sad") {
            this.mouth.moveToState("🙁", duration)
        } else if (state === "kiss") {
            this.mouth.moveToState("😚", .5)
            setTimeout(() => {
                if (this.isPointingLeft()) {
                    this.rightEye.blink(1)
                } else {
                    this.leftEye.blink(1)
                }
            }, 100)
        } else if (state === "surprised") {
            this.mouth.moveToState("😮", duration)
        } else if (state === "hmm") {
            this.mouth.moveToState("😐", duration)
            // Mo
        }
    }

    destroy() { 
        this.isDestroyed = true
        if (this.contraction) { this.#removeContraction() }
        if (this.blinkTimeout) { clearTimeout(this.blinkTimeout) }
        if (this.scared.timeout) { clearTimeout(this.scared.timeout) }
        if (this.scared.timeoutAction) { clearTimeout(this.scared.timeoutAction) }
        if (this.leftEye) { this.leftEye.destroy() }
        if (this.rightEye) { this.rightEye.destroy() }
        if (this.mouth) { this.mouth.destroy() }    
        if (this.speechBubble) {this.speechBubble.destroy() }
        Matter.Composite.remove(this.world, this.composite)
    }
}

export default Catterpillar