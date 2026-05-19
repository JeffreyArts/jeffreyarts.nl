import { defineStore } from "pinia"
import AuthModel from "@/model/payload/auth"
import isSearchEngineCrawler from "./../check-for-bot-visit"
import PageModel, { PageType } from "@/model/payload/page"
import { AxiosRequestConfig, AxiosResponse } from "axios"
import axios from "axios"

export interface PayloadHTTPHeader {
    "Content-Type": string;
    "Authorization"?: string;
}

export const Payload = defineStore("payload", {
    state: () => ({
        baseUrl: "",
        auth: undefined as AuthModel | undefined,
        page: undefined as PageModel | undefined 
    }),
    actions: {
        axios: axios.create(),
        init() {
            // Set url
            let url = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT
            // if last char is a slash, remove it
            if (url[url.length - 1] === "/") {
                url = url.slice(0, -1)
            }

            this.baseUrl = url
            const isBot = isSearchEngineCrawler()
            if (!isBot.isCrawler) {
                this.auth = new AuthModel(this.baseUrl)
            }
                
            this.page = new PageModel()
            this.axios = axios.create({
                withCredentials: true,
                baseURL: this.baseUrl
            })

            

            this.axios.interceptors.response.use((response) => {
                  // Pass through successful responses
                  return response;
                },
                async (error) => {
                  const originalRequest = error.config;
              
                  // Check if error is 403 and it hasn't been retried yet
                  if (error.response && error.response.status === 403 && !originalRequest._retry) {
                    originalRequest._retry = true; // Mark the request to prevent infinite loops
              
                    try {
                        if (this.auth?.self?.defaultPassword) {
                            const refreshResponse =  await this.auth.authenticate({ email: this.auth.self.email, password: this.auth.self.defaultPassword })
                            // Update the previous authToken
                            const newAuthToken = refreshResponse.data.token; // Extract the new token

                            localStorage.setItem('authToken', newAuthToken);
                            return this.axios(originalRequest);
                        }
                    } catch (refreshError) {
                      console.error('Token refresh failed:', refreshError);
                      // Optional: Redirect to login page or handle logout
                    //   window.location.href = '/login'; // Replace with your logout handling logic
                      return Promise.reject(refreshError);
                    }
                  }
              
                  // For other errors, reject the promise as usual
                  return Promise.reject(error);
                }
              );
        },
        GET(path: string) {
            return this.REST("GET", path)
        },
        DELETE(path: string) {
            return this.REST("DELETE", path)
        },
        POST(path: string, data?: object | string) {
            return this.REST("POST", path, data)
        },
        PUT(path: string, data?: object | string) {
            if (typeof data === "object") {
                data = JSON.stringify(data)
            }
            return this.REST("PUT", path, data)
        },
        PATCH(path: string, data?: object | string) {
            return this.REST("PATCH", path, data)
        },
        REST(method: string, path: string, data?: object | string) : Promise<AxiosResponse> {
            
            const headers = {
                "Content-Type": "application/json",
            } as PayloadHTTPHeader
            
            if (path[0] !== "/") {
                path = "/" + path
            }

            path = this.baseUrl + path

            const request = {
                method: method,
                headers: headers,
                withCredentials: true
            } as AxiosRequestConfig
            
            if (typeof data !== "string" && typeof data !== "undefined") {
                request.data = JSON.stringify(data, null, 2)
            } else if (typeof data === "string") {
                request.data = data
            }
            
            return this.axios(path, request)
        },
        authenticateUser(email: string, password: string) {
            if (!this.auth) {
                throw new Error("Missing auth")
            }

            return this.auth.authenticate({
                email,
                password
            })
        },
        registerUser(email: string, password:string, options?: { [key: string]: string }) {
            if (!this.auth) {
                throw new Error("Missing auth")
            }
            const request = {
                email,
                password
            } as { email:string, password: string, [key: string]: string }

            if (options) {
                for (const key in options) {
                    request[key] = options[key]
                }
            }
    
            return this.auth.register(request)
        },
        async getPageByPath(path: string): Promise<PageType | undefined> {
            if (!this.page) {
                return undefined
            }
            return this.page?.getPageByPath(path)
        }
    },
    getters: {
    }
})

export default Payload