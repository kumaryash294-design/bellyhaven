/**
 * BellyHaven — Neural TTS Web Worker (Piper WebAssembly + ONNX Runtime Web)
 * Runs phonemization and ONNX waveform synthesis off the main UI thread,
 * caching WASM binaries and Hugging Face voice models in IndexedDB + CacheStorage.
 */

const IDB_NAME = 'bellyhaven-neural-tts-v1';
const IDB_VERSION = 1;
const IDB_STORE = 'assets';
const TTS_CACHE_NAME = 'bellyhaven-tts-assets-v1';

const DEFAULT_CONFIG = {
  piperTtsWebUrl: 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm',
  phonemizerUrl: 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-o91UDS6e.js/+esm',
  ortWasmUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/wasm/+esm',
  ortWasmMjsUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort-wasm-simd-threaded.mjs',
  ortWasmBinUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort-wasm-simd-threaded.wasm',
  piperWasmUrl: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
  piperDataUrl: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  hfBase: 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main',
  voiceId: 'en_US-hfc_female-medium'
};

const FALLBACK_VOICE_MAP = {
  'en_US-hfc_female-medium': 'en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx',
  'en_US-amy-low': 'en/en_US/amy/low/en_US-amy-low.onnx',
  'en_US-amy-medium': 'en/en_US/amy/medium/en_US-amy-medium.onnx'
};

let runtimeConfig = { ...DEFAULT_CONFIG };
let idbPromise = null;
let loadedVoiceId = null;
let initPromise = null;
let sessionState = null;

function openAssetDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'url' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return idbPromise;
}

async function readIdbAsset(url) {
  const db = await openAssetDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(url);
      req.onsuccess = () => {
        const record = req.result;
        if (record && record.buffer instanceof ArrayBuffer && record.buffer.byteLength > 0) {
          resolve(record.buffer);
        } else if (record && ArrayBuffer.isView(record.buffer) && record.buffer.byteLength > 0) {
          resolve(record.buffer.buffer.slice(
            record.buffer.byteOffset,
            record.buffer.byteOffset + record.buffer.byteLength
          ));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIdbAsset(url, buffer, mimeType) {
  const db = await openAssetDb();
  if (!db || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        url,
        mimeType: mimeType || 'application/octet-stream',
        buffer,
        cachedAt: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function readCacheStorageAsset(url) {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const match = await cache.match(url);
    if (!match || !match.ok) return null;
    const buffer = await match.arrayBuffer();
    return buffer && buffer.byteLength > 0 ? buffer : null;
  } catch {
    return null;
  }
}

async function writeCacheStorageAsset(url, buffer, mimeType) {
  if (typeof caches === 'undefined' || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    return false;
  }
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const response = new Response(buffer.slice(0), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.byteLength),
        'X-BellyHaven-Cached': '1'
      }
    });
    await cache.put(url, response);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithProgress(url, postProgress) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Failed to fetch neural TTS resource (${res.status}): ${url}`);
  }

  const total = Number(res.headers.get('Content-Length') || 0);
  if (!res.body || typeof res.body.getReader !== 'function') {
    const buffer = await res.arrayBuffer();
    if (postProgress) postProgress({ url, loaded: buffer.byteLength, total: total || buffer.byteLength });
    return buffer;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      chunks.push(value);
      loaded += value.byteLength;
      if (postProgress) {
        postProgress({ url, loaded, total });
      }
    }
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    combined.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  return combined.buffer;
}

async function fetchAssetCached(url, mimeType, postProgress) {
  const fromIdb = await readIdbAsset(url);
  if (fromIdb) {
    // Keep CacheStorage warm as well so offline Service Worker requests also succeed.
    writeCacheStorageAsset(url, fromIdb, mimeType);
    return { buffer: fromIdb, fromCache: true };
  }

  const fromCache = await readCacheStorageAsset(url);
  if (fromCache) {
    writeIdbAsset(url, fromCache, mimeType);
    return { buffer: fromCache, fromCache: true };
  }

  const buffer = await fetchWithProgress(url, postProgress);
  if (!buffer || buffer.byteLength === 0) {
    throw new Error(`Empty response for neural TTS asset: ${url}`);
  }

  await Promise.allSettled([
    writeIdbAsset(url, buffer, mimeType),
    writeCacheStorageAsset(url, buffer, mimeType)
  ]);

  return { buffer, fromCache: false };
}

function assertDeviceCapabilities() {
  if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
    throw new Error('WebAssembly is not supported on this device');
  }
  if (typeof BigInt !== 'function' || typeof BigInt64Array !== 'function') {
    throw new Error('BigInt64Array is required for ONNX Piper inference');
  }
  if (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 1) {
    throw new Error('Low-memory device detected; using native SpeechSynthesis fallback');
  }
}

function splitSentences(text, maxChunkChars = 360) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkChars) return [cleaned];

  const parts = cleaned.match(/[^.!?;\n]+[.!?;]*\s*/g) || [cleaned];
  const chunks = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = '';
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((current + part).length > maxChunkChars) {
      flush();
      if (part.length > maxChunkChars) {
        const words = part.split(/\s+/);
        let piece = '';
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          const next = piece ? `${piece} ${word}` : word;
          if (next.length > maxChunkChars) {
            if (piece.trim()) chunks.push(piece.trim());
            piece = word;
          } else {
            piece = next;
          }
        }
        current = piece;
      } else {
        current = part;
      }
    } else {
      current += part;
    }
  }
  flush();

  return chunks;
}

function encodeWav(samples, sampleRate) {
  const numChannels = 1;
  const headerBytes = 44;
  const dataBytes = samples.length * numChannels * 2;
  const view = new DataView(new ArrayBuffer(headerBytes + dataBytes));

  // RIFF chunk descriptor
  view.setUint32(0, 0x46464952, true); // 'RIFF'
  view.setUint32(4, 36 + dataBytes, true);
  view.setUint32(8, 0x45564157, true); // 'WAVE'

  // fmt sub-chunk
  view.setUint32(12, 0x20746d66, true); // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  view.setUint32(36, 0x61746164, true); // 'data'
  view.setUint32(40, dataBytes, true);

  let offset = headerBytes;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
    offset += 2;
  }

  return view.buffer;
}

async function ensureSession(requestedVoiceId, postProgress) {
  assertDeviceCapabilities();

  const targetVoiceId = requestedVoiceId || runtimeConfig.voiceId || 'en_US-hfc_female-medium';
  if (sessionState && loadedVoiceId === targetVoiceId) {
    return sessionState;
  }
  if (initPromise && loadedVoiceId === targetVoiceId) {
    return initPromise;
  }

  loadedVoiceId = targetVoiceId;
  initPromise = (async () => {
    let piperPkg = null;
    try {
      piperPkg = await import(runtimeConfig.piperTtsWebUrl);
    } catch {
      piperPkg = null;
    }

    const [{ createPiperPhonemize }, ortNamespace] = await Promise.all([
      import(runtimeConfig.phonemizerUrl),
      import(runtimeConfig.ortWasmUrl)
    ]);

    const ort = ortNamespace.default || ortNamespace;
    if (!ort || !ort.InferenceSession || !ort.Tensor) {
      throw new Error('ONNX Runtime Web failed to expose InferenceSession');
    }

    const hfBase = (piperPkg && piperPkg.HF_BASE) || runtimeConfig.hfBase;
    const pathMap = (piperPkg && piperPkg.PATH_MAP) || FALLBACK_VOICE_MAP;
    const modelRelPath = pathMap[targetVoiceId] || FALLBACK_VOICE_MAP[targetVoiceId];
    if (!modelRelPath) {
      throw new Error(`Unknown Piper voice ID: ${targetVoiceId}`);
    }

    const configUrl = `${hfBase}/${modelRelPath}.json`;
    const modelUrl = `${hfBase}/${modelRelPath}`;

    const [
      configRes,
      modelRes,
      piperWasmRes,
      piperDataRes,
      ortWasmRes
    ] = await Promise.all([
      fetchAssetCached(configUrl, 'application/json', postProgress),
      fetchAssetCached(modelUrl, 'application/octet-stream', postProgress),
      fetchAssetCached(runtimeConfig.piperWasmUrl, 'application/wasm', postProgress),
      fetchAssetCached(runtimeConfig.piperDataUrl, 'application/octet-stream', postProgress),
      fetchAssetCached(runtimeConfig.ortWasmBinUrl, 'application/wasm', postProgress),
      fetchAssetCached(runtimeConfig.ortWasmMjsUrl, 'application/javascript', null).catch(() => null)
    ]);

    const voiceConfig = JSON.parse(new TextDecoder().decode(configRes.buffer));

    if (ort.env) {
      if ('allowLocalModels' in ort.env) {
        ort.env.allowLocalModels = false;
      }
      if (ort.env.wasm) {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmBinary = new Uint8Array(ortWasmRes.buffer.slice(0));
        ort.env.wasm.wasmPaths = {
          mjs: runtimeConfig.ortWasmMjsUrl,
          wasm: runtimeConfig.ortWasmBinUrl
        };
      }
    }

    const inferenceSession = await ort.InferenceSession.create(
      new Uint8Array(modelRes.buffer),
      { executionProviders: ['wasm'] }
    );

    const allCached = Boolean(
      configRes.fromCache &&
      modelRes.fromCache &&
      piperWasmRes.fromCache &&
      piperDataRes.fromCache &&
      ortWasmRes.fromCache
    );

    sessionState = {
      voiceId: targetVoiceId,
      voiceConfig,
      inferenceSession,
      createPiperPhonemize,
      ort,
      piperWasmBuffer: piperWasmRes.buffer,
      piperDataBuffer: piperDataRes.buffer,
      allCached
    };

    return sessionState;
  })();

  try {
    return await initPromise;
  } catch (err) {
    loadedVoiceId = null;
    initPromise = null;
    sessionState = null;
    throw err;
  }
}

async function phonemizeChunk(session, chunkText) {
  const inputJson = JSON.stringify([{ text: chunkText.trim() }]);
  const espeakVoice = (session.voiceConfig.espeak && session.voiceConfig.espeak.voice) || 'en-us';

  return new Promise((resolve, reject) => {
    let settled = false;
    session.createPiperPhonemize({
      wasmBinary: session.piperWasmBuffer.slice(0),
      getPreloadedPackage: () => session.piperDataBuffer.slice(0),
      print: (line) => {
        if (settled) return;
        try {
          const parsed = JSON.parse(line);
          if (parsed && Array.isArray(parsed.phoneme_ids)) {
            settled = true;
            resolve(parsed.phoneme_ids);
          }
        } catch (err) {
          settled = true;
          reject(err);
        }
      },
      printErr: (errText) => {
        if (settled) return;
        settled = true;
        reject(new Error(errText || 'Piper phonemizer error'));
      },
      locateFile: (file) => {
        if (file.endsWith('.wasm')) return runtimeConfig.piperWasmUrl;
        if (file.endsWith('.data')) return runtimeConfig.piperDataUrl;
        return file;
      }
    }).then((mod) => {
      mod.callMain(['-l', espeakVoice, '--input', inputJson, '--espeak_data', '/espeak-ng-data']);
    }).catch((err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

async function synthesizeText(text, voiceId, postProgress) {
  const session = await ensureSession(voiceId, postProgress);
  const sampleRate = (session.voiceConfig.audio && session.voiceConfig.audio.sample_rate) || 22050;
  const inf = session.voiceConfig.inference || {};
  const noiseScale = typeof inf.noise_scale === 'number' ? inf.noise_scale : 0.667;
  const lengthScale = typeof inf.length_scale === 'number' ? inf.length_scale : 1.04;
  const noiseW = typeof inf.noise_w === 'number' ? inf.noise_w : 0.8;
  const hasSpeakers = session.voiceConfig.speaker_id_map &&
    Object.keys(session.voiceConfig.speaker_id_map).length > 0;

  const chunks = splitSentences(text);
  if (chunks.length === 0) {
    throw new Error('No text provided for synthesis');
  }

  const pcmSegments = [];
  let totalSamples = 0;

  for (let i = 0; i < chunks.length; i++) {
    const phonemeIds = await phonemizeChunk(session, chunks[i]);
    if (!phonemeIds || phonemeIds.length === 0) continue;

    const inputIds = BigInt64Array.from(phonemeIds, (v) => BigInt(v));
    const inputLengths = BigInt64Array.from([BigInt(phonemeIds.length)]);
    const scales = new Float32Array([noiseScale, lengthScale, noiseW]);

    const feeds = {
      input: new session.ort.Tensor('int64', inputIds, [1, phonemeIds.length]),
      input_lengths: new session.ort.Tensor('int64', inputLengths, [1]),
      scales: new session.ort.Tensor('float32', scales, [3])
    };

    if (hasSpeakers) {
      feeds.sid = new session.ort.Tensor('int64', BigInt64Array.from([BigInt(0)]), [1]);
    }

    const results = await session.inferenceSession.run(feeds);
    const outTensor = results.output || Object.values(results)[0];
    if (outTensor && outTensor.data) {
      const segment = outTensor.data instanceof Float32Array
        ? new Float32Array(outTensor.data)
        : Float32Array.from(outTensor.data);
      pcmSegments.push(segment);
      totalSamples += segment.length;
    }
  }

  if (totalSamples === 0) {
    throw new Error('ONNX synthesis produced empty audio stream');
  }

  const merged = new Float32Array(totalSamples);
  let cursor = 0;
  for (let i = 0; i < pcmSegments.length; i++) {
    merged.set(pcmSegments[i], cursor);
    cursor += pcmSegments[i].length;
  }

  const wavBuffer = encodeWav(merged, sampleRate);
  return {
    wavBuffer,
    sampleRate,
    voiceId: session.voiceId,
    cached: session.allCached
  };
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  const id = msg.id;

  if (msg.type === 'configure') {
    if (msg.config && typeof msg.config === 'object') {
      runtimeConfig = { ...runtimeConfig, ...msg.config };
    }
    if (id !== undefined) {
      self.postMessage({ id, ok: true, configured: true });
    }
    return;
  }

  if (msg.type === 'warmup') {
    try {
      const session = await ensureSession(msg.voiceId, (progress) => {
        self.postMessage({ id, type: 'progress', progress });
      });
      self.postMessage({
        id,
        ok: true,
        voiceId: session.voiceId,
        cached: session.allCached
      });
    } catch (err) {
      self.postMessage({
        id,
        ok: false,
        error: err && err.message ? err.message : 'Unable to initialize Piper neural voice'
      });
    }
    return;
  }

  if (msg.type === 'synthesize') {
    try {
      const result = await synthesizeText(msg.text, msg.voiceId, (progress) => {
        self.postMessage({ id, type: 'progress', progress });
      });
      self.postMessage(
        {
          id,
          ok: true,
          wavBuffer: result.wavBuffer,
          sampleRate: result.sampleRate,
          voiceId: result.voiceId,
          cached: result.cached
        },
        [result.wavBuffer]
      );
    } catch (err) {
      self.postMessage({
        id,
        ok: false,
        error: err && err.message ? err.message : 'Neural speech synthesis failed'
      });
    }
  }
};
