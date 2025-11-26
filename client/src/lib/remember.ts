// Utilidades para recordar de forma segura el identificador de usuario (NO contraseña)
// Usa WebCrypto AES-GCM con una clave aleatoria almacenada localmente.

const KEY_STORAGE = "remember_key_v1";
const REMEMBER_ITEM = "remember_user_id";

async function getOrCreateKey(): Promise<CryptoKey> {
  // guardamos una clave cruda aleatoria en localStorage para derivar CryptoKey
  let raw = localStorage.getItem(KEY_STORAGE);
  if (!raw) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = Array.from(bytes).join(",");
    localStorage.setItem(KEY_STORAGE, raw);
  }
  const bytes = Uint8Array.from(raw.split(",").map((x) => parseInt(x, 10)));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function rememberSet(identifier: string): Promise<void> {
  try {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(identifier);
    const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    const payload = btoa(
      JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(enc)) })
    );
    localStorage.setItem(REMEMBER_ITEM, payload);
  } catch {
    // fallback en claro si WebCrypto falla (entornos raros)
    localStorage.setItem(REMEMBER_ITEM, identifier);
  }
}

export async function rememberGet(): Promise<string | null> {
  const payload = localStorage.getItem(REMEMBER_ITEM);
  if (!payload) return null;
  // detectar si es JSON cifrado o texto plano
  if (/^[-A-Za-z0-9+/=]+$/.test(payload)) {
    try {
      const { iv, data } = JSON.parse(atob(payload));
      const key = await getOrCreateKey();
      const dec = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );
      return new TextDecoder().decode(dec);
    } catch {
      return null;
    }
  }
  return payload;
}

export function rememberClear(): void {
  localStorage.removeItem(REMEMBER_ITEM);
}

