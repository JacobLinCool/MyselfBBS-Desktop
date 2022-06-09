<script setup lang="ts">
import videojs, { VideoJsPlayer } from "video.js";
import "videojs-sprite-thumbnails";
import { Ref, inject, ref, watch } from "vue";
import { get, post, store } from "../composables/api";
import config from "../config";
import { Anime } from "../types";

const props = defineProps<{
    vid: string;
    ep: string;
}>();

const emit = defineEmits<{
    (event: "close"): void;
    (event: "enter_pip"): void;
    (event: "leave_pip"): void;
}>();

const wrapper = ref<HTMLDivElement>();
let video: VideoJsPlayer | undefined;
let last_update = 0;
let anime = ref<Anime>();

const player_vid = inject<Ref<string>>("player_vid");
const player_ep = inject<Ref<string>>("player_ep");

watch(props, () => {
    if (video) {
        video.dispose();
        video = undefined;
    }

    let elm: HTMLVideoElement | undefined;
    if (wrapper) {
        elm = document.createElement("video");
        elm.classList.add(
            "video-js",
            "w-full",
            "bg-gray-900",
            "max-h-4/5",
            "min-h-3/5",
            "focus:outline-none",
        );
        wrapper.value?.appendChild(elm);
    }

    if (props.vid && props.ep && elm) {
        video = videojs(elm, {
            controls: true,
            autoplay: true,
            preload: "auto",
            sources: [
                {
                    src: `${config.backend}/${props.vid}/${props.ep}/index.m3u8`,
                    type: "application/x-mpegURL",
                },
            ],
            poster: `${config.backend}/store/cover?id=${props.vid}`,
            userActions: {
                // @ts-ignore
                hotkeys(event: KeyboardEvent) {
                    if (event.code === "Space") {
                        video?.paused() ? video?.play() : video?.pause();
                    } else if (event.code === "ArrowRight") {
                        video?.currentTime(video?.currentTime() + 5);
                    } else if (event.code === "ArrowLeft") {
                        video?.currentTime(video?.currentTime() - 5);
                    } else if (event.code === "ArrowUp") {
                        video?.volume(video?.volume() + 0.1);
                    } else if (event.code === "ArrowDown") {
                        video?.volume(video?.volume() - 0.1);
                    } else if (event.code === "KeyM") {
                        video?.muted(!video?.muted());
                    } else if (event.code === "KeyF") {
                        video?.isFullscreen()
                            ? video?.exitFullscreen()
                            : video?.requestFullscreen();
                    }
                },
            },
        });

        elm.focus();

        last_update = 0;
        anime.value = undefined;

        get(`${props.vid}/${props.ep}/status`)
            .then((res) => res.json())
            .then((data) => {
                if (
                    video &&
                    data.status?.watched &&
                    data.status.watched > 5 &&
                    data.status.watched < (video.duration() || 86400) - 5
                ) {
                    video.currentTime(data.status.watched - 2);
                    last_update = data.status.watched;
                }
            });

        store("info", { id: props.vid })
            .then((res) => res.json())
            .then((data) => (anime.value = data));

        // @ts-ignore
        video.spriteThumbnails({
            url: `${config.backend}/${props.vid}/${props.ep}/sprite.jpg`,
            width: 192,
            height: 108,
        });

        video.on("pause", () => {
            video?.one("play", () => {
                video?.play();
            });
        });

        video.on("enterpictureinpicture", () => {
            emit("enter_pip");
        });

        video.on("leavepictureinpicture", () => {
            emit("leave_pip");
        });

        let preloaded = false;
        video.on("timeupdate", () => {
            if (
                props.vid &&
                props.ep &&
                video &&
                video.readyState() >= 2 &&
                video.currentTime() > video.duration() - 300 &&
                preloaded === false
            ) {
                preloaded = true;
                preload_next();
            }
        });

        video.on("ended", () => {
            if (anime.value) {
                const ani = anime.value;
                const eps = Object.values(ani.episodes);
                const idx = eps.findIndex((x) => x[1] === props.ep);

                if (idx >= 0 && idx < eps.length - 1) {
                    if (player_vid && player_ep) {
                        player_vid.value = eps[idx + 1][0];
                        player_ep.value = eps[idx + 1][1];
                    }
                }
            }
        });
    }
});

function close(payload: MouseEvent) {
    video?.pause();

    if (payload.target === payload.currentTarget) {
        emit("close");
    }
}

async function update() {
    if (props.vid && props.ep && video && video.readyState() >= 2) {
        const time = Math.floor(video.currentTime() * 100) / 100;

        if (time < last_update + 1) {
            return;
        }

        const vid = props.vid,
            ep = props.ep;

        const res = await post(`${vid}/${ep}/watched`, { watched: time });

        if (res.ok) {
            console.log("update", time, await res.json());

            if (props.vid === vid && props.ep === ep) {
                last_update = time;
            }
        } else {
            console.error("failed to update", res.status);
        }
    }
}

async function preload_next() {
    if (anime.value) {
        const ani = anime.value;
        const eps = Object.values(ani.episodes);
        const idx = eps.findIndex((x) => x[1] === props.ep);

        if (idx >= 0 && idx < eps.length - 1) {
            get(`${eps[idx + 1][0]}/${eps[idx + 1][1]}/index.m3u8`);
        }
    }
}

setInterval(update, 3000);
</script>

<template>
    <div
        class="fixed flex h-full w-full items-center justify-center bg-gray-900/60"
        @click="close"
        ref="wrapper"
    ></div>
</template>

<style>
video:focus {
    outline: none;
}
</style>
