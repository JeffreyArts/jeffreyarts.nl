// import Paper from "paper"
import gsap from "gsap"
import { Point } from "@/model/physics/path"

export type MouthOptions = {
    ref: { 
        x: number, 
        y: number
    }
    offset?: {
        x: number,
        y: number
    },
    size?: number,
    scale?: number
}

export type MouthState = "😮" | "🙂" | "😐" | "🙁" | "😚" | "😙" | "😗"

export type MouthPoints = {
    topLip: {
        left: {
            x: number,
            y: number
        },
        center: {
            x: number,
            y: number
        },
        right: {
            x: number,
            y: number
        },
    },
    bottomLip: {
        left: {
            x: number,
            y: number
        },
        center: {
            x: number,
            y: number
        },
        right: {
            x: number,
            y: number
        },
    }
}


type transiteOptions = {
    duration?: number,
    ease?: gsap.EaseString | gsap.EaseFunction,
    delay?: number,
}

export class Mouth  {
    x: number
    y: number
    ref: { 
        x: number, 
        y: number
    }
    offset: {
        x: number
        y: number
    }
    coordinates: Array<Point>
    topLip: {
        left: Point,
        center: Point,
        right: Point,
    }
    bottomLip: {
        left: Point,
        center: Point,
        right: Point,
    }
    id: string = crypto.randomUUID()
    #animation: null | gsap.TweenTarget
    #inTransition: boolean
    isDestroyed: boolean = false
    scale: number
    size: number
    state: MouthState

    constructor (
        options: MouthOptions
    ) {
        this.x = 0
        this.y = 0
        this.ref = options.ref

        this.offset = {
            x: 0,
            y: 0
        }
        this.size = options.size ? options.size : 16
        this.scale = options.scale ? options.scale : 1
        this.#inTransition = false


        if (typeof options.offset?.x === "number") {
            this.offset.x = options.offset.x
        }
        
        if (typeof options.offset?.y === "number") {
            this.offset.y = options.offset.y
        }


        this.coordinates = [
            new Point(this.size / 2,  0),
            new Point(0 ,  0),
            new Point(-this.size / 2,  0),
            new Point(-this.size / 2,  0),
            new Point(0,  0),
            new Point(this.size / 2,  0),
            // new Coord(this.size / 2,  0),// This is going to be removed by calling the closePath method
        ]
        // this.paper.closePath()

        this.#animation = null

        this.bottomLip = {
            left:  this.coordinates[0],
            center:  this.coordinates[1],
            right:  this.coordinates[2],
        }

        this.topLip = {
            left:  this.coordinates[5],
            center:  this.coordinates[4],
            right:  this.coordinates[3],
        }
        
        this.state = "🙂"
        this.getSmilePosition()
        this.#updatePosition()
        requestAnimationFrame(this.#loop.bind(this))

    }

    #loop() {
        if (this.isDestroyed) {
            return
        }
        this.x = this.ref.x + this.offset.x 
        this.y = this.ref.y + this.offset.y
        requestAnimationFrame(this.#loop.bind(this))
    }

    #updatePosition() {
        if (this.#inTransition) {
            return
        }

        if (this.state === "🙂") {
            this.#updateState(this.getSmilePosition())
        }
        
        if (this.state === "😮") {
            this.#updateState(this.getOpenPosition())
        }

        if (this.state === "😐") {
            this.#updateState(this.getShockedPosition())
        }

        if (this.state === "🙁") {
            this.#updateState(this.getSadPosition())
        }
        if (this.state === "😚" || this.state === "😙" || this.state === "😗") {
            this.#updateState(this.getKissPosition())
        }
    }

    #updateState(newState: {
        topLip: {
            left: { x: number, y: number },
            center: { x: number, y: number },
            right: { x: number, y: number }
        },
        bottomLip: {
            left: { x: number, y: number },
            center: { x: number, y: number },
            right: { x: number, y: number }
        }
    }) {
        
        // Top lip
        this.topLip.left.x      = newState.topLip.left.x
        this.topLip.left.y      = newState.topLip.left.y

        this.topLip.center.x    = newState.topLip.center.x
        this.topLip.center.y    = newState.topLip.center.y
        
        this.topLip.right.x     = newState.topLip.right.x
        this.topLip.right.y     = newState.topLip.right.y

        // Bottom lip
        this.bottomLip.left.x   = newState.bottomLip.left.x
        this.bottomLip.left.y   = newState.bottomLip.left.y

        this.bottomLip.center.x = newState.bottomLip.center.x
        this.bottomLip.center.y = newState.bottomLip.center.y
        
        this.bottomLip.right.x  = newState.bottomLip.right.x
        this.bottomLip.right.y  = newState.bottomLip.right.y

        // this.paper.smooth({ type: "continuous" })
    }

    #transite(from: MouthPoints, to: MouthPoints, options = { duration: .64, ease: "sine.inOut", delay: 0 } as transiteOptions) {
        
        if (!options.delay)     { options.delay = 0 }
        if (!options.duration)  { options.duration = .64 }
        if (!options.ease)      { options.ease = "sine.inOut" }

        this.#inTransition = false

        return new Promise(resolve => {
            // Some data re-arranging so GSAP can process it correctly
            const gsapFrom = {
                "topLip.left.x": from.topLip.left.x,
                "topLip.left.y": from.topLip.left.y,
                "topLip.center.x": from.topLip.center.x,
                "topLip.center.y": from.topLip.center.y,
                "topLip.right.x": from.topLip.right.x,
                "topLip.right.y": from.topLip.right.y,
                "bottomLip.left.x": from.bottomLip.left.x,
                "bottomLip.left.y": from.bottomLip.left.y,
                "bottomLip.center.x": from.bottomLip.center.x,
                "bottomLip.center.y": from.bottomLip.center.y,
                "bottomLip.right.x": from.bottomLip.right.x,
                "bottomLip.right.y": from.bottomLip.right.y,
            }
        
            this.#animation = gsap.to(gsapFrom
                , {
                    "topLip.left.x": to.topLip.left.x * this.scale,
                    "topLip.left.y": to.topLip.left.y * this.scale,
                    "topLip.center.x": to.topLip.center.x * this.scale,
                    "topLip.center.y": to.topLip.center.y * this.scale,
                    "topLip.right.x": to.topLip.right.x * this.scale,
                    "topLip.right.y": to.topLip.right.y * this.scale,
                    "bottomLip.left.x": to.bottomLip.left.x * this.scale,
                    "bottomLip.left.y": to.bottomLip.left.y * this.scale,
                    "bottomLip.center.x": to.bottomLip.center.x * this.scale,
                    "bottomLip.center.y": to.bottomLip.center.y * this.scale,
                    "bottomLip.right.x": to.bottomLip.right.x * this.scale,
                    "bottomLip.right.y": to.bottomLip.right.y * this.scale,
                    duration: options.duration,
                    ease: options.ease,
                    delay: options.delay,
                    onUpdate: () => { 
                        if (!this.#animation) {
                            return
                        }
                        this.#updateState({
                            topLip: {
                                left: {
                                    x: gsapFrom["topLip.left.x"],
                                    y: gsapFrom["topLip.left.y"],
                                },
                                center: {
                                    x: gsapFrom["topLip.center.x"],
                                    y: gsapFrom["topLip.center.y"],
                                },
                                right: {
                                    x: gsapFrom["topLip.right.x"],
                                    y: gsapFrom["topLip.right.y"],
                                }
                            },
                            bottomLip: {
                                left: {
                                    x: gsapFrom["bottomLip.left.x"],
                                    y: gsapFrom["bottomLip.left.y"],
                                },
                                center: {
                                    x: gsapFrom["bottomLip.center.x"],
                                    y: gsapFrom["bottomLip.center.y"],
                                },
                                right: {
                                    x: gsapFrom["bottomLip.right.x"],
                                    y: gsapFrom["bottomLip.right.y"],
                                }
                            }
                        })
                    },
                    onComplete: () => {
                        
                        resolve(true)
                        this.#inTransition = false
                    }
                })
        })
    }

    moveToState = (state: MouthState | MouthPoints, duration = .64) => {
        // duration = amount of seconds that the switch take
        // Don't switch state if it is the same state
        
        if (this.#inTransition && this.#animation) {
            gsap.killTweensOf(this.#animation)
        }

        // if (state == this.state) {
        //     return
        // }
        this.#inTransition = true
        // const progress = { perc: 0 }
        let ease = "sine.inOut"
        if (state === "😮") {
            ease = "elastic.out(1,0.5)"
        }

        const from = { topLip: this.topLip, bottomLip: this.bottomLip }
        // const from = this.#getPosition(this.state)
        
        let to = state as MouthPoints
        if (typeof state === "string") {
            to = this.#getPosition(state)
        } 

        this.#transite(from, to, { duration, ease, delay: 0 }).then(() => {
            if (typeof state === "string") {
                this.state = state
                if (state === "😚" || state === "😙" || state === "😗")  {
                    this.moveToState("🙂", .4)
                }
            }
        })
    }

    animateState(
        finalState: MouthPoints, 
        perc: number
    ) {
        if (!this.#inTransition) {
            return
        }

        // Top lip
        this.topLip.left.x = this.x + (finalState.topLip.left.x * perc)
        this.topLip.left.y = this.y + (finalState.topLip.left.y * perc)
        
        this.topLip.center.x = this.x + (finalState.topLip.center.x * perc)
        this.topLip.center.y = this.y + (finalState.topLip.center.y * perc)

        this.topLip.right.x = this.x + (finalState.topLip.right.x * perc)
        this.topLip.right.y = this.y + (finalState.topLip.right.y * perc)

        // Bottom lip
        this.bottomLip.left.x = this.x + (finalState.bottomLip.left.x * perc)
        this.bottomLip.left.y = this.y + (finalState.bottomLip.left.y * perc)
        
        this.bottomLip.center.x = this.x + (finalState.bottomLip.center.x * perc)
        this.bottomLip.center.y = this.y + (finalState.bottomLip.center.y * perc)

        this.bottomLip.right.x = this.x + (finalState.bottomLip.right.x * perc)
        this.bottomLip.right.y = this.y + (finalState.bottomLip.right.y * perc)
                
        // this.paper.smooth({ type: "continuous" })
    }
    
    #getPosition(state?: MouthState) : MouthPoints{
        if (!state) {
            state = this.state
        }
        if (state === "😮") {
            return this.getOpenPosition()
        } else if (state === "😐") {
            return this.getShockedPosition()
        } else if (state === "🙂") {
            return this.getSmilePosition()
        } else if (state === "🙁") {
            return this.getSadPosition()
        } else if (state === "😚") {
            return this.getKissPosition()
        } else if (state === "😙") {
            return this.getKissPosition()
        } else if (state === "😗") {
            return this.getKissPosition()
        }  else {
            throw new Error("Invalid state input")
        }
    }

    getOpenPosition() {
        return {
            topLip: {
                left: {
                    x: - 4,
                    y: - 0.5
                },
                center: {
                    x: 0,
                    y: - 2
                },
                right: {
                    x: 4,
                    y: - 0.5
                }
            },
            bottomLip: {
                left: {
                    x: -4,
                    y: 5
                },
                center: {
                    x: 0,
                    y: 6
                },
                right: {
                    x: 4, 
                    y: 5
                }
            }
        }
    }

    getSmilePosition() {
        return {
            topLip: {
                left: {
                    x: -4.5,
                    y: -.25
                },
                center: {
                    x: 0,
                    y: 1
                },
                right: {
                    x: 4.5,
                    y: -0.25
                }
            },
            bottomLip: {
                left: {
                    x: -6,
                    y: 0
                },
                center: {
                    x: 0, 
                    y: 2.5
                },
                right: {
                    x: 6,
                    y: 0
                }
            }
        }
    }
    
    getSadPosition() {
        return {
            topLip: {
                left: {
                    x: -5,
                    y: 1.5
                },
                center: {
                    x: 0,
                    y: -0.5
                },
                right: {
                    x: 5,
                    y: 1.5
                }
            },
            bottomLip: {
                left: {
                    x: -5,
                    y: 2.5
                },
                center: {
                    x: 0,
                    y: 1
                },
                right: {
                    x: 5,
                    y: 2.5
                }
            },
        }
    }

    getExtremeSadPosition() {
        return {
            topLip: {
                left: {
                    x: -5,
                    y: 2
                },
                center: {
                    x: 0,
                    y: -1
                },
                right: {
                    x: 5,
                    y: 2
                }
            },
            bottomLip: {
                left: {
                    x: - 4,
                    y: 2.5
                },
                center: {
                    x: 0, 
                    y: 1
                },
                right: {
                    x: 4,
                    y: 2.5
                }
            }
        }
    }

    getShockedPosition() {
        return {
            topLip: {
                left: {
                    x: -5,
                    y: 1.5
                },
                center: {
                    x: 0,
                    y: 1
                },
                right: {
                    x: 5,
                    y: 1.5
                }
            },
            bottomLip: {
                left: {
                    x: -5,
                    y: 2.75
                },
                center: {
                    x: 0,
                    y: 3
                },
                right: {
                    x: 5,
                    y: 2.75
                }
            },
        }
    }

    getKissPosition() {
        return {
            topLip: {
                left: {
                    x: -3,
                    y: -0.5
                },
                center: {
                    x: 0,
                    y: -3
                },
                right: {
                    x: 3,
                    y: -0.5
                }
            },
            bottomLip: {
                left: {
                    x: -3,
                    y: 1
                },
                center: {
                    x: 0,
                    y: 3
                },
                right: {
                    x: 3,
                    y: 1
                }
            },
        }
    }

    chew = async (amount = 5, isFirst = true) => {

        if (this.#inTransition) {
            return
        }

        const mouthClosedPositions = [
            {
                topLip: {
                    left: {
                        x: -2.44,
                        y: 0.15
                    },
                    center: {
                        x: -0.08,
                        y: -0.49
                    },
                    right: {
                        x: 2.71,
                        y: 0.01
                    }
                },
                bottomLip: {
                    left: {
                        x: -2.51,
                        y: 2.22
                    },
                    center: {
                        x: -0.08,
                        y: 3.36
                    },
                    right: {
                        x: 3.06,
                        y: 2.29
                    }
                },
            },
            {
                topLip: {
                    left: {
                        x: -4.15,
                        y: 0.36
                    },
                    center: {
                        x: -0.15,
                        y: 0.15
                    },
                    right: {
                        x: 3.42,
                        y: 0.29
                    }
                },
                bottomLip: {
                    left: {
                        x: -4.01,
                        y: 1.94
                    },
                    center: {
                        x: -0.08,
                        y: 2.65
                    },
                    right: {
                        x: 3.71,
                        y: 1.94
                    }
                },
            }
        ]

        const mouthOpenPositions = [    
            {
                topLip: {
                    left: {
                        x: -4,
                        y: -0.5
                    },
                    center: {
                        x: 0,
                        y: -2
                    },
                    right: {
                        x: 4,
                        y: -0.5
                    }
                },
                bottomLip: {
                    left: {
                        x: -6.01,
                        y: 5.08
                    },
                    center: {
                        x: 0.14,
                        y: 8.51
                    },
                    right: {
                        x: 5.71,
                        y: 5.08
                    }
                },
            }
            // {
            //     topLip: {
            //         left: {
            //             x: -6.4,
            //             y: -6
            //         },
            //         center: {
            //             x: 0.5,
            //             y: -8.5
            //         },
            //         right: {
            //             x: 8.5,
            //             y: -6
            //         }
            //     },
            //     bottomLip: {
            //         left: {
            //             x: -8,
            //             y: 2
            //         },
            //         center: {
            //             x: 0,
            //             y: 7.8
            //         },
            //         right: {
            //             x: 9.5,
            //             y: 2.5
            //         }
            //     },
            // }
        ]

        const from = { topLip: this.topLip, bottomLip: this.bottomLip }
        let to: MouthPoints | undefined

        if (isFirst) {
            to = mouthOpenPositions[amount % mouthOpenPositions.length]
        } else {
            to = mouthClosedPositions[amount % mouthClosedPositions.length]
        }


        if (!to) {
            throw new Error("No to position for chew animation")
        }

        // Perform animation
        await this.#transite(from, to, { ease: "circ.inOut" })

        // trigger next chew animation
        if (amount > 0) {
            if (isFirst) {
                await this.chew(amount, false)
            } else {
                await this.chew(amount -1, false)
            }
        } else if (amount === 0) {
            this.moveToState(this.state)
        }
    }



    destroy = () => {
        this.isDestroyed = true

        this.#inTransition = false
        if (this.#animation) {
            gsap.killTweensOf(this.#animation)
        }
    }
}

export default Mouth