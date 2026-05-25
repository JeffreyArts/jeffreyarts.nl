import { defineStore } from "pinia"
import { MatterController } from "@/model/physics/controller"
import { type IDBPDatabase } from "idb"

import type Story from "@/stories/_base"

import pettingStory from "@/stories/passive/petting"
import wallSlamStory from "@/stories/passive/wall-slam"
import MoveTowardsMouseStory from "@/stories/passive/move-towards-mouse"

import { type IdentityField } from "@/model/catterpillar/identity"
import useDatabaseStore from "@/stores/database"
import BlocksStory from "@/stories/passive//blocks"


export type DBStory =  {
    id: number;
    wurmpjeId: number;
    name: string;
    created: number; // timestamp
    cooldown: number | undefined; // in hours
    details: { [key: string]: string | number | boolean | object | undefined | Array< string | number | boolean | object | undefined > };
}

export type activeStory = {
    id: number;
    name: string;
    wurmpjeId: number;
    instance: Story | InstanceType<typeof Story>;
    created: number; // timestamp
    cooldown: number | undefined; // in hours
    details: { [key: string]: string | number | boolean | object | undefined | Array< string | number | boolean | object | undefined > };
}

const story = defineStore("story", {
    state: () => ({
        all: [] as Array<{ name: string, instance:  new (controller: MatterController, temp?: boolean) => Story }>,
        controller: undefined as MatterController | undefined,
        identity: undefined as IdentityField | undefined,
        activeStories: [] as activeStory[],
        availableStories: [],
        db: undefined as IDBPDatabase | undefined,
        initialised: undefined as Promise<boolean> | undefined,
        isInitializing: false,
        conditionalStories: [] as Array<{ name: string, instance: typeof Story, priority: "low" | "medium" | "high" }>,

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
                
                // ‼️ Do not forget that you will still need to activate the stories in your controller ‼️ 
                // Passive stories, always active
                this.addStory("wall-slam", wallSlamStory) 
                this.addStory("petting", pettingStory) 
                this.addStory("move-towards-mouse", MoveTowardsMouseStory) 
                this.addStory("blocks", BlocksStory) 

                // Info
                console.info("Story database initialized")
                resolve(true)
            })
        },
        
        addStory(name: string, storyInstance: typeof Story) {
            this.all.push({ name, instance: storyInstance })
        },
        
        async updateConditionalStories() {
            this.conditionalStories = []
            const promises = [] as Array<() => Promise<void>>
            console.info("")
            console.info("=== Checking conditions for conditional stories ===")
            this.all.forEach(async story => {
                promises.push(async () => {
                    if (!this.controller) return
                    
                    const tempInstance = new story.instance(this.controller as MatterController, true)
                    if (tempInstance.type === "conditional") {
                        const conditionMet = await tempInstance.checkCondition()
                        if (conditionMet) {
                            this.conditionalStories.push({ name: story.name, instance: story.instance, priority: tempInstance.priority  })
                        }
                    }
                    tempInstance.destroy()
                })
            })
            
            await Promise.all(promises.map(p => p()))

            console.info("===================================================")
            console.info("")

            // Sort this.conditionalStories by priority high to low
            this.conditionalStories.sort((a, b) => {
                const priorityMap = { "high": 3, "medium": 2, "low": 1 }
                const aPriority = priorityMap[a.priority] || 1
                const bPriority = priorityMap[b.priority] || 1
                return bPriority - aPriority
            })

            console.info("=== Available conditional stories ===")
            if (this.conditionalStories.length === 0) {
                console.info("- None")
            }
            this.conditionalStories.forEach(story => {
                console.info(`- ${story.name} (priority: ${story.priority})`)
            })
            console.info("=====================================")
            console.info("")
        },

        async getLatestDatabaseEntry(name: string) {
            const wurmpjeId = this.identity?.id

            if (!this.db) {
                throw new Error("Database not initialized")
            }
            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }
            
            const tx = this.db.transaction("stories", "readonly")
            const store = tx.objectStore("stories")
            const index = store.index("wurmpjeId")
            const stories = await index.getAll(IDBKeyRange.only(wurmpjeId))
            const storyDB = stories.find(s => s.name === name) as DBStory
            
            // await tx.done

            return storyDB
        },

        setController(controller: MatterController) {
            this.controller = controller
        },

        setIdentity(identity: IdentityField) {
            this.identity = identity
        },

        async setActiveStory(name: string) {
            const story = this.all.find(s => s.name === name)
            const wurmpjeId = this.identity?.id
            let skip = false

            if (!story) {
                throw new Error(`Story with name ${name} not found`)
            }

            if (!this.db) {
                throw new Error("Database not initialized")
            }
            
            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }

            // Load story details from dbs (based on wurmpjeId and name)
            const tx = this.db.transaction("stories", "readwrite")
            const store = tx.objectStore("stories")
            const index = store.index("wurmpjeId")
            const stories = await index.getAll(IDBKeyRange.only(wurmpjeId))
            let storyDB = stories.find(s => {
                if (s.name === name) {
                    const cooldownDate = new Date(s.created + s.cooldown)
                    const now = new Date()
                    if (now < cooldownDate) {
                        console.warn(`Story ${name} is on cooldown until ${cooldownDate.toISOString()}`)
                        skip = true
                        return null
                    }
                    return s
                }
                return null
            })

            if (skip) {
                return null
            }
            
            if (!storyDB) { 
                // Add new story to db
                storyDB = {
                    wurmpjeId,
                    created: Date.now(),
                    cooldown: undefined,
                    name,
                    details: {},
                }
                store.add(storyDB)
                await tx.done
            } else if (storyDB.cooldown) {
                // Create a new story, since the cooldown has passed
                storyDB = {
                    wurmpjeId,
                    created: Date.now(),
                    cooldown: undefined,
                    name,
                    details: {},
                }
                store.add(storyDB)
                await tx.done
            }

            // First add object to activeStories array, so the instance has access to it during construction 
            const newStory = {
                id: storyDB.id,
                created: storyDB.created,
                cooldown: storyDB.cooldown,
                name: storyDB.name,
                wurmpjeId: storyDB.wurmpjeId,
                details: storyDB.details,
            } as activeStory
            this.activeStories.push(newStory)
            
            newStory.instance = new story.instance(this.controller as MatterController)
            
            
            return newStory

        },

        getActiveStory(name: string) : activeStory | undefined {
            const wurmpjeId = this.identity?.id

            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }

            return this.activeStories.find(s => s.name === name && s.wurmpjeId === wurmpjeId) as activeStory | undefined
        },

        removeActiveStory(name: string) {
            let wurmpjeId = this.identity?.id

            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }

            let activeStory = this.activeStories.find(s => s.name === name && s.wurmpjeId === wurmpjeId)
            // If not found, try with wurmpjeId 1 (default)
            if (!activeStory) { wurmpjeId = 1 }
            activeStory = this.activeStories.find(s => s.name === name && s.wurmpjeId === wurmpjeId)

            if (activeStory) {
                activeStory.instance.destroy()
                this.activeStories = this.activeStories.filter(s => s.name !== name || s.wurmpjeId !== wurmpjeId)
            }
        },

        updateStoryDetails(name: string, details: { [key: string]: string | number | boolean | object | undefined | Array< string | number | boolean | object | undefined > }) {
            const wurmpjeId = this.identity?.id

            if (!this.db) {
                throw new Error("Database not initialized")
            }

            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }
            
            const tx = this.db.transaction("stories", "readwrite")
            const store = tx.objectStore("stories")
            const index = store.index("wurmpjeId")
            index.getAll(IDBKeyRange.only(wurmpjeId)).then((stories) => {
                const storyDB = stories.find(s => s.name === name)
                if (storyDB) {
                    storyDB.details = { ...storyDB.details, ...details }
                    store.put(storyDB)
                }
            })
            return tx.done
        },

        async updateStory(name: string, dbStory: DBStory) {
            const wurmpjeId = this.identity?.id

            if (!this.db) {
                throw new Error("Database not initialized")
            }

            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }
            
            const tx = this.db.transaction("stories", "readwrite")
            const store = tx.objectStore("stories")
            const index = store.index("wurmpjeId")
            const stories = await index.getAll(IDBKeyRange.only(wurmpjeId))
            const storyDB = stories.find(s => s.name === name)
            if (storyDB) {
                store.put({ ...storyDB, ...dbStory })
            }
            
            return tx.done
        },

        async getLatestStoryFromDatabase(name: string) {
            const wurmpjeId = this.identity?.id

            if (!this.db) {
                throw new Error("Database not initialized")
            }
            if (!wurmpjeId) {
                throw new Error("No wurmpjeId set in identity store")
            }
            
            const tx = this.db.transaction("stories", "readonly")
            const store = tx.objectStore("stories")
            const index = store.index("wurmpjeId")
            const stories = await index.getAll(IDBKeyRange.only(wurmpjeId))
            if (!stories || stories.length === 0) {
                return null
            }
            stories.sort((a, b) => b.id - a.id)
            const storyDB = stories.find(s => s.name === name)
            return storyDB
        },

        // Used to mark story as completed and set cooldown, used for conditional stories
        async completeStory(name: string) {
            const activeStory = this.getActiveStory(name)
            if (!activeStory) {
                return
            }

            const storyDB = await this.getLatestStoryFromDatabase(name)
            if (storyDB) {
                storyDB.cooldown = activeStory.instance.cooldown
                await this.updateStory(name, storyDB)
            }
            
            this.killStory(name)
            
            return storyDB
        },
         
        // Used for stories that can be told multiple times (no cooldown)
        killStory(name: string) {
            this.removeActiveStory(name)
        },   
    },
    getters: {
    }
})

export default story