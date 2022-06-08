<script setup lang="ts">
import { onMounted, provide, ref } from "vue";
import AnimeDetail from "./components/AnimeDetail.vue";
import Fade from "./components/Fade.vue";
import Nav from "./components/Nav.vue";
import Player from "./components/Player.vue";
import { check_ready } from "./composables/ready";

const ready = ref(false);
const detail_selected = ref(0);
const player_hidden = ref(true);
const player_vid = ref("");
const player_ep = ref("");

provide("detail_selected", detail_selected);
provide("player_vid", player_vid);
provide("player_ep", player_ep);
provide("player_hidden", player_hidden);

onMounted(() => {
    check_ready(ready);
});
</script>

<template>
    <Nav class="h-12" />

    <div class="h-[calc(100%-3rem)] w-full overflow-y-auto">
        <router-view v-if="ready" v-slot="{ Component }">
            <Fade>
                <component :is="Component" />
            </Fade>
        </router-view>
    </div>

    <Fade>
        <AnimeDetail
            v-if="detail_selected !== 0"
            :id="detail_selected"
            :class="['z-20']"
            @close="detail_selected = 0"
        />
    </Fade>

    <Fade>
        <Player
            v-show="!player_hidden"
            :vid="player_vid"
            :ep="player_ep"
            :class="['z-30']"
            @close="player_hidden = true"
            @enter_pip="player_hidden = true"
            @leave_pip="player_hidden = false"
        />
    </Fade>
</template>

<style>
* {
    @apply relative text-white;
}
html,
body,
#app {
    @apply m-0 h-full w-full bg-slate-800 p-0;
}

#app {
    @apply flex flex-col;
}

.vjs-button > .vjs-icon-placeholder {
    top: -14px;
}
</style>
