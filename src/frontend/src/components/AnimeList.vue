<script setup lang="ts">
import { computed } from "vue";
import { Anime as TAnime } from "../types";
import Anime from "./Anime.vue";

const props = defineProps<{
    list: TAnime[];
}>();

const padding = computed(() => (props.list.length > 8 ? 0 : 8 - props.list.length));
</script>

<template>
    <div class="grid w-full grid-cols-2 gap-5 sm:grid-cols-[repeat(auto-fit,minmax(225px,1fr))]">
        <TransitionGroup name="list">
            <div v-for="anime in list" class="w-full max-w-[300px]" :key="anime.id">
                <Anime :anime="anime" />
            </div>
        </TransitionGroup>
        <!-- placeholders, prevent large gaps -->
        <div v-if="padding" v-for="i in padding" class="w-full max-w-[300px] opacity-0"></div>
    </div>
</template>

<style scoped>
.list-move, /* apply transition to moving elements */
.list-enter-active {
    transition: all 0.35s ease;
}

.list-enter-from {
    opacity: 0;
    transform: translateY(30px);
}
.list-leave-active {
    opacity: 0;
    position: absolute;
}
</style>
