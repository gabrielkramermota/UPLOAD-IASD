import { Store } from "@tauri-apps/plugin-store";

const STORE_FILE_NAME = "settings.json";

let storeInstance: Store | null = null;
let storePromise: Promise<Store> | null = null;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function getSettingsStore(): Promise<Store> {
  if (!isTauri()) {
    return Promise.reject(
      new Error("Tauri não disponível. Rode com `tauri dev`.")
    );
  }

  if (storeInstance) {
    return Promise.resolve(storeInstance);
  }

  if (storePromise) {
    return storePromise;
  }

  storePromise = Store.load(STORE_FILE_NAME).then((store) => {
    storeInstance = store;
    storePromise = null;
    return store;
  });

  return storePromise;
}
