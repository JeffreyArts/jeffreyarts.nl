<template>
    <site-header />
    <router-view />
    <Modal v-if="showPasswordReset" :is-open="showPasswordReset" :auto-close="false" @close="closePasswordReset" @submit="handlePasswordReset">
        <PasswordReset ref="passwordReset" :token="passwordResetToken" @update:submit-text="updateSubmitText" />
        <template #submit-text>
            {{ submitText }}
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import siteHeader from "@/components/site-header.vue"    
import Modal from "@/components/modal.vue"
import PasswordReset from "@/routes/modals/password-reset.vue"
import Payload from "@/stores/payload"
import Locale from "@/stores/locale"
import gsap from "gsap"

import useIdentityStore from "@/stores/identity"
import useStoryStore from "@/stores/story"

// import { useRouter } from "vue-router"

export default defineComponent({
    name: "appComponent",
    components: {
        siteHeader,
        Modal,
        PasswordReset
    },
    data() {
        return {
            showPasswordReset: false,
            passwordResetToken: "",
            submitText: "Change password"
        }
    },
    setup() {
        
        const identityStore = useIdentityStore()
        const storyStore = useStoryStore()

        storyStore.init()
        identityStore.init()
    },
    mounted() {
        const payload = Payload()
        const locale = Locale()

        if (typeof window !== "undefined") {
            locale.select(localStorage.getItem("i18n_locale") || locale.current)
            payload.init()
            
            gsap.to("html", {
                "--bg-size": 8,
                // "--bg-color":"#222", 
                // "--primary-bg-color":"#000", 
                // "--contrast-color": "#fafafa",
                duration:.8
            })

            // Check voor password reset token in URL
            const urlParams = new URLSearchParams(window.location.search)
            const token = urlParams.get('password-reset-token')
            if (token) {
                this.passwordResetToken = token
                this.showPasswordReset = true
                // Verwijder de token uit de URL zonder page refresh
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    },
    methods: {
        closePasswordReset() {
            this.showPasswordReset = false
            this.passwordResetToken = ""
            this.submitText = "Change password"
        },
        updateSubmitText(text: string) {
            this.submitText = text
        },
        async handlePasswordReset() {
            const passwordReset = this.$refs.passwordReset as any
            if (!passwordReset) {
                return
            }

            // Voorkom dat de modal sluit door de submit event te stoppen
            const success = await passwordReset.handleSubmit()
            
            // Alleen sluiten als de reset succesvol was
            if (success) {
                this.closePasswordReset()
            }
        }
    }
})
</script>

<style src="./assets/scss/index.scss"></style>
