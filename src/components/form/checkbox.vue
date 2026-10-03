<template>
    <label class="checkbox" :class="modelValue ? '__isSelected' : ''" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
        <span class="checkbox-label">
            {{name}}
        </span>
        <span class="checkbox-symbol">
            <jaoIcon
                size="medium"
                :active-color="activeColor"
                :name="modelValue ? 'checkbox-cross' : 'checkbox'"
                :transit-effect="transitEffect" 
                />
            <input type="checkbox" @change="changeInput($event)">
        </span>
    </label>
</template>


<script lang="ts">
import { defineComponent} from "vue"
import jaoIcon, {transitEffect} from "./../jao-icon.vue"


export default defineComponent({
    name: "checkboxFormComponent",
    components: {
        jaoIcon
    },
    data() {
        return {
            activeColor: "#222",
            transitEffect: { duration: .1, delay:.002, effect: 'left-to-right'} as transitEffect
        }
    },
    props: {
        name: {
            type: String,
            required: false
        },
        modelValue: {
            type: Boolean,
            required: true
        },
        position: {
            type: String,
            required: false
        }
    },
    methods: {
        onMouseEnter(e: Event) {
            if (this.modelValue) {
                this.activeColor = "var(--accent-color)"
            } else {
                this.activeColor = "var(--accent-color)"
            }
            this.transitEffect.effect = "right-to-left"

        },
        onMouseLeave(e: Event) {
            if (this.modelValue) {
                this.activeColor = "#222"
            } else {
                this.activeColor = "#555"
            }
            this.transitEffect.effect = "left-to-right"
        },
        changeInput(e:Event) {
            const target = e.target as HTMLInputElement
            
            if (!target) {
                return
            }
            
            this.$emit('update:modelValue', target.checked)
        }
    }
})
</script>

<style lang="scss" scoped>
@use "./../../assets/scss/variables";

.checkbox {
    display: flex;
    input { 
        display: none; 
    }
    svg {
        height: 18px;
    }

    &:hover {
        color: var(--accent-color);
        cursor: pointer;
    }
}

</style>
