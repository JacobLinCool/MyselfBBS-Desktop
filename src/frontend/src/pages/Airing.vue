<script lang="ts" setup>
import { reactive } from "vue";
import AnimeList from "../components/AnimeList.vue";
import Fade from "../components/Fade.vue";
import { store } from "../composables/api";
import { Anime } from "../types";

const list: Anime[] = reactive([]);

get_list();

async function get_list() {
    const res = await store("airing");
    const data = await res.json();
    list.splice(0, list.length, ...data);
}
</script>

<template>
    <div class="p-4">
        <h1 class="mb-4 text-2xl">本季新番</h1>
        <Fade>
            <AnimeList v-show="list.length" :list="list" />
        </Fade>
    </div>
</template>

<style scoped></style>
