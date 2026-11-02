/** Reads an NDJSON response body, calling onEvent for each parsed line. */
export async function readNdjson<T>(res: Response, onEvent: (e: T) => void) {
  if (!res.body) throw new Error("Empty response");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const raw = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (raw) onEvent(JSON.parse(raw) as T);
    }
    if (done) break;
  }
}
