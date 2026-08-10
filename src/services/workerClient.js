import PdfWorker from '../workers/pdfWorker?worker';

let worker = null;
let seq = 0;
const pending = new Map();

/**
 * One-liner bridge to the shared pdf worker.
 * `transfer` is the list of ArrayBuffers handed over (zero-copy; sender
 * side is detached afterwards). Resolves with the worker's `data` payload
 * (ArrayBuffer / Uint8Array / Blob[] depending on the op).
 */
export const callWorker = (type, payload, transfer = []) =>
  new Promise((resolve, reject) => {
    if (!worker) {
      worker = new PdfWorker();
      worker.onerror = () => {
        for (const entry of pending.values()) entry.reject(new Error('Worker crashed'));
        pending.clear();
      };
      worker.onmessage = (e) => {
        const { id, ...msg } = e.data;
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        if (msg.type.endsWith('-ok')) entry.resolve(msg.data);
        else entry.reject(new Error(msg.message || 'Worker failed'));
      };
    }
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...payload }, transfer);
  });

export const terminatePdfWorker = () => {
  worker?.terminate();
  worker = null;
  pending.clear();
};