<template>
    
    <label class="selectbox" @click="openSelect" :class="[isOpen ? '__isOpen' : '']">
        <small class="selectbox-label-selection" v-if="name != displayName">{{ name }}</small>

        <span class="selectbox-label" v-if="name">
            {{displayName}}
        </span>
        <div class="selectbox-wrapper">

            <span class="selectbox-options" :style="direction == 'up' ? 'bottom: calc(100% + 8px);' : 'top: calc(100% + 6px);'" @mouseleave="closeSelect">
                <span class="selectbox-option" v-for="(option,key) in options" :key="key" @click="selectOption(key, $event)"
                    :class="[
                        !option.available ? '__isHidden' : '',
                        option.disabled ? '__isDisabled' : '',

                    ]">
                    
                    <jaoIcon size="medium"
                        :name="option.selected ? 'checkbox-checked' : 'checkbox'"
                        :transit-effect="{ duration: .1, delay:.002, effect: 'top-to-bottom'}" 
                        />
                    <span>
                        {{ option.label }}
                    </span>
                </span>
            </span>

            <jaoIcon size="medium"
                :name="isOpen ? 'expand-with-border' : 'expand'"
                :transit-effect="{ duration: .1, delay:.002, effect: 'top-to-bottom'}" 
                />
        </div>
    </label>
</template>


<script lang="ts">
import { defineComponent, PropType } from "vue"
import { filter } from "lodash"
import jaoIcon from "./../jao-icon.vue"

export type SelectBoxOptions = {
    value: number | string,
    label: number | string,
    selected: boolean
    available?: boolean, 
    disabled?: boolean, 
}

export default defineComponent({
    name: "selectboxFormComponent",
    components: {
        jaoIcon
    },
    props: {
        name: {
            type: String,
            required: false
        },
        options: {
            type: Object as PropType<SelectBoxOptions[]>,
            required: true
        },
    },
    data() {
        return {
            isOpen: false,
            direction: "down" as "down" | "up",
            lastSelection: undefined as number | undefined
        }
    },
    computed: {
        displayName() {
            const selectedOptions = filter(this.options, { selected: true })

            if (selectedOptions.length <= 0) {
                return this.name
            }

            let name = ""
            selectedOptions.forEach(opt => {
                name += `${opt.label}, `
            })
            return name.slice(0, name.length - 2)
        }
    },
    mounted() {
        window.addEventListener("keydown", this.onKeyDown)
    },
    unmounted() {
        window.removeEventListener("keydown", this.onKeyDown)
    },
    methods: {
        onKeyDown(e: KeyboardEvent) {
            if (e.key.toLowerCase() === "escape") {
                this.isOpen = false
                document.removeEventListener("click", this.closeSelect)
            }
        },
        openSelect() {
            if (this.isOpen) {
                return
            }

            this.isOpen = true
            if (window.innerHeight - 240 > this.$el.getBoundingClientRect().y) {
                this.direction = "down"
            } else {
                this.direction = "up"
            }
            
            setTimeout(() => {
                document.addEventListener("click", this.closeSelect)
            },0)
        },
        closeSelect(e:Event) {
            const target = e.target as HTMLElement
            if (!target) {
                return
            }
            
            let cancel = true
            let parent = target as HTMLElement | null
            while (cancel || parent !== null) {
                if (!parent) {
                    parent = null
                    cancel = true
                    break
                }
                
                if (typeof parent.className === "string" && parent.className !== "" && parent.className.startsWith("selectbox-options")) {
                    cancel = false
                }
                parent = parent.parentElement
            }

            if (cancel || e.type == "mouseleave") {
                document.removeEventListener("click", this.closeSelect)
                this.isOpen = false
            }
        },
        selectOption(index:number, e:MouseEvent) {
            const option = this.options[index]

            if (!option) {
                console.warn("invalid index", index)
                return
            }
            option.selected = !option.selected

            if (e.shiftKey && this.lastSelection) {
                for (let i = Math.min(index, this.lastSelection); i < Math.max(index, this.lastSelection); i++) {
                    this.options[i].selected = option.selected
                }
            }

            this.$emit("change")
            this.lastSelection = index
        }
    }
})
</script>

<style lang="scss" scoped>
@use "./../../assets/scss/variables";

.selectbox-wrapper {
    display: flex;
    input { 
        display: none; 
    }
    svg {
        height: 18px;
    }
}


.selectbox {
    display: flex;
    flex-flow: row;
    align-items: center;
    gap: 4px;
    justify-content: space-between;
    position: relative;
    color: #555;
    
    &:after {
        content: "";
        width: calc(100% - 24px);
        height: 2px;
        position: absolute;
        bottom: -8px;
        transition: var(--transition-default);
    }
    
    
    &:hover {
        &:after {
            background-color: currentColor;
        }
    }

    &.__isSelected {
        color: #222;
    }

    &.__isOpen {
        .selectbox-options {
            display: flex;
        }
    }
}

.selectbox-options {
    position: absolute;
    z-index: 2024;
    display: none;
    right: 0;
    min-width: 144px;
    max-height: 240px;
    width: 100%;
    overflow: auto;
    background-color: #fff;
    gap: 8px;
    flex-flow: row wrap;
    padding: 4px 0;
    outline: 1px solid #777;
}

.selectbox-label {
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}

.selectbox-label-selection {
    position: absolute;
    top: -1.2em;
    opacity: .8;
    font-size: .8em;
}
.selectbox-option {
    width: 100%;
    display: grid;
    align-items: center;
    padding: 8px 4px;
    gap: 8px;
    grid-template-columns: 18px 1fr;

    // This needs to be updated
    // &:hover {
    //     color: var(--bg-color);
    //     background-color: var(--contrast-color);
    // }

    &.__isHidden {
        display: none;
    }

    &.__isDisabled {
        opacity: 0.7;
        pointer-events: none;
        cursor: not-allowed;
    }
}
</style>
