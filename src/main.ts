import App from "./App.vue"
import { createApp } from "vue"
import router from "./routes"
import { createPinia } from "pinia"
import { createHead } from "@unhead/vue/client"
import { CanonicalPlugin } from 'unhead/plugins'

import Physics from "./services/physics"

// Locale i18n packages
import { createI18n } from "vue-i18n"
import messages from "@/locale"
import $text from "@/services/vue-i18n-markdown"

// HighlightJS
import "highlight.js/styles/stackoverflow-light.css"
import hljs from "highlight.js/lib/core"

import arduino from "highlight.js/lib/languages/arduino"
import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import javascript from "highlight.js/lib/languages/javascript"
import xml from "highlight.js/lib/languages/xml"
import php from "highlight.js/lib/languages/php"
import typescript from "highlight.js/lib/languages/typescript"

hljs.registerLanguage("arduino", arduino)
hljs.registerLanguage("bash", bash)
hljs.registerLanguage("css", css)
hljs.registerLanguage("html", xml)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("php", php)
hljs.registerLanguage("typescript", typescript)

import "./assets/scss/index.scss"
// import App from "./App.vue"

const pinia = createPinia()
        
pinia.use(({ store }) => {
    if (store.$id === "locale") {
        store.$i18n = i18n.global
    }
})

const i18n = createI18n({
    legacy: false,
    warnHtmlMessage: import.meta.env.DEV,
    fallbackLocale: "en",
    messages,
})



const app = createApp(App)
app.config.globalProperties.$text  = $text

Physics.start(router)

const head = createHead({
    plugins: [
        CanonicalPlugin({
            canonicalHost: import.meta.env.VITE_CLIENT_URL
        })
    ]
})

app.use(router)
    .use(i18n)
    .use(pinia)
    .use(head)
    .mount("#app")
