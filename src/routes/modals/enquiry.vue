<template>
    <div class="enquiry">
        <form @submit.prevent="handleSubmit"> 
            <div class="enquiry-form" ref="newPasswordForm">
                <div class="heading">
                    <div class="heading-item" :class="[error.name ? '__isError' : '']">
                        <label for="name">Name</label>
                        <input type="text" id="name" minlength="2" v-model="name" autocomplete="name" size="32" @blur="validateName" required>
                        <div>
                            <span class="error" v-if="error.name">{{ error.name }}</span>
                        </div>
                    </div>

                    <div class="heading-item" :class="[error.name ? '__isError' : '']">
                        <label for="email">E-mailaddres</label>
                        <input type="text" id="email" minlength="6" v-model="email" autocomplete="email" size="32" @blur="validateEmail" required>
                        <div>
                            <span class="error" v-if="error.email">{{ error.email }}</span>
                        </div>
                    </div>
                </div>

                <div class="column">
                    <label for="message">Message</label>
                    
                    <textarea name="message" id="message" v-model="msg"  @blur="validateMessage" rows="10"></textarea>
                    <span class="error" v-if="error.message">{{ error.message }}</span>
                </div>
                <div class="column">

                    <CheckBox 
                        class="enquiry-checkbox"
                        name="Check this if you'd also would like to receive newsletters from time to time from me."
                        v-model="subscribeToNewsletter"
                        :class="[subscribeToNewsletter ? '__isSelected' : '']" />
                    
                </div>
                <div class="column">
                    <small>Using this form you will agree that your e-mailaddres, name and message will be stored in my database so I can view it and give you a follow-up.</small>
                </div>
                <div v-if="errorMessage" class="error-message">
                    Please fill in the empty fields.
                </div>
                <!-- Required because otherwise I can't submit via enter key -->
                
                <div class="modal-actions">
                    <button class="modal-submit" type="submit"> 
                        <span v-if="!isProcessingSubmit">Submit enquiry</span>
                        <span v-if="isProcessingSubmit" id="processing" ><span class="processing-dot">.</span><span class="processing-dot">.</span><span class="processing-dot">.</span></span>
                    </button>
                </div>
                
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { Payload } from "@/stores/payload"
import PayloadNewsletterSubscription from "@/services/payload/newsletter-subscription"
import CheckBox from "@/components/form/checkbox.vue"
import gsap from "gsap"

export default defineComponent({
    name: "passwordResetComponent",
    props: {
        message: {
            type: String,
            required: false
        },
        productId: {
            type: String,
            required: false
        }
    },
    components: {
        CheckBox
    },
    emits: ['update:submit-text', 'submit-success'],
    data() {
        return {
            error: {
                name: "",
                email:"",
                message: ""
            },
            errorMessage: false,
            name: "",
            subscribeToNewsletter: false,
            msg: "",
            email: "",
            isProcessingSubmit: false,
            processingTween: null as gsap.core.Tween | null
        }
    },
    watch: {
        message: {
            handler(v) {
                if (!this.message) {
                    return
                }
                this.msg = this.message
            },
            immediate: true
        }
    },
    setup() {
        const payload = Payload()
        return {
            payload
        }
    },
    methods: {
        validateName() {
            if (!this.name) {
                return this.error.name = "Please tell me how I should addres you"
            }
            this.error.name = ""
        },
        validateEmail() {
            if (!this.email) {
                return this.error.email = "Please tell me how I could reach you"
            } 

            this.error.email = ""
        },
        validateMessage() {
            if (!this.msg) {
                return this.error.message = "Without a message I have no idea what you'd like 🤷‍♂️"
            } 

            this.error.message = ""
        },
        async handleSubmit() {
            if (this.isProcessingSubmit) {
                return
            }

            this.errorMessage = false
            
            this.validateEmail()
            this.validateMessage()
            this.validateName()

            if (this.error.email || this.error.message || this.error.name) {
                this.errorMessage = true
                return false
            }
            this.isProcessingSubmit = true
            await this.$nextTick()

            this.processingTween?.kill()

            this.animateDots()
            
            try {
                if (!this.payload.auth) {
                    throw new Error("Auth not initialized")
                }
                if (!this.payload.auth.self) {
                    throw new Error("User not found")
                }
                const content = {
                    name: this.name,
                    message: this.msg,
                    email: this.email
                } as {
                    name: string,
                    message: string,
                    email: string,
                    product?: string
                }

                if (this.productId) {
                    content.product = this.productId
                }
                
                await this.payload.POST(`enquiries`, content )
                
                if (this.subscribeToNewsletter) {
                    PayloadNewsletterSubscription.add(this.email)
                }

                this.$emit('submit-success')
                this.isProcessingSubmit = false
                return true

            } catch (e) {
                return false
            }
        },
        animateDots() {

            const dots = this.$el.querySelectorAll("#processing .processing-dot")
            if (!dots.length) return

            const tl = gsap.timeline({
                repeat: -1,
                repeatDelay: 0.2,
                defaults: { ease: "power1.out" }
            })

            gsap.set(dots, { x: 0, opacity: 0.2 })

            dots.forEach((dot:Element, index: number) => {
                tl.to(dot, {
                y: -4,
                opacity: 1,
                duration: 0.18
                })
            })

            // reset naar links voor de volgende cyclus
            tl.to(dots, {
                y: 0,
                opacity: 0.2,
                duration: 0.12,
                stagger: 0.04
            })
        }
    }
})
</script>

<style lang="scss">

.enquiry {
    textarea {
        padding: 16px;

        &:focus {
            outline-color: var(--accent-color);
        }
    }

    .heading {
        font-size: 14px;
        font-weight: normal;
        display: flex;
        flex-flow: column;
        font-family: var(--accent-font);
        gap: 8px 32px;
        width: calc(100% - 48px);
        margin-bottom: 16px;
    }

    .heading-item {
        display: grid;
        grid-template-columns: 1fr;
        // grid-template-columns: auto 1fr;
        gap: 8px;
        align-items: center;

        label {
            // width: 128px;
        }
        input {
            min-width: 128px;
        }
    }

    #processing {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 32px;
    }

    .processing-dot {
        display: inline-block;
        font-size: 20px;
        line-height: 1;
    }
}

.error-message {
    color: var(--red);
    // background-color: var(--error-bg-color);
    padding: 8px;
    font-size: 14px;
}

.enquiry-form {
    .error {
        color: var(--red);
        font-family: var(--accent-font);
        font-size: 12px;

        // grid-column: span 2;
    }

    .column {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr;
    }

    label {
        font-size: 12px;
        font-family: var(--accent-font);
        align-items: center;
        gap: 8px;
    }

    input {
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
    .enquiry-checkbox {
        margin-top: 16px;
    }
    small {
        margin-top: 16px;
    }
}

@media (min-width: 640px) {
    .enquiry {
        .heading {
            flex-flow: row;
        }
    }
}
@media (min-width: 512px) {
    .enquiry {

        .heading-item {
            grid-template-columns: auto 1fr;
            
            div {
                grid-column: span 2;
            }
        }
    }
}
</style> 