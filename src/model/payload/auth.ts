import { jwtDecode } from "jwt-decode"
import axios, { AxiosError, AxiosResponse, AxiosRequestConfig, AxiosInstance } from "axios"
import { CatterpillarOptions } from "@/model/catterpillar"
import UserModel from "./user"
import _ from "lodash"


export class AuthModel {
    self: UserModel | undefined
    baseUrl: string
    refreshTimeout: number |  ReturnType<typeof setTimeout>
    // refreshToken: string
    authToken: string
    axios: AxiosInstance
    catterpillarAdded: boolean

    constructor (baseUrl: string) {
        this.baseUrl = baseUrl
        this.refreshTimeout = 0
        this.authToken = localStorage.getItem("authToken") || ""
        this.catterpillarAdded = false

        this.axios = axios.create({
            withCredentials: true,
            baseURL: baseUrl
        })
        
        if (!this.validateAuthToken(this.authToken)) {
            localStorage.removeItem("authToken")
            this.logout()
        }

        if (localStorage.getItem("self")) {
            this.setSelf(JSON.parse(localStorage.getItem("self") || ""))
            // this.self = new UserModel({ ...JSON.parse(localStorage.getItem("self") || ""), self: true })
        }

        if (!this.self) {
            this.createAnonymousAccount()
        } else {
            if (this.self.defaultPassword && !this.self.verified) {
                this.authenticate({ email: this.self.email, password: this.self.defaultPassword }).catch(() => {
                    // Error handling when the user can not authenticate:

                    // Remove any old data if available
                    this.logout()

                    // Create new account
                    this.createAnonymousAccount()
                })
            } else {
                this.axios(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/me`).then((response) => {
                    if (response.data.user) {
                        this.setSelf(response.data.user, true)
                    } else {
                        this.self = undefined
                    }
                })
            }
        }
    }

    setSelf(userData: { [key:string]: any }, cleanDefaultPassword?: boolean) {

        const properties = ["id", "username", "email", "catterpillar", "defaultPassword", "verified"]
        
        // Check if user is anonymous
        if (localStorage.getItem("self")) {
            if (!userData) {
                userData = JSON.parse(localStorage.getItem("self") || "")
            }
        }
        
        
        if (cleanDefaultPassword) {
            properties.splice(properties.indexOf("defaultPassword"), 1)
        }
        
        if (!userData) {
            throw new Error("Missing user data")
        }
        
        const self = _.pick(userData, properties)
        localStorage.setItem("self", JSON.stringify(self))
        
        this.self = new UserModel({
            ...self,
            self: true
        })
        const event = new CustomEvent("addCatterpillar", { detail: {...this.self.catterpillar} })
        window.dispatchEvent(event)
    }
    
    
    validateAuthToken(token:string) : boolean {
        if (token) {
            try {
                const authData = jwtDecode(token) as {
                    exp: number,
                    iat: number,
                    id: number
                }
                
                if (authData) {
                    // get difference in minutes
                    const expiration = authData.exp -  Math.floor(Date.now() / 1000)
                    return expiration > 0
                }
            } catch (err) {
                return false
            }
        }
        return false
    }
    
    // refreshAuthToken() : Promise<void | AxiosResponse> {
    //     if (!this.axios)  {
    //         throw new Error("Missing axios instance")
    //     }

    //     return this.axios.post(`${this.baseUrl}/${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/refresh-token`, {
    //         credentials: "include"
    //     }).then(res => {
    //         // localStorage.setItem("authToken", res.data.refreshedToken)
    //         // Call validateAuthToken to refresh the token based on the expiration time
    //         this.validateAuthToken(res.data.refreshedToken)
    //     });
    // }


    authenticate(options: { email:string, password: string }) : Promise<AxiosResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.axios) {
                    throw new Error("Missing axios instance")
                }
                
                const credentials = { email: options.email, password: options.password }
                const response = await this.axios.post(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/login`, credentials)                
    
                if (response.data) {
                    const oldId = this.self?.id
                    const newId = response.data.user.id
                    if (oldId != newId) {
                        this.logout()
                        const event = new CustomEvent("removeCatterpillar", { detail: { id: oldId } })
                        this.catterpillarAdded = false
                        window.dispatchEvent(event)
                    }
                    
                    
                    const cleanDefaultPassword = response.data.user.defaultPassword != options.password

                    this.setSelf(response.data.user, cleanDefaultPassword)
                    localStorage.setItem("authToken", JSON.stringify(response.data.token))

                    return resolve(response)
                }

                resolve(response)
                
            } catch (err) {
                
                if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                    return reject(err)
                }

                reject(err)
            }
        })
        
    }
    
    createAnonymousAccount() : Promise<AxiosResponse> {        
        return new Promise(async (resolve, reject) => {
            try {
                const request = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    }
                } as AxiosRequestConfig

                
                // Maak nieuw account aan
                const response = await this.axios(`/${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}`, request)
                this.setSelf(response.data.doc)
                
                
                // Login met het nieuwe account
                const loginRequest = await this.axios(`/${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: {
                        email: response.data.doc.email,
                        password: response.data.doc.defaultPassword
                    }
                } as AxiosRequestConfig)    
                

                // Update het axios object met de nieuwe token voor toekomstige requests
                this.axios = this.axios.create({
                    baseURL: this.baseUrl,
                    headers: { Authorization: `Bearer ${loginRequest.data.token}` }
                });


                // Sla de token op in localStorage
                localStorage.setItem("authToken", JSON.stringify(loginRequest.data.token))

                
                resolve(response)
                
            } catch (err: unknown | AxiosError) {
                reject(err)
            }
        })
    }
    
    register(options: { email: string, password:string, [key:string]: string }) : Promise<AxiosResponse> {
        if (!options) {
            throw new Error("Missing options parameter")
        }
        const query = {
            email: options.email,
            password: options.password,
        } as { [key:string]: string }

        for (const key in options) {
            query[key] = options[key]
        }

        return new Promise(async (resolve, reject) => {
            try {
                const request = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: query
                } as AxiosRequestConfig

                // request.data = JSON.stringify(request.data, null, 2)

                const response = await this.axios(`/${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}`, request)
                this.setSelf(response.data.doc, true)

                resolve(response)
                
            } catch (err: unknown | AxiosError) {
                reject(err)
            }
        })
    }

    forgotPassword(options: { email?:string, username?: string }) : Promise<AxiosResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const credentials =  { 
                } as { email?:string, username?:string }

                if (options.email) {
                    credentials.email = options.email
                } else if (options.username) {
                    credentials.username = options.username
                }
                
                const response = await this.axios.post(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/forgot-password`, credentials)                
                
                if (response.data) {
                    return resolve(response)
                }

                reject(response)
            } catch (err) {
                if (err instanceof AxiosError && err.response) {
                    // const serverError = err.response.data.error
                    return reject(err)
                }
                reject(err)
            }
        })
    }

    resetPassword(options: { paswordForgotCode:string, newPassword: string }) : Promise<AxiosResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const requestBody =  { 
                    token: options.paswordForgotCode,
                    password: options.newPassword
                }

                const response = await this.axios.post(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/reset-password`, requestBody)
                
                if (response.data) {
                    localStorage.setItem("authToken", JSON.stringify(response.data.token))
                    this.setSelf(response.data.user)

                    return resolve(response)
                }

                reject(response)
            } catch (err) {
                if (err instanceof AxiosError && err.response) {
                    const serverError = err.response.data
                    if (err.response.data.errors.length > 0) {
                        return reject(serverError.errors)
                    }
                    return reject(serverError)
                }
                reject(err)
            }
        })
    }
    
    logout() {
        let id = this.self?.id
        this.catterpillarAdded = false
        if (id) {
            const event = new CustomEvent("removeCatterpillar", { detail: { id } })
            window.dispatchEvent(event)
        }
        localStorage.removeItem("authToken")
        localStorage.removeItem("self")
        
        this.self = undefined
    }
}

export default AuthModel