<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { post } from "../composables/api";
import { check_ready } from "../composables/ready";
import raw_config, { default_endpoint } from "../config";

const restarting = ref(false);
const router = useRouter();
const config = reactive(raw_config);

async function system(body: Record<string, string>) {
    return await post("system", body);
}

async function restart() {
    if (restarting.value) {
        return;
    }

    restarting.value = true;
    const data = await (await system({ action: "stop" })).json();
    if (data.ok) {
        await new Promise((r) => setTimeout(r, 1000));
        let ready = ref(false);
        await check_ready(ready);
        window.alert("Backend Server Restarted!");
        router.push("/");
    }
}
</script>

<template>
    <div class="p-4">
        <h1 class="mb-4 text-2xl">設定</h1>

        <div class="input">
            <label for="endpoint">連接至 </label>
            <input
                id="endpoint"
                type="text"
                :placeholder="default_endpoint"
                v-model="config.backend"
                title="press enter key to apply"
            />
        </div>

        <button @click="restart" :disabled="restarting">重新啟動</button>
        <br />

        <router-link to="/about">
            <button>關於</button>
        </router-link>
    </div>
</template>

<style scoped>
button {
    @apply disabled:grayscale-75 my-2 rounded-full bg-sky-400/20 py-2 px-4 text-sky-400 filter transition-all hover:bg-sky-300/20 hover:text-sky-300 focus:outline-none;
}

.input {
    @apply max-w-120 my-2 flex w-full rounded-lg border border-gray-600 px-4 py-2 transition-all hover:border-gray-400 focus:border-gray-400;
}
.input label {
    @apply border-r border-gray-600 pr-2;
}
.input input[type="text"] {
    @apply ml-2 flex-1 bg-transparent focus:outline-none;
}
</style>
