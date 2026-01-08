import { Store } from "@tauri-apps/plugin-store";

const STORE_FILE_NAME = "app-data.json";

let storeInstance: Store | null = null;
let storePromise: Promise<Store> | null = null;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function getAppStore(): Promise<Store> {
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

// Funções para gerenciar flags de boas-vindas e tutorial
export async function hasSeenWelcome(): Promise<boolean> {
  try {
    if (!isTauri()) {
      // Modo web - usar localStorage
      return localStorage.getItem("upload-iasd-welcome-seen") === "true";
    }

    // Modo Tauri - usar plugin-store
    const store = await getAppStore();
    const value = await store.get<boolean>("welcome-seen");
    // Se o valor não existir ou for null/undefined, retornar false (não visto)
    return value === true;
  } catch (error) {
    // Em caso de erro, assumir que não viu (retornar false)
    console.error("Erro ao verificar welcome-seen:", error);
    return false;
  }
}

export async function setWelcomeSeen(seen: boolean = true): Promise<void> {
  try {
    if (!isTauri()) {
      // Modo web - usar localStorage
      if (seen) {
        localStorage.setItem("upload-iasd-welcome-seen", "true");
      } else {
        localStorage.removeItem("upload-iasd-welcome-seen");
      }
      return;
    }

    // Modo Tauri - usar plugin-store
    const store = await getAppStore();
    await store.set("welcome-seen", seen);
    await store.save();
  } catch (error) {
    console.error("Erro ao salvar welcome-seen:", error);
  }
}

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    if (!isTauri()) {
      // Modo web - usar localStorage
      return localStorage.getItem("upload-iasd-tutorial-seen") === "true";
    }

    // Modo Tauri - usar plugin-store
    const store = await getAppStore();
    const value = await store.get<boolean>("tutorial-seen");
    // Se o valor não existir ou for null/undefined, retornar false (não visto)
    return value === true;
  } catch (error) {
    // Em caso de erro, assumir que não viu (retornar false)
    console.error("Erro ao verificar tutorial-seen:", error);
    return false;
  }
}

// Função para resetar (limpar cache) - útil para testes
export async function resetWelcomeAndTutorial(): Promise<void> {
  try {
    if (!isTauri()) {
      localStorage.removeItem("upload-iasd-welcome-seen");
      localStorage.removeItem("upload-iasd-tutorial-seen");
      return;
    }

    const store = await getAppStore();
    await store.delete("welcome-seen");
    await store.delete("tutorial-seen");
    await store.save();
  } catch (error) {
    console.error("Erro ao resetar welcome/tutorial:", error);
  }
}

export async function setTutorialSeen(seen: boolean = true): Promise<void> {
  try {
    if (!isTauri()) {
      // Modo web - usar localStorage
      if (seen) {
        localStorage.setItem("upload-iasd-tutorial-seen", "true");
      } else {
        localStorage.removeItem("upload-iasd-tutorial-seen");
      }
      return;
    }

    // Modo Tauri - usar plugin-store
    const store = await getAppStore();
    await store.set("tutorial-seen", seen);
    await store.save();
  } catch (error) {
    console.error("Erro ao salvar tutorial-seen:", error);
  }
}

