<template>
    <header class="site-header">
        <RouterLink to="/">
            <span class="site-header-logo" ref="logo"></span>
        </RouterLink>
        <nav class="site-header-navigation">
            <span class="site-header-navigation-item" v-for="navItem, key in nav" :key="key">
                
                <RouterLink :to="navItem.link">
                    {{ navItem.name }}
                </RouterLink>
                
                <div class="site-header-navigation-dropdown" v-if="navItem.subitems" :id="`item${navItem.id}`" >
                    <RouterLink class="site-header-navigation-dropdown-item" :to="subItem.link" v-for="subItem, subKey in navItem.subitems" :key="subKey" @click="closeMenu">
                        <jaoIcon size="small" name="play" />
                        {{subItem.name}}
                    </RouterLink>
                </div>
            </span>
        </nav>
        
        <span class="site-header-settings" :class="[userMenuOpen ? '__isActive' : '']">
            <jaoIcon size="large" name="user" inactiveColor="transparent" :activeColor="userMenuColor" @click="toggleUserMenu"/>
        </span>

        <div class="site-header-user-menu">

            
            <form @submit.prevent="handleAccountForm" class="site-header-user-menu-form" v-if="userMenu != 'user'">
                <div class="column">
                    <label for="email">E-mailadres</label>
                    <input type="email" id="email" v-model="email" required>
                </div>
                <div class="column" v-if="userMenu == 'login'">
                    <label for="password">Wachtwoord</label>
                    <input type="password" id="password" v-model="password" required>
                    <div v-if="loginError" class="error-message">{{ loginError }}</div>
                </div>


                <div class="column" v-if="userMenu == 'register'">
                    <button class="button small" type="submit">Register / Login</button>
                </div>

                <div class="column" v-if="userMenu == 'login'">
                    <div class="row">
                        <span class="site-header-text-small" @click="requestPasswordReset">Forgot password?</span>
                    </div>
                    <div class="row">
                        <button class="button small cancel" type="button" @click="cancelLogin">Cancel</button>
                        <button class="button small login" type="submit">Login</button>
                    </div>
                </div>
            </form>

            <div v-if="userMenu == 'user' && payload.auth?.self" class="site-header-user-menu-user">
                <aside class="site-header-user-menu-container">
                    <header class="row">
                        Hello {{ payload.auth.self.username }}
                    </header>
                    <ul class="site-header-user-menu-list">
                        <li :class="{'__isActive': $route.path == '/favorites'}">
                            <RouterLink to="/favorites">
                                Favorites
                            </RouterLink>
                        </li>
                        
                    </ul>
                    <footer>
                        <button class="button small cancel" type="button" @click="logout">Logout</button>
                    </footer>
                </aside>
            </div>
            
            <div v-if="emailSent" class="email-sent-message">
                An e-mail has been sent to {{ email }}, please follow the steps in the e-mail to complete the creation of this new account.
            </div>
            <div v-if="timesCanceled > 1 && userMenu == 'login'" class="email-sent-message">
                <p>It seems like you are trying to create a new account. However, there is already an account with this e-mail address. Please try again with a different e-mail address.</p>
            </div>
            <div v-if="passwordResetRequestSent && userMenu == 'login'" class="email-sent-message">
                <p>An e-mail has been sent to {{ email }}, please follow the steps in the e-mail to reset your password.</p>
            </div>
        </div>
    </header>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import { Icon } from "jao-icons"
import Navigation from "@/services/payload/navigation"
import jaoIcon from "@/components/jao-icon.vue"
import gsap from "gsap"
import AccountService from "@/services/account"
import Payload from "@/stores/payload"

type NavItem = {
    id: string,
    link: string,
    name: string,
    expanded?: boolean,
    subitems: {
        id: string,
        link: string,
        name: string,     
    }[],

}
export default defineComponent({
    name: "siteHeader",
    components: {
        jaoIcon
    },
    data: () => {
        return {
            selection: "en",
            nav: [] as NavItem[],
            tweens: [] as gsap.core.Tween[],
            expendedItem: undefined as undefined | NavItem,
            email: "",
            password: "",
            loginError: "",
            emailSent: false,
            timesCanceled: 0,
            userMenu: "register" as "register" | "login" | "user",
            userMenuColor: "#fff",
            userMenuOpen: false,
            userNameDisabled: true,
            userNameCache: "",
            passwordResetRequestSent: false,
        }
    },
    setup() {
        const payload = Payload()

        return {
            payload
        }
    },
    computed: {
    },
    beforeCreate() {
        Navigation.getNav("header").then(res => {
            this.nav = res.data.docs[0].items
        }) 
    },
    mounted() {
        const logo = this.$refs["logo"] as HTMLElement
        const icon = Icon("medium/logo")

        // this.loadMenu()
        if (logo && icon) {
            logo.appendChild(icon)
        }
    },
    watch: {
        "payload.auth.self": {
            handler(self) {
                
                if (self && !self.email.includes("user@jeffreyarts.nl")) {
                    this.userMenu = "user"
                }
            },
            deep: true
        }
    },
    methods: {
        closeMenu(e: Event) {
            const targetEl = e.target as HTMLElement
            if (!targetEl) {
                return
            }
            const parentEl = targetEl.parentElement
            if (!parentEl) {
                return
            }
            parentEl.style.display = "none"
            setTimeout(()=> {
                parentEl.style.display = ""
            },110)
        },
        closeExpandedItem(e: Event, navItem: NavItem) {
            if (!navItem) {
                return
            }
            
            const targetEl = this.$el.querySelector(`#item${navItem.id}`)
            if (!targetEl) {
                return
            }
            // Kill any existing animations
            if (this.tweens.length > 0) {
                this.tweens.forEach( t => {t.kill()})
                this.tweens = []
            }
            
            const children = targetEl.querySelectorAll(".site-header-navigation-dropdown-item")
            const childTween = gsap.fromTo(children, {
                x: 0,
                opacity: 1
            },{
                x: 8,
                opacity: 0,
                pointerEvents: "none",
                stagger: {
                    each: .16,
                    from: "end",
                    ease: "power2.inOut",
                },
                onComplete: () => {
                    navItem.expanded = false
                    this.expendedItem = undefined
                },
            })
            
            this.tweens.push(childTween)
        },
        cancelExpension(navItem: NavItem) {
            if (!navItem) {
                return
            }
            const el = this.$el
            if (!el || !navItem) {
                return
            }

            const targetEl = el.querySelector(`#item${navItem.id}`)
            const children = targetEl.querySelectorAll(".site-header-navigation-dropdown-item")
            gsap.killTweensOf(children)
            gsap.to(children, {
                // x: 0,
                opacity: 0,
                pointerEvents: "none",
                duration: .16,
                stagger: {
                    each: .08,
                    from: "end",
                    ease: "power2.inOut",
                },
                onComplete: () => {
                    navItem.expanded = false
                }
            })
        },
        expand(e:Event, navItem: NavItem) {
            // e.preventDefault()
            
            navItem.expanded = true
            const el = this.$el
            if (!el) {
                return
            }
            if (this.expendedItem?.id == navItem.id) {
                return
            }
            
            
            this.expendedItem = navItem

            this.nav.forEach((item) => {
                if (item.id != navItem.id) {
                    this.cancelExpension(item)
                }
            })  
            
            // Kill any existing animations
            if (this.tweens.length > 0) {
                this.tweens.forEach( t => {
                    t.kill()
                })
                this.tweens = []
            }
            
            if (navItem.expanded) {
                const targetEl = el.querySelector(`#item${navItem.id}`)
                const children = targetEl.querySelectorAll(".site-header-navigation-dropdown-item")


                const childTween = gsap.fromTo(children, {
                    x: 0,
                    y: -8,
                    opacity: 0
                },{
                    x: 0,
                    y: 8,
                    opacity: 1,
                    pointerEvents: "all",
                    stagger: {
                        each: .16,
                        from: "start",
                        ease: "power2.inOut",
                    },
                    duration: .48,
                    onComplete: () => {
                        this.expendedItem = navItem
                    }
                })

                this.tweens.push(childTween)
            }
        },
        toggleUserMenu() {
            this.userMenuOpen = !this.userMenuOpen

            if (this.userMenuOpen) {
                this.userMenuColor = "#222"
                gsap.set(".site-header-user-menu", {
                    y: -8,
                    opacity: 0
                })

                gsap.to(".site-header-user-menu", {
                    y: 0,
                    opacity: 1,
                    duration: .8,
                    pointerEvents: "all"
                })

                // Voeg event listener toe voor klikken buiten het menu
                document.addEventListener('click', this.handleClickOutside)
            } else {
                this.userMenuColor = "#fff"
                gsap.killTweensOf(".site-header-user-menu")
                gsap.to(".site-header-user-menu", {
                    y: -8,
                    opacity: 0,
                    duration: .48,
                    pointerEvents: "none"
                })

                // Verwijder event listener wanneer menu sluit
                document.removeEventListener('click', this.handleClickOutside)
            }
        },
        handleClickOutside(event: MouseEvent) {
            const userMenu = this.$el.querySelector('.site-header-user-menu')
            const settingsButton = this.$el.querySelector('.site-header-settings')
            
            if (userMenu && settingsButton) {
                if (!userMenu.contains(event.target as Node) && !settingsButton.contains(event.target as Node)) {
                    this.userMenuOpen = false
                    this.userMenuColor = "#fff"
                    gsap.killTweensOf(".site-header-user-menu")
                    gsap.to(".site-header-user-menu", {
                        y: -8,
                        opacity: 0,
                        duration: .48,
                        pointerEvents: "none"
                    })
                    document.removeEventListener('click', this.handleClickOutside)
                }
            }
        },
        handleAccountForm(e: Event) {
            if (this.userMenu == "register") {
                this.registerAccount()
            } else if (this.userMenu == "login") {
                this.loginAccount()
            } else if (this.userMenu == "user") {
                // this.logoutAccount()
            }
        },
        cleanEmail(email: string) {
            if (!email) return "";

            return email
                .normalize("NFKC")                 // normalize unicode (important!)
                .trim()                            // remove leading/trailing spaces
                .replace(/\s+/g, "")               // remove any internal whitespace
                .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width chars
                .toLowerCase();                    // normalize casing
        },
        async loginAccount() {
            if (!this.payload.auth) {
                return
            }
            this.loginError = ""
            this.payload.auth.authenticate({
                email: this.cleanEmail(this.email),
                password: this.password
            }).then(res => {
                this.userMenu = "user"
            }).catch(err => {
                this.loginError = err.response.data.errors[0].message
            })            
        },
        async registerAccount() {
            const valid = await AccountService.validateEmail(this.cleanEmail(this.email))
            
            if (valid) {
                this.userMenu = "login";
            } else {
                gsap.to(".site-header-user-menu-form", {
                    height: 0,
                    padding: 0
                })
                this.emailSent = true;
                let height = 0
                this.$nextTick(() => {
                    height = parseInt(gsap.getProperty(".email-sent-message", "height").toString())
                    
                    gsap.set(".email-sent-message", {opacity:0, height:0 })

                    const password = this.payload.auth?.self?.defaultPassword + ""
                    const email = this.payload.auth?.self?.email + ""
                    if (this.payload.auth?.self) {
                        AccountService.register(this.cleanEmail(this.email), email, password)

                        gsap.to(".email-sent-message", {
                            height,
                            opacity: 1,
                            delay: .64,
                            onComplete: () => {
                                gsap.to(".email-sent-message", {
                                    opacity: 0,
                                    delay: 6,
                                    duration: .4,
                                    onComplete: () => {
                                        this.userMenuOpen = false
                                        this.userMenu = "login";
                                        this.emailSent = false;
                                        this.userMenuColor = "#fff"
                                    }
                                })
                            }
                        })
                    }
                })
            }
        },
        async requestPasswordReset(e: Event) {
            e.preventDefault()
            e.stopPropagation()
            
            gsap.to(".site-header-user-menu-form", {
                height: 0,
                padding: 0,
                duration: .64,
            })

            this.passwordResetRequestSent = true

            let height = 0
            this.$nextTick(() => {
                height = parseInt(gsap.getProperty(".email-sent-message", "height").toString())
                
                gsap.set(".email-sent-message", {opacity:0, height:0 })

                gsap.to(".email-sent-message", {
                    height,
                    opacity: 1,
                    delay: .8,
                    onComplete: () => {
                        gsap.to(".email-sent-message", {
                            opacity: 0,
                            delay: 6,
                            duration: .4,
                            onComplete: () => {
                                this.userMenuOpen = false
                                this.passwordResetRequestSent = false
                                this.userMenu = "login";
                                this.emailSent = false;
                                this.userMenuColor = "#fff"
                            }
                        })
                    }
                })
            })

            this.payload.POST(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/forgot-password`, {
                email: this.cleanEmail(this.email)
            })

        },
        changeUsername(e: Event) {
            e.preventDefault()
            e.stopPropagation()
            this.userNameDisabled = false
            if (this.payload.auth?.self) {
                this.userNameCache = this.payload.auth.self.username
            }
            // set focus on input
            const input = this.$refs["usernameInput"] as HTMLInputElement
            this.$nextTick(() => {
                if (input) {
                    input.focus()
                }
            })
        },
        saveUsername(e: Event) {
            e.preventDefault()
            e.stopPropagation()
            this.userNameDisabled = true
            if (this.payload.auth?.self) {
                this.payload.PATCH(`${import.meta.env.VITE_PAYLOAD_AUTH_COLLECTION}/${this.payload.auth.self.id}`, {
                    username: this.payload.auth.self.username
                })
            }
        },
        cancelUsername(e: Event) {
            e.preventDefault()
            e.stopPropagation()
            this.userNameDisabled = true
            if (this.payload.auth?.self) {
                this.payload.auth.self.username = this.userNameCache
                this.userNameCache = ""
            }
        },
        cancelLogin(e: Event) {
            e.preventDefault()
            e.stopPropagation()
            this.userMenu = "register"
            this.timesCanceled++
        },
        logout() {
            if (this.payload.auth) {
                this.payload.auth.logout()
                this.userMenu = "register"
            } else {
                console.error("Auth object missing")
            }
        }
    }
})
</script>

<style lang="scss">
@use "./../assets/scss/variables";
.site-header-logo {
    height: 36px;
    padding: 7px;
    display: block;
    svg {
        display: inline-block;
        height: 100%;
    }
}
.site-header {
    display: flex;
    width: 100vw;
    height: 36px;
    position: absolute;
    z-index: 1990;
    // mix-blend-mode: difference;
    // filter: invert(100%);
}

.site-header-navigation {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-left: 8px;
}

.site-header-navigation-item {
    font-family: var(--accent-font);
    position: relative;

    a {
        text-decoration: none;
        color: var(--contrast-color);
    }

    &:hover,
    &:focus {
        .site-header-navigation-dropdown {
            display: flex;

            .site-header-navigation-dropdown-item {
                opacity: 1;
                pointer-events: all;

                &:hover,
                &:focus {
                    text-shadow: -2px -2px 8px var(--bg-color), 2px -2px 8px var(--bg-color), 2px 2px 8px var(--bg-color), -2px 2px 8px var(--bg-color);
                }
            }
        }
    }
}

.site-header-navigation-dropdown {
    position: absolute;
    top: calc(100% - 4px);
    display: none;
    flex-flow: column;
    width: 180px;
    
}

.site-header-navigation-dropdown-item {
    display: flex;
    padding: 4px 0;
    font-size: .8em;
    opacity: 0;
    pointer-events: none;
    transition: var(--transition-default);
    align-items: center;

    &:hover {
        .jao-icon {
            opacity: 1;
        }
    }
}

.site-header-navigation-dropdown-item .jao-icon {
    height: 8px;
    padding-right: 4px;
    margin-left: -12px;
    opacity: 0;
    
    [v="1"] {
        fill: var(--contrast-color) !important;
    }
    [v="0"] {
        fill: transparent !important;
    }
}

.site-header-settings {
    position: absolute;
    padding: 4px;
    background-color: var(--contrast-color);
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    right: 4px;
    top: 4px;
    transition: .4s all ease;

    &.__isActive {
        outline: 1px solid var(--contrast-color);
        background-color: var(--bg-color);
    }

    svg {
        width: 13px;
    }
}

.site-header-user-menu {
    position: absolute;
    right: 16px;
    top: 64px;
    width: 256px;
    opacity: 0;
    pointer-events: none;
    
    .row {
        display: flex;
        flex-flow: row;
        gap: 8px;
        padding-bottom: 8px;
    }

    .column {
        display: flex;
        flex-flow: column;
        padding-bottom: 8px;
    }

    .email-sent-message {
        margin-top: 8px;
        padding: 8px;
        margin-left: 8px;
        margin-bottom: 8px;
        width: calc(100% - 16px);
        background-color: #f5f5f5;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.4;
        overflow: hidden;
    }
}

.site-header-user-menu-form,
.site-header-user-menu-container {
    padding: 8px;
    background-color: #fff;
    overflow: hidden;

    label {
        font-size: 12px;
        font-family: var(--accent-font);
    }

    input[type=text],input[type=email] {
        font-size: 14px;
        line-height: 2;
        outline-width: 1px;
        border-radius: 0;
        border: 1px solid var(--contrast-color);
        padding-left: 4px;

        &:focus {
            outline: 0 none transparent;
            border-left-color: #fff;
            border-right-color: #fff;
            border-top-color: #fff;
        }
    }
}

.site-header-user-menu-username {
    font-size: 14px;
    line-height: 2;
    border: 1px solid transparent;
    // border-bottom-width: 1px;

    border-bottom-color: var(--contrast-color);

    &:disabled {
        border-bottom-color: transparent;
    }

    &:focus {
        outline: 0 none transparent;
        border-bottom-color: var(--accent-color);
    }
}

.site-header-user-menu-username-change {
    font-size: 12px;
    font-family: var(--accent-font);
    margin-top: 4px;
    text-align: right;
    text-decoration: underline;
    opacity: .64;
    font-weight: normal;
}

.site-header-text-small {
    font-size: 12px;
    font-family: var(--accent-font);
    opacity: 0.8;
    transition: .4s all ease;
    cursor: pointer;

    &:hover {
        opacity: 1;
        text-decoration: underline;
    }
}

.site-header-user-menu-list {
    padding-left: 0;
    
    li {
        font-family: var(--accent-font);
        font-size: 14px;
        list-style: none;
        
        a {
            text-decoration: none;
            color: var(--contrast-color);
            transition: .4s all ease;

            &:hover, &:focus {
                color: var(--accent-color);
            }
        }

        &:before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 4px;
            background-color: var(--contrast-color);
        }

        &.__isActive {
            &:before {
                background-color: var(--accent-color);
            }
        }
    }
}


@media all and (min-width: 640px) {
    .site-header-logo,
    .site-header {
        height: 56px;
    }

    .site-header-navigation {
        gap:16px;
    }

    .site-header-navigation-item {
        font-size: 24px;
        padding-left: 24px;
    }

    .site-header-navigation-dropdown {
        top: calc(100%);
    }
    
    .site-header-navigation-dropdown-item .jao-icon {
        height: 20px;
        padding-right: 8px;
        margin-left: -28px;
    }

    .site-header-settings {
        padding: 8px;
        right: 16px;
        top: 16px;

        svg {
            width: 26px;
        }
    }
}

@media all and (min-width: 800px) {
    .site-header-logo,
    .site-header {
        height: 72px;
    }

    
    .site-header-navigation {
        gap:32px;
    }

    .site-header-navigation-item {
        font-size: 32px;
        padding-left: 16px;
    }
}
</style>
