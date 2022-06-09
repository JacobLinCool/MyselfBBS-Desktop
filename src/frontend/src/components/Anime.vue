<script setup lang="ts">
import { Ref, inject } from "vue";
import config from "../config";
import { Anime } from "../types";

defineProps<{ anime: Anime }>();

const detail_selected = inject<Ref<number>>("detail_selected");
</script>

<template>
    <div class="group cursor-pointer transition-all" @click="detail_selected = anime.id">
        <div class="w-full px-4">
            <div class="w-full overflow-hidden rounded" style="aspect-ratio: 5 / 7">
                <img
                    :src="`${config.backend}/store/cover?id=${anime.id}`"
                    class="contrast-110 w-full scale-100 transform filter transition-all duration-200 ease-in group-hover:scale-105"
                    style="aspect-ratio: 5 / 7"
                    loading="lazy"
                />
            </div>
        </div>
        <div class="w-full px-4">
            <h1>{{ anime.title }}</h1>
        </div>
    </div>
</template>
