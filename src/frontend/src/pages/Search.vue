<script lang="ts" setup>
import { reactive, ref } from "vue";
import AnimeList from "../components/AnimeList.vue";
import Fade from "../components/Fade.vue";
import { Anime } from "../types";

const query = ref("");
const suggestion = ref("");
const list: Anime[] = reactive([]);

const searching = ref(false);

update_suggestion();

async function search() {
    if (searching.value || !query.value) {
        return;
    }
    searching.value = true;

    const res = await fetch("/api/store/search?q=" + query.value);
    const data = await res.json();
    list.splice(0, list.length, ...data);

    searching.value = false;
}

async function update_suggestion() {
    const res = await fetch("/api/util/suggestion");
    const data = await res.json();
    suggestion.value = data.suggestion;
}
</script>

<template>
    <div class="p-4">
        <h1 class="mb-4 flex items-center text-2xl">
            搜尋：
            <input
                type="text"
                :placeholder="suggestion"
                v-model="query"
                @keyup.enter="search"
                @keyup.tab="
                    () => {
                        query = suggestion;
                        update_suggestion();
                        search();
                    }
                "
                @keydown.tab.prevent=""
                class="ml-2 rounded-lg border border-gray-600 bg-transparent p-2 transition-all hover:border-gray-400 focus:flex-1 focus:border-gray-400 focus:outline-none"
            />
        </h1>
        <Fade>
            <AnimeList :list="list" />
        </Fade>
    </div>
</template>

<style scoped></style>
