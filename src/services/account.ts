import axios from "axios"

const AccountService = {
    validateEmail: async (email: string): Promise<boolean> => {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_PAYLOAD_REST_ENDPOINT}/site-users/validate-email/${email}`)
                resolve(response.data.valid)
            } catch (error) {
                console.error('Error validating email:', error)
                resolve(false)
            }
        })
    },

    register: async (newEmail:string, email: string, password: string): Promise<boolean> => {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.post(`${import.meta.env.VITE_PAYLOAD_REST_ENDPOINT}/site-users/register`, {
                    newEmail,
                    email,
                    password
                })
                
                const self = JSON.parse(localStorage.getItem("self")+"")
                self.email = newEmail
                localStorage.setItem("self", JSON.stringify(self))
                resolve(true)
            } catch (error) {
                console.error('Error registering user:', error)
                resolve(false)
            }
        })
    }
}

export { AccountService }
export default AccountService 