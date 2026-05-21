import { defineStore } from "pinia"
import ColorScheme from "@/assets/default-color-schemes"
import Identity, { type IdentityField } from "@/model/catterpillar/identity"
import Textures, { type textureInterface } from "@/assets/default-textures"
import { type IDBPDatabase } from "idb"
import useDatabaseStore from "@/stores/database"

export type DBIdentity =  {
    id: number;                 // 29-bit: 23 bits seconds/4 + 6 bits random
    name: string;               // max 16 chars, letters A-Z/a-z + space
    textureIndex: number;       // 0-1023
    colorSchemeIndex: number;   // 0-1023
    offset: number;             // 0-15
    gender: number;             // 0-1
    created: number;            // timestamp
    cooldown: number;           // timestamp
    death: number | undefined   // timestamp of death
    selectable: boolean
    origin: string              // encodedIdentity | "url" | "mom:ID,dad:ID"
    thickness: number           // 8-64
    length: number              // 5-18
    hunger?: number             // 0-100
    joy?: number                // 0-100
    love?: number               // 0-100
}


export type currentIdentity = {
    id: number
    name: string
    gender: number // 0-1
    primaryColor: string
    secondaryColor: string
    textureIndex: number;       // 0-1023
    colorSchemeIndex: number;   // 0-1023
    offset: number
    texture: textureInterface
    origin: string
    age: number,
    created: number,
    death: number | undefined
    length: number
    thickness: number
    cooldown: number
    hunger: number
    joy: number
    love: number
    defaultState?: "happy" | "sad" | "hmm"
}

const identity = defineStore("identity", {
    state: () => ({
        db: undefined as IDBPDatabase | undefined,
        current: undefined as currentIdentity | undefined,
        initialised: undefined as Promise<boolean> | undefined,
        isInitializing: false,
        isInitialized: false,

    }),
    actions: {
        init() {

            return this.initialised = new Promise(async (resolve) => {
                if (this.isInitializing) {
                    return
                }
                this.isInitializing = true
                
                const databaseStore = useDatabaseStore()
                this.db = await databaseStore.init()

                console.info("Identity database initialized")
                
                // Try to load identity from local storage                
                await this.loadIdentityFromLocalStorage()
                this.watchForStateChanges()
                this.setDefaultEmotionalState()
                this.checkDeathConditions()
                resolve(true)
                this.isInitialized = true 
            })
        },
        async loadIdentityFromUrlParam() {
            const urlParams = new URLSearchParams(window.location.search)
            const identityParam = urlParams.get("i")
                    
            if (!identityParam) {
                console.warn("No identity found in URL parameter ?i")
                return
            }
                
            if (identityParam) {
                const identityModel = new Identity()
                const identity = identityModel.decode(identityParam)

                // Load all identities from database to check for duplicates
                const tx = this.db.transaction("identities", "readonly")
                const store = tx.objectStore("identities")

                const allIdentities = await store.getAll()
                if (allIdentities.length > 0) {
                    return
                }
                
                this.saveIdentityToDatabase(identity, { origin: "url", selectable: true })
                this.selectIdentity(identity.id)
            }
        },
        async loadIdentityFromLocalStorage() {
            const identityId = localStorage.getItem("selectedIdentity")
            if (!identityId) {
                console.warn("No selected identity found in local storage")
                return
            }

            // const identity = await this.findIdentityInDatabase("id", identityId ? parseInt(identityId) : 0) as DBIdentity
            const identity = await this.selectIdentity(parseInt(identityId))
            
            if (!identity) {
                localStorage.removeItem("selectedIdentity")
                console.warn(`Identity with id ${identityId} not found in database`)
            }
            
            return identity
        },
        calculateAgeInDays(birthDate: string | number, deathDate: string | number | null): number {
            const birth = new Date(birthDate)
            let lastDay = new Date()
            if (deathDate) {
                lastDay = new Date(deathDate)
            }
            const diffTime = Math.abs(lastDay.getTime() - birth.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
            return diffDays
        },
        watchForStateChanges() {
            this.$subscribe(({ events }) => {
                
                const stateTypes = ["hunger", "joy", "love"]
                if (Array.isArray(events)) {
                    for (const event of events) {
                        if (stateTypes.includes(event.key)) {
                            this.checkDeathConditions()
                            this.setDefaultEmotionalState()
                        }
                    }
                } else {
                    if (stateTypes.includes(events.key)) {
                        this.checkDeathConditions()
                        this.setDefaultEmotionalState()
                    }
                }
                
            })
        },
        checkDeathConditions() {
            if (!this.current) {
                return
            }

            if (this.current.hunger <= 0 || this.current.love <= 0) {
                this.died(this.current)
            }
        },
        died(identity: currentIdentity) {
            const event = new CustomEvent("wurmpje-died", { detail: { identity: this.current }})
            window.dispatchEvent(event)
            
            identity.death = Date.now()
            this.updateIdentityInDatabase(identity.id, { death: identity.death })
        },
        // saveIdentityToLocalStorage() {
        //     const identityModel = new Identity()
        //     const identity = this.origin
        //     const identityString = identityModel.encode(identity)
        //     // Alleen birthdate toevoegen als er nog geen identity in localStorage is
        //     if (!localStorage.getItem("identity")) {    
        //         localStorage.setItem("birthDate", new Date().toISOString())
        //     }
        //     localStorage.setItem("identity", identityString)
        // },
        async breedWurmpje(parent1: DBIdentity, parent2: DBIdentity) {
            if (!parent1 || !parent2) {
                throw new Error("Both parents must be provided for breeding")
            }

            const maxLength = Math.min(parent1.length, parent2.length)
            const maxThickness = Math.min(parent1.thickness, parent2.thickness)

            const thickness = Math.floor((maxThickness - 8) * Math.random() + 8)
            const length = Math.floor((maxLength - 3) * Math.random() + 3)
            const coinFlip = Math.random() < 0.5

            const identity = new Identity()
            const newIdentity = {
                id: identity.generateId(),
                name: "temp",
                thickness,
                length,
                textureIndex: coinFlip ? parent1.textureIndex : parent2.textureIndex,
                colorSchemeIndex: coinFlip ? parent2.colorSchemeIndex : parent1.colorSchemeIndex,
                offset: Math.floor(Math.random() * 16),
                gender: Math.random() < 0.5 ? 0 : 1
            } as IdentityField

            newIdentity.name = this.getLatinName(newIdentity.colorSchemeIndex, newIdentity.textureIndex)
            let origin = "parents"
            if (parent1.gender === 1) {
                origin = `mom:${parent2.id},dad:${parent1.id}`
            } else {
                origin = `mom:${parent1.id},dad:${parent2.id}`
            }
            
            return await this.saveIdentityToDatabase(newIdentity, { origin, selectable: true, cooldownDays: 7 })
        },

        async getAllAliveIdentitiesFromDatabase(): Promise<DBIdentity[]> {
            if (!this.db) {
                throw new Error("Database not initialized") 
            }

            const tx = this.db.transaction("identities", "readonly")
            const store = tx.objectStore("identities")

            const allIdentities = await store.getAll() as DBIdentity[]
            return allIdentities.filter(identity => !identity.death)
        },
            
        async updateIdentityInDatabase(id: number, updates: Partial<DBIdentity>) {
            if (!this.db) {
                throw new Error("Database not initialized") 
            }

            const tx = this.db.transaction("identities", "readwrite")
            const store = tx.objectStore("identities")

            const identity = await store.get(id)
            if (!identity) {
                throw new Error(`Identity with id ${id} not found in database`)
            }

            const updatedIdentity = { ...identity, ...updates }
            store.put(updatedIdentity)
            return tx.done
        },
        async findIdentityInDatabase(key: string, value: string | number): Promise<DBIdentity | Array<DBIdentity> | undefined> {
            const tx = this.db.transaction("identities", "readonly")
            const store = tx.objectStore("identities")

            const allIdentities = await store.getAll()
            const foundIdentities = allIdentities.filter((identity) => identity[key as keyof DBIdentity] === value)
            if (foundIdentities.length === 0) {
                return undefined
            }
            if (foundIdentities.length === 1) {
                return foundIdentities[0]
            }
            return foundIdentities
        },
        async saveIdentityToDatabase(input: IdentityField | string, options : { 
            cooldownDays?: number,
            selectable?: boolean,
            origin: string 
        } ) {

            const { cooldownDays = 30 } = options
            const { selectable = false } = options
            const { origin } = options
            // const { thickness = Math.floor(Math.random()* 16 + 8) } = input
            // const { length = Math.floor(Math.random()* 5 + 5) } = input

            const identityField = typeof input === "string" ? new Identity().decode(input) : input
            
            if (!this.db) {
                throw new Error("Database not initialized") 
            }
            
            const tx = this.db.transaction("identities", "readwrite")
            const store = tx.objectStore("identities")
            const dbIdentity: DBIdentity = {
                ...identityField,
                cooldown: cooldownDays ? Date.now() + (cooldownDays * 24 * 60 * 60 * 1000) : 0,
                created: Date.now(),
                selectable,
                origin,
                death: undefined,
                hunger: 80,
                joy: 80,
                love: 80,
            }

            const id = await store.put(dbIdentity)
            return { ...dbIdentity, id }
        },
        preloadTextures() {
            const promises = [] as Promise<Response>[]
            if (!this.current) {
                return
            }
            const textureUrls = [] as string[]
            const texture = this.current.texture
            if (texture[360]) {
                textureUrls.push(`./bodyparts/360/${texture[360]}`)
            } else if (texture["top"]) {
                textureUrls.push(`./bodyparts/top/${texture["top"]}`)
            } else if (texture["bottom"]) {
                textureUrls.push(`./bodyparts/bottom/${texture["bottom"]}`)
            } else if (texture["vert"]) {
                textureUrls.push(`./bodyparts/vert/${texture["vert"]}`)
            }


            for (let index = 0; index < 8; index++) {
                for (const url of textureUrls) {
                    promises.push(fetch(`${url}/${index}.svg`))
                }
            }

            return Promise.all(promises)
        },
        convertDBIdentityToCurrentIdentity(identity: DBIdentity): currentIdentity {
            return {
                id: identity.id,
                name: identity.name,
                gender: identity.gender,
                primaryColor: ColorScheme[identity.colorSchemeIndex].colors[0],
                secondaryColor: ColorScheme[identity.colorSchemeIndex].colors[1],
                offset: identity.offset,
                texture: Textures[identity.textureIndex],
                origin: identity.origin,
                created: identity.created,
                age: this.calculateAgeInDays(identity.created, identity.death),
                death: identity.death,
                cooldown: identity.cooldown,
                textureIndex: identity.textureIndex,
                colorSchemeIndex: identity.colorSchemeIndex,
                length: identity.length,
                thickness: identity.thickness,
                hunger: identity.hunger,
                joy: identity.joy,
                love: identity.love,
            }   
        },
        async selectIdentity(id: number) {
            let identity: DBIdentity | undefined
            try {
                identity = await this.findIdentityInDatabase("id", id) as DBIdentity
            } catch (error) {
                console.error("Error selecting identity:", error)
                return undefined
            }

            this.current = undefined
            if (identity) {
                this.current = {
                    id: identity.id,
                    name: identity.name,
                    gender: identity.gender,
                    primaryColor: ColorScheme[identity.colorSchemeIndex].colors[0],
                    secondaryColor: ColorScheme[identity.colorSchemeIndex].colors[1],
                    offset: identity.offset,
                    texture: Textures[identity.textureIndex],
                    origin: identity.origin,
                    created: identity.created,
                    age: this.calculateAgeInDays(identity.created, identity.death),
                    death: identity.death,
                    cooldown: identity.cooldown,
                    textureIndex: identity.textureIndex,
                    colorSchemeIndex: identity.colorSchemeIndex,
                    length: identity.length,
                    thickness: identity.thickness,
                    hunger: identity.hunger,
                    joy: identity.joy,
                    love: identity.love,
                } 
            } else {
                console.warn(`Identity with id ${id} not found in database`)
                return undefined
            }

            localStorage.setItem("selectedIdentity", identity.id.toString())

            return this.current
        },
        setDefaultEmotionalState() {
            if (!this.current) {
                return
            }

            this.current.defaultState = "happy"

            if (this.current.hunger <= 40 || this.current.love <= 40) {
                this.current.defaultState = "hmm"
            }

            if (this.current.hunger <= 20 || this.current.love <= 20) {
                this.current.defaultState = "sad"
            }
        },
        totalColorSchemes() {
            return ColorScheme.length
        },
        totalTextures() {
            return Textures.length
        },
        getLatinName(colorSchemeIndex: number, textureIndex: number): string {

            const texture = Textures[textureIndex]
            const colorScheme = ColorScheme[colorSchemeIndex]

            if (!texture || !colorScheme) {
                return "undefinedius"
            }

            return `${texture.name} ${colorScheme.name}`
        }
    },
    getters: {
    }
})

export default identity