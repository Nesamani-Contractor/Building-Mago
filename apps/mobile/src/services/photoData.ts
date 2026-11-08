/** In-memory base64 of photos taken during a scan (sent once for reading in live mode, never stored). */
const map = new Map<string, string>();

export const photoData = {
  set: (uri: string, b64: string) => map.set(uri, b64),
  get: async (uri: string) => map.get(uri) ?? null,
  clear: () => map.clear(),
};
