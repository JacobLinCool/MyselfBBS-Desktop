import { Ref } from "vue";
import config from "../config";

export async function check_ready(ready: Ref<boolean>): Promise<boolean> {
    if (ready.value) {
        return true;
    }

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        const res = await fetch(config.backend + "/system/ready", { signal: controller.signal });
        if (res.ok) {
            ready.value = true;
            console.log("Server is ready.");
            return true;
        } else {
            throw new Error("Server is not ready");
        }
    } catch (e) {
        await new Promise((r) => setTimeout(r, 500));
        return check_ready(ready);
    }
}
