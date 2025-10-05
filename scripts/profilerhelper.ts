// Firestore rules test instrumentation (no runtime deps).
let fileStart = 0;
const writes: { label: string; bytes: number }[] = [];

export function profilerStart(label: string) {
  fileStart = Date.now();
  console.log(`[rules-profiler] START ${label}`);
}

export function profilerRecord(label: string, data: unknown) {
  try {
    const json = JSON.stringify(data ?? {});
    const bytes = Buffer.byteLength(json);
    writes.push({ label, bytes });
    if (bytes > 250_000) {
      console.warn(`[rules-profiler] LARGE_DOC label=${label} bytes=${bytes}`);
    }
  } catch {
    /* ignore */
  }
}

export function profilerEnd(label: string) {
  const dur = Date.now() - fileStart;
  const total = writes.reduce((a, b) => a + b.bytes, 0);
  const max = writes.reduce((m, b) => (b.bytes > m ? b.bytes : m), 0);
  console.log(
    `[rules-profiler] END ${label} durationMs=${dur} writes=${writes.length} maxDocBytes=${max} totalBytes=${total}`
  );
}
