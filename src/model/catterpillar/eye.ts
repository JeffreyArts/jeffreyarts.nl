// import Paper from "paper"
import gsap from "gsap"
import { Point } from "@/model/physics/path"

export type EyeOptions = {
    ref: {
        x: number,
        y: number,
    }
    offset?: {
        x: number,
        y: number,
    }
    width?: number,
    height?: number,
}

export class Eye  {
    x: number
    y: number
    ref: {
        x: number
        y: number
    }
    offset: {
        x: number
        y: number
    }
    id: string = crypto.randomUUID()
    width: number
    height: number
    pupil: Point
    pupilOffset: { x: number, y: number } = { x: 0, y: 0 }
    lid: Array<Point>
    isFollowing: gsap.core.Tween | null = null
    isLooking: gsap.core.Tween | null = null
    isDestroyed: boolean = false
    disableBlink: boolean = false
   
    target: { x: number, y: number } | null = null
    
    constructor (
        options: EyeOptions
    ) {
        this.x = options.ref.x
        this.y = options.ref.y
        
        this.ref = options.ref
        this.offset = options.offset ? options.offset : { x: 0, y: 0 }

        this.width = options.width ? options.width : 8
        this.height = options.height ? options.height : 8
        this.pupil = new Point(this.ref.x, this.ref.y)

        this.lid = [
            new Point(this.width * 0,   this.height * 0.5),
            new Point(this.width * 0.5, this.height * 0),
            new Point(this.width * 1,   this.height * 0.5),
            new Point(this.width * 0.5, this.height * 1),
        ]
        
        requestAnimationFrame(this.#loop.bind(this))
    }

    #loop() {
        if (this.isDestroyed) {
            return
        }

        this.x = this.ref.x + this.offset.x 
        this.y = this.ref.y + this.offset.y

        this.pupil.x = this.x + this.pupilOffset.x + this.width / 2
        this.pupil.y = this.y + this.pupilOffset.y + this.height / 2
        
        requestAnimationFrame(this.#loop.bind(this))
    }

    followObject(target?: { x: number, y: number }) {
        if (this.isDestroyed) {
            return
        }

        if (typeof target === "object") {
            this.target = target
        }

        if (this.isFollowing) {
            this.isFollowing.kill()
        }

        
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x)
        const distance = Math.min( Math.hypot(this.target.x - this.x, this.target.y - this.y), 10)
        
        this.isFollowing = this.look(angle * (180 / Math.PI), distance)

        requestAnimationFrame(this.followObject.bind(this))
    }

    lookAt(target: { x: number, y: number }, duration?: number) {
        if (!target) {
            return
        }
        
        const angle = Math.atan2(target.y - this.y, target.x - this.x)
        const distance = Math.min( Math.hypot(target.x - this.x, target.y - this.y), 10)
        
        if (this.isLooking) {
            this.isLooking.kill()
        }

        this.isLooking = this.look(angle * (180 / Math.PI), distance, duration)
    }

    // angle in degrees
    // distance in pixels
    // duration in seconds
    look(angle: number, distance?: number, duration?: number) {
        // Make sure distance does not exceed width/height limits
        if (!distance) {
            distance = Math.min(this.width / 4, this.height / 4) - 1
        }
        distance = Math.min(distance, Math.min(this.width / 4, this.height / 4)) - 1

        const rad = angle * (Math.PI / 180)
        const x = Math.cos(rad) * distance
        const y = Math.sin(rad) * distance

        return gsap.to(this.pupilOffset, {
            x: x,
            y: y,
            duration: duration ? duration : 0.2,
            ease: "power2.out",
            onComplete: () => {
                this.isFollowing = null
            }
        })
    }
    
    lookLeft(distance?: number, duration?: number) {
        this.look(180, distance, duration)
    }

    lookRight(distance?: number, duration?: number) {
        this.look(0, distance, duration)
    }

    lookUp(distance?: number, duration?: number) {
        this.look(270, distance, duration)
    }

    lookDown(distance?: number, duration?: number) {
        this.look(90, distance, duration)
    }

    close(duration = .4) {
        return new Promise<void>(resolve => {
            const ease = "power2.out"
            gsap.to(this.lid[1], {
                y: this.height / 2,
                duration,
                ease,
            })
            gsap.to(this.lid[3], {
                y: this.height / 2,
                duration,
                ease,
                onComplete: () => {
                    resolve()
                }
            })
        })
    }

    pinch(duration = .4) {
        return new Promise<void>(resolve => {
            this.disableBlink = true
            const ease = "power2.out"
            gsap.to(this.lid[1], {
                y: this.height * .3,
                duration,
                ease,
            })
            gsap.to(this.lid[3], {
                y: this.height - this.height * .3,
                duration,
                ease,
                onComplete: () => {
                    resolve()
                }
            })
        })
    }

    open(duration = .2) {
        return new Promise<void>(resolve => {
            this.disableBlink = false
            
            const ease = "power2.out"
            gsap.to(this.lid[1], {
                y: 0,
                duration,
                ease,
            })
            gsap.to(this.lid[3], {
                y: this.height,
                duration,
                ease,
                onComplete: () => {
                    resolve()
                }
            })
        })
    }

    blink(duration = .4) {
        return new Promise<void>(async resolve => {
            if (this.disableBlink) {
                return resolve()
            }
            await this.close(duration / 2)
            await this.open(duration / 2)
            resolve()
        })
    }

    destroy() {
        if (this.isFollowing) { this.isFollowing.kill() }
        if (this.isLooking) { this.isLooking.kill() }
        this.isDestroyed = true

        for (const lidPoint of this.lid) {
            gsap.killTweensOf(lidPoint) 
        }

        this.target = null
        this.pupil = null
        this.ref = null
        this.offset = null
    }
}

export default Eye