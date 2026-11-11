(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyHavenBabyNotes = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Curated weekly letters written from baby's perspective (Weeks 4–40, plus 41–42).
   */
  const BABY_NOTES = {
    4: {
      title: 'Hello, Mama',
      message:
        'I am just the size of a tiny poppy seed right now, settling softly into my cozy new home inside you. Even before you feel a thing, my very first cells are working around the clock because you already hold me so safely.',
      signOff: 'With tiny beginnings, Baby'
    },
    5: {
      title: 'My First Little Spark',
      message:
        'As small as a sesame seed, I just began forming my very first rhythmic pulse—a tiny flutter echoing beside your own steady heart. Take a deep breath today, Mama; we have all the time in the world to grow together.',
      signOff: 'Nestled close, Baby'
    },
    6: {
      title: 'Curled Up Like a Lentil',
      message:
        'Little buds are appearing where my arms and legs will one day reach up to hug you. If you feel extra sleepy or queasy this week, please rest guilt-free—I am building big dreams in here.',
      signOff: 'Sleepy & growing, Baby'
    },
    7: {
      title: 'Blueberry Dreams',
      message:
        'My brain hemispheres are blossoming faster than stars in the night sky, and tiny shadows are shaping where my eyes and sweet button nose will be. Thank you for every sip of water and gentle nap you give us.',
      signOff: 'Growing brightly, Baby'
    },
    8: {
      title: 'My Very First Stretches',
      message:
        'Did you know I already wiggle my tiny raspberry-sized body? I am far too weightless for you to feel yet, though my microscopic fingers and toes are unfurling like petals waiting for your touch.',
      signOff: 'Wiggling softly, Baby'
    },
    9: {
      title: 'Cherry-Sized Heartbeats',
      message:
        'My tiny heart now has all four chambers beating strong and clear like a little drum beside yours. Whenever you place your hand on your belly, it feels like warmth shining right into my quiet world.',
      signOff: 'Always listening, Baby'
    },
    10: {
      title: 'Past the Earliest Milestones',
      message:
        'All of my essential organs are in place now, Mama, and I am officially kicking off my fetal growth journey! Even tiny tooth buds are tucked neatly beneath my gums for the first smile I will give you.',
      signOff: 'Smiling in waiting, Baby'
    },
    11: {
      title: 'Tiny Fig Fists',
      message:
        'This week I practiced opening and closing my microscopic hands into little fists. One day soon, these very fingers will wrap tightly around yours and refuse to let go.',
      signOff: 'Reaching for you soon, Baby'
    },
    12: {
      title: 'New Reflexes & Sommersaults',
      message:
        'I am the size of a ripe plum and discovering how fun it is to stretch and curl my toes! Thank you for carrying me patiently through these quiet first-trimester days.',
      signOff: 'Dancing softly, Baby'
    },
    13: {
      title: 'One-of-a-Kind Fingerprints',
      message:
        'We made it through the first trimester together, Mama! This week my tiny fingertips are tracing swirled patterns that nobody else in the entire universe will ever share.',
      signOff: 'Uniquely yours, Baby'
    },
    14: {
      title: 'Practicing Tiny Expressions',
      message:
        'Inside my warm amber glow, I am trying out little squints, frowns, and peaceful sighs with brand-new facial muscles. I hope the second trimester brings a bright burst of energy your way.',
      signOff: 'Warm & cozy, Baby'
    },
    15: {
      title: 'Seeing Soft Sunlight',
      message:
        'Even though my eyelids are still sealed gently shut, I can sense soft amber light when sunshine falls across your belly. Keep stepping into the light, Mama—it feels wonderful in here.',
      signOff: 'Basking in your warmth, Baby'
    },
    16: {
      title: 'I Can Hear Your Voice Now',
      message:
        'My little ears finished moving into place, and my favorite symphony is the low rumble of your voice and the steady whoosh of your heartbeat. Talk or sing to me anytime—I already know it is you.',
      signOff: 'Your biggest fan, Baby'
    },
    17: {
      title: 'Getting Stronger Every Day',
      message:
        'My soft cartilage skeleton is steadily turning into sturdy bone while I practice grasping my umbilical cord. Every nourishing meal you enjoy helps build me stronger.',
      signOff: 'Growing sturdy, Baby'
    },
    18: {
      title: 'Yawns & Secret Hiccups',
      message:
        'Have you felt a tiny butterfly flutter or bubble pop yet? That might be me doing a big stretch or having quiet hiccups after sipping a taste of warm amniotic fluid.',
      signOff: 'Fluttering gently, Baby'
    },
    19: {
      title: 'Wrapped in Cozy Comfort',
      message:
        'A silky protective layer called vernix just began blanketing my skin like soft lotion while I float weightlessly inside you. Nothing in the world could feel safer than right here.',
      signOff: 'Snuggled tight, Baby'
    },
    20: {
      title: 'Halfway to Meeting You!',
      message:
        'Look how far we have come—twenty weeks together, Mama! My hearing and taste buds are sharpening, and I love doing happy little tumbles whenever you pause to rest.',
      signOff: 'Halfway there, Baby'
    },
    21: {
      title: 'Eyebrows & Sweet Kicks',
      message:
        'Tiny eyelashes and delicate eyebrows just framed my face, and my legs are strong enough to send real little thumps your way. Keep your hand on your bump—I love saying hello back!',
      signOff: 'Kicking with love, Baby'
    },
    22: {
      title: 'Exploring by Touch',
      message:
        'Right now I am discovering the world with my hands—stroking my own cheeks, clasping my ankles, and floating through my peaceful sanctuary while your voice hums softly above me.',
      signOff: 'Curious & calm, Baby'
    },
    23: {
      title: 'Practicing Big Breaths',
      message:
        'My lungs are rehearsing tiny rhythmic breathing motions to prepare for our very first breath of fresh air together. Take a slow, soothing breath for yourself right now, Mama.',
      signOff: 'Breathing with you, Baby'
    },
    24: {
      title: 'Sweet Rhythms & Dreams',
      message:
        'I have started keeping cozy little sleep-and-wake cycles of my own—often drifting off while your daytime footsteps rock me to sleep, then waking up for midnight somersaults!',
      signOff: 'Your night owl, Baby'
    },
    25: {
      title: 'Recognizing Familiar Voices',
      message:
        'Not only do I know your heartbeat by heart, Mama, I am beginning to recognize the warm voices of the people who love you most when they speak close to your belly.',
      signOff: 'Listening closely, Baby'
    },
    26: {
      title: 'Opening My Eyes for the First Time',
      message:
        'For the very first time this week, I fluttered my eyelids open inside my soft rose-colored world! Everything is gentle here while my optic nerves prepare to see your smile.',
      signOff: 'Dreaming of your face, Baby'
    },
    27: {
      title: 'Brainwaves & Quiet Wonder',
      message:
        'As we wrap up the second trimester, my brain is weaving millions of tender connections—perhaps even dreaming my very first baby dreams of your warmth and rhythmic sway.',
      signOff: 'Dreaming softly, Baby'
    },
    28: {
      title: 'Welcome to the Home Stretch!',
      message:
        'Third trimester, Mama! My tiny eyelashes are complete and I blink freely now. Every roll and nudge is my secret way of reminding you that we are getting closer every single day.',
      signOff: 'Almost there, Baby'
    },
    29: {
      title: 'Filling Out Chubby Cheeks',
      message:
        'I am adding cozy layers of warm baby fat beneath my skin this week, shaping soft cheeks made specifically for your kisses. Thank you for taking such tender care of both of us.',
      signOff: 'Getting rounder, Baby'
    },
    30: {
      title: 'Counting Down Together',
      message:
        'Only ten weeks to go until your arms replace this cozy womb! My brain is folding into clever ridges and my grip gets firmer every day as I get ready to hold your pinky finger.',
      signOff: 'Ten weeks away, Baby'
    },
    31: {
      title: 'Using All Five Senses',
      message:
        'Sight, sound, touch, taste, and warmth—all my senses are awake! I can even taste hints of your favorite meals and calm down instantly when you rub gentle circles over your belly.',
      signOff: 'Soothed by you, Baby'
    },
    32: {
      title: 'Toenails, Fingernails & Hiccups',
      message:
        'Every tiny fingernail and toenail has reached the tips of my fingers and toes! I am running out of somersault room, so pardon my elbows when I stretch out sideways.',
      signOff: 'Running out of elbow room, Baby'
    },
    33: {
      title: 'Stronger Bones, Soft Cradle',
      message:
        'Most of my bones are firm and strong now while my skull stays gently flexible to help me navigate safely into your arms. Thank you for every extra pillow you tuck behind your back tonight.',
      signOff: 'Safe in your strength, Baby'
    },
    34: {
      title: 'Listening for Lullabies',
      message:
        'Play your favorite gentle song or hum while you fold tiny clothes—after birth, the melodies I heard inside you will soothe me faster than anything else on earth.',
      signOff: 'Humming along, Baby'
    },
    35: {
      title: 'Cozy Rolls & Gentle Nudges',
      message:
        'It is getting delightfully snug in here, so my punches and kicks have turned into slow, rolling stretches. Whenever you pause to count my kicks, I love checking right back in with you.',
      signOff: 'Counting with you, Baby'
    },
    36: {
      title: 'Getting Lower, Getting Ready',
      message:
        'My cheeks are plump and smooth, and I may start settling a little lower into your pelvis soon so you can take an easier breath. We are truly on the threshold now, Mama.',
      signOff: 'Getting closer, Baby'
    },
    37: {
      title: 'Early Term Ready',
      message:
        'I am practicing sucking my thumb and rehearsing smooth breathing movements all week long. Your patience through heavy ankles and sleepless nights is pure magic to me.',
      signOff: 'Ready for cuddles, Baby'
    },
    38: {
      title: 'Putting on Final Touches',
      message:
        'Every organ system is tuned and ready for life on the outside, Mama. I am simply soaking up these last golden days wrapped safely beneath your heart.',
      signOff: 'Nearly in your arms, Baby'
    },
    39: {
      title: 'Full Term & Full of Love',
      message:
        'Full term! My lungs and brain are adding their final polish while we wait patiently for our exact birthday to arrive. Trust your amazing body—you were made for this moment.',
      signOff: 'Waiting on your cue, Baby'
    },
    40: {
      title: 'Birthday Week Is Here!',
      message:
        'Happy due week, Mama! Look in the mirror and breathe in how strong and brave you are. Whether today or just a few days from now, the very next face I see will be yours—and I cannot wait.',
      signOff: 'See you so soon, Baby'
    },
    41: {
      title: 'Taking My Sweet Time',
      message:
        'Your heartbeat is simply too cozy to rush! Doctors keep close watch on us in late term, so rest up, drink plenty of water, and know I am packing extra cheek dimples for you.',
      signOff: 'Still snuggled in, Baby'
    },
    42: {
      title: 'Right Around the Corner',
      message:
        'Any hour or day now, Mama! Thank you for carrying me every single step of this extraordinary journey—our very first skin-to-skin hug is moments away.',
      signOff: 'All my love forever, Baby'
    }
  };

  function getBabyNote(week, userName) {
    const num = Number.parseInt(week, 10);
    const clamped = Number.isFinite(num) ? Math.max(4, Math.min(42, num)) : 4;
    const entry = BABY_NOTES[clamped] || BABY_NOTES[4];
    const cleanName = typeof userName === 'string' ? userName.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    let title = entry.title;
    if (cleanName) {
      if (/^Hello,\s*Mama\b/i.test(entry.title)) {
        title = `Hello, Mama ${cleanName}`;
      } else {
        title = `Hello, Mama ${cleanName} — ${entry.title}`;
      }
    }
    return {
      week: clamped,
      title,
      message: entry.message,
      signOff: entry.signOff
    };
  }

  function pickGentleVoice(synth) {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    const voices = synth.getVoices() || [];
    if (voices.length === 0) return null;

    const englishVoices = voices.filter((v) => v && typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    const preferredTokens = ['samantha', 'ava', 'allison', 'serena', 'victoria', 'aria', 'jenny', 'zira', 'karen', 'natural', 'female'];
    for (let i = 0; i < preferredTokens.length; i++) {
      const token = preferredTokens[i];
      const match = pool.find((v) => (v.name || '').toLowerCase().includes(token));
      if (match) return match;
    }

    return pool.find((v) => v.default) || pool[0] || null;
  }

  function normalizeSpeechText(noteObj) {
    const rawParts = [noteObj && noteObj.title, noteObj && noteObj.message, noteObj && noteObj.signOff]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .filter(Boolean);

    const punctuated = rawParts.map((part) => (/[.!?…]$/.test(part) ? part : `${part}.`));
    return punctuated
      .join(' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function createSpeechReader(options = {}) {
    const win = typeof window !== 'undefined' ? window : null;
    const synthApi = options.synth !== undefined ? options.synth : (win && win.speechSynthesis) || null;
    const UtteranceCtor = options.UtteranceCtor !== undefined
      ? options.UtteranceCtor
      : (win && win.SpeechSynthesisUtterance) || null;
    const piperConfig = {
      workerUrl: './js/piper-worker.js',
      voiceId: 'en_US-hfc_female-medium',
      ...((win && win.BELLYHAVEN_PIPER_CONFIG) || {}),
      ...(options.piperConfig || {})
    };

    const wavCache = new Map();
    const pendingRequests = new Map();
    let requestCounter = 0;
    let workerInstance = null;
    let workerConfigured = false;
    let state = 'idle'; // 'idle' | 'loading' | 'playing' | 'paused'
    let activeRunId = 0;
    let activeMode = null; // 'neural-audio' | 'neural-webaudio' | 'speech-synthesis'
    let activeCallbacks = {};
    let activeUtterance = null;
    let activeAudio = null;
    let activeObjectUrl = null;
    let activeAudioCtx = null;
    let activeBufferSource = null;
    let decodedAudioBuffer = null;
    let webAudioStartedAt = 0;
    let webAudioOffsetSec = 0;
    let synthFallbackUsed = false;

    function hasSystemSpeechSupport() {
      return Boolean(synthApi && typeof synthApi.speak === 'function' && UtteranceCtor);
    }

    function hasNeuralTtsSupport() {
      if (options.disableNeural === true) return false;
      if (typeof options.isLowMemory === 'function' && options.isLowMemory()) return false;
      if (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 1) {
        return false;
      }

      const hasWorker = typeof options.workerFactory === 'function' || typeof Worker === 'function';
      const hasWasm = options.workerFactory ? true : typeof WebAssembly === 'object';
      const hasPlayback =
        typeof options.audioFactory === 'function' ||
        typeof Audio === 'function' ||
        Boolean(win && (win.AudioContext || win.webkitAudioContext));

      return Boolean(hasWorker && hasWasm && hasPlayback);
    }

    function isSupported() {
      return hasNeuralTtsSupport() || hasSystemSpeechSupport();
    }

    function emitStateChange(nextState, detail = {}) {
      state = nextState;
      if (typeof activeCallbacks.onStateChange === 'function') {
        activeCallbacks.onStateChange(nextState, detail);
      }
    }

    function cleanupAudioPlayback() {
      if (activeAudio) {
        try {
          activeAudio.onended = null;
          activeAudio.onerror = null;
          activeAudio.pause();
          if ('src' in activeAudio) activeAudio.src = '';
        } catch (_) {
          // Ignore HTML5 audio cleanup failures
        }
        activeAudio = null;
      }

      if (activeObjectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(activeObjectUrl);
        } catch (_) {
          // Ignore revoke failures
        }
        activeObjectUrl = null;
      }

      if (activeBufferSource) {
        try {
          activeBufferSource.onended = null;
          activeBufferSource.stop(0);
          activeBufferSource.disconnect();
        } catch (_) {
          // Ignore Web Audio source stop errors
        }
        activeBufferSource = null;
      }

      decodedAudioBuffer = null;
      webAudioStartedAt = 0;
      webAudioOffsetSec = 0;
    }

    function cleanupWorkerRequests(reason) {
      pendingRequests.forEach((entry) => {
        if (entry.timerId) clearTimeout(entry.timerId);
        entry.reject(new Error(reason || 'Speech request cancelled'));
      });
      pendingRequests.clear();
    }

    function resetWorker() {
      cleanupWorkerRequests('Piper worker reset');
      if (workerInstance && typeof workerInstance.terminate === 'function') {
        try {
          workerInstance.terminate();
        } catch (_) {
          // Ignore worker terminate error
        }
      }
      workerInstance = null;
      workerConfigured = false;
    }

    function ensureWorker() {
      if (workerInstance) return workerInstance;

      const worker = typeof options.workerFactory === 'function'
        ? options.workerFactory(piperConfig.workerUrl, { type: 'module' })
        : new Worker(piperConfig.workerUrl, { type: 'module' });

      worker.onmessage = (event) => {
        const data = (event && event.data) || {};
        const req = pendingRequests.get(data.id);
        if (!req) return;

        if (data.type === 'progress') {
          if (req.timerId) {
            clearTimeout(req.timerId);
            req.timerId = setTimeout(req.onTimeout, req.timeoutMs);
          }
          if (typeof req.onProgress === 'function') {
            req.onProgress(data.progress);
          }
          return;
        }

        pendingRequests.delete(data.id);
        if (req.timerId) clearTimeout(req.timerId);

        if (data.ok && data.wavBuffer) {
          req.resolve({
            wavBuffer: data.wavBuffer,
            sampleRate: data.sampleRate || 22050,
            voiceId: data.voiceId || piperConfig.voiceId,
            cached: Boolean(data.cached)
          });
        } else {
          req.reject(new Error(data.error || 'Piper worker returned an invalid synthesis result'));
        }
      };

      worker.onerror = () => {
        resetWorker();
      };

      worker.onmessageerror = () => {
        resetWorker();
      };

      workerInstance = worker;
      return workerInstance;
    }

    function synthesizeViaWorker(text, runId, onProgress) {
      const worker = ensureWorker();
      if (!workerConfigured) {
        try {
          worker.postMessage({ type: 'configure', config: piperConfig });
          workerConfigured = true;
        } catch (_) {
          workerConfigured = false;
        }
      }

      const id = ++requestCounter;
      const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 65000;

      return new Promise((resolve, reject) => {
        const onTimeout = () => {
          pendingRequests.delete(id);
          reject(new Error('Piper neural synthesis timed out'));
        };

        const timerId = setTimeout(onTimeout, timeoutMs);
        pendingRequests.set(id, {
          resolve,
          reject,
          timerId,
          onTimeout,
          timeoutMs,
          onProgress: (progress) => {
            if (runId === activeRunId && typeof onProgress === 'function') {
              onProgress(progress);
            }
          }
        });

        try {
          worker.postMessage({
            id,
            type: 'synthesize',
            text,
            voiceId: piperConfig.voiceId
          });
        } catch (err) {
          pendingRequests.delete(id);
          clearTimeout(timerId);
          reject(err);
        }
      });
    }

    function ensureAudioContext() {
      if (activeAudioCtx) return activeAudioCtx;
      const Ctx = options.AudioContextCtor || (win && (win.AudioContext || win.webkitAudioContext));
      if (!Ctx) return null;
      try {
        activeAudioCtx = new Ctx();
      } catch (_) {
        activeAudioCtx = null;
      }
      return activeAudioCtx;
    }

    function unlockAudioContextGesture() {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          ctx.resume().catch(() => {});
        } catch (_) {
          // Ignore resume errors outside strict gesture window
        }
      }
    }

    function startWebAudioNode(offsetSec, runId) {
      const ctx = ensureAudioContext();
      if (!ctx || !decodedAudioBuffer) return false;

      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }

      const src = ctx.createBufferSource();
      src.buffer = decodedAudioBuffer;
      src.connect(ctx.destination);
      activeBufferSource = src;
      webAudioOffsetSec = Math.max(0, offsetSec);
      webAudioStartedAt = ctx.currentTime - webAudioOffsetSec;

      src.onended = () => {
        if (activeBufferSource !== src || runId !== activeRunId || state !== 'playing') return;
        cleanupAudioPlayback();
        activeMode = null;
        emitStateChange('idle', { engine: 'neural-webaudio' });
        if (typeof activeCallbacks.onEnd === 'function') activeCallbacks.onEnd();
      };

      src.start(0, webAudioOffsetSec);
      return true;
    }

    async function playWavViaWebAudio(wavBuffer, runId) {
      const ctx = ensureAudioContext();
      if (!ctx || typeof ctx.decodeAudioData !== 'function') {
        throw new Error('Web Audio API unavailable');
      }

      const bufferCopy = wavBuffer.slice(0);
      decodedAudioBuffer = await ctx.decodeAudioData(bufferCopy);
      if (runId !== activeRunId) return;

      activeMode = 'neural-webaudio';
      emitStateChange('playing', { engine: 'neural-webaudio' });
      if (typeof activeCallbacks.onStart === 'function') activeCallbacks.onStart();
      startWebAudioNode(0, runId);
    }

    async function playWavBuffer(wavBuffer, runId) {
      if (runId !== activeRunId) return;

      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const createAudio = typeof options.audioFactory === 'function'
        ? options.audioFactory
        : (url) => (typeof Audio === 'function' ? new Audio(url) : null);

      const canUseHtmlAudio = Boolean(
        options.audioFactory ||
        (typeof Audio === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
      );

      if (canUseHtmlAudio) {
        const objectUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(blob)
          : 'blob:bellyhaven-tts';
        const audio = createAudio(objectUrl);

        if (audio) {
          activeObjectUrl = objectUrl;
          activeAudio = audio;
          activeMode = 'neural-audio';

          audio.onended = () => {
            if (activeAudio !== audio || runId !== activeRunId) return;
            cleanupAudioPlayback();
            activeMode = null;
            emitStateChange('idle', { engine: 'neural-audio' });
            if (typeof activeCallbacks.onEnd === 'function') activeCallbacks.onEnd();
          };

          audio.onerror = () => {
            if (activeAudio !== audio || runId !== activeRunId) return;
            cleanupAudioPlayback();
            playWavViaWebAudio(wavBuffer, runId).catch(() => {
              if (runId !== activeRunId) return;
              speakWithSystemSpeech(normalizeSpeechText(activeCallbacks.noteObj), runId, true);
            });
          };

          try {
            const playResult = audio.play();
            if (playResult && typeof playResult.then === 'function') {
              await playResult;
            }
            if (runId !== activeRunId) {
              cleanupAudioPlayback();
              return;
            }
            emitStateChange('playing', { engine: 'neural-audio' });
            if (typeof activeCallbacks.onStart === 'function') activeCallbacks.onStart();
            return;
          } catch (_) {
            cleanupAudioPlayback();
          }
        }
      }

      await playWavViaWebAudio(wavBuffer, runId);
    }

    function speakWithSystemSpeech(textToRead, runId, isFallback) {
      if (runId !== activeRunId) return false;
      if (!hasSystemSpeechSupport()) {
        activeMode = null;
        emitStateChange('idle', { engine: 'none' });
        if (typeof activeCallbacks.onUnsupported === 'function') {
          activeCallbacks.onUnsupported();
        } else if (typeof activeCallbacks.onError === 'function') {
          activeCallbacks.onError(new Error('Speech playback unavailable'));
        }
        return false;
      }

      try {
        synthApi.cancel();
      } catch (_) {
        // Ignore cancel failures
      }

      synthFallbackUsed = Boolean(isFallback);
      const utterance = new UtteranceCtor(textToRead);
      const preferredVoice = pickGentleVoice(synthApi);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.lang = (preferredVoice && preferredVoice.lang) || 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.06;
      utterance.volume = 0.92;

      let startNotified = false;
      const notifyStart = () => {
        if (startNotified || runId !== activeRunId || activeUtterance !== utterance) return;
        startNotified = true;
        emitStateChange('playing', { engine: 'speech-synthesis', fallback: synthFallbackUsed });
        if (synthFallbackUsed && typeof activeCallbacks.onFallback === 'function') {
          activeCallbacks.onFallback();
        }
        if (typeof activeCallbacks.onStart === 'function') activeCallbacks.onStart();
      };

      utterance.onstart = notifyStart;

      utterance.onend = () => {
        if (activeUtterance !== utterance || runId !== activeRunId) return;
        activeUtterance = null;
        activeMode = null;
        emitStateChange('idle', { engine: 'speech-synthesis' });
        if (typeof activeCallbacks.onEnd === 'function') activeCallbacks.onEnd();
      };

      utterance.onerror = () => {
        if (activeUtterance !== utterance || runId !== activeRunId) return;
        activeUtterance = null;
        activeMode = null;
        emitStateChange('idle', { engine: 'speech-synthesis' });
        if (typeof activeCallbacks.onError === 'function') activeCallbacks.onError();
      };

      activeUtterance = utterance;
      activeMode = 'speech-synthesis';

      try {
        synthApi.speak(utterance);
        notifyStart();
        return true;
      } catch (_) {
        activeUtterance = null;
        activeMode = null;
        emitStateChange('idle', { engine: 'speech-synthesis' });
        if (typeof activeCallbacks.onError === 'function') activeCallbacks.onError();
        return false;
      }
    }

    function stop() {
      activeRunId++;
      activeMode = null;
      activeUtterance = null;
      synthFallbackUsed = false;
      cleanupWorkerRequests('Stopped by user');
      cleanupAudioPlayback();

      if (synthApi && typeof synthApi.cancel === 'function') {
        try {
          synthApi.cancel();
        } catch (_) {
          // Ignore speech synthesis cancel errors
        }
      }

      emitStateChange('idle', {});
    }

    function pause() {
      if (state !== 'playing') return false;

      if (activeMode === 'neural-audio' && activeAudio && typeof activeAudio.pause === 'function') {
        try {
          activeAudio.pause();
          emitStateChange('paused', { engine: 'neural-audio' });
          if (typeof activeCallbacks.onPause === 'function') activeCallbacks.onPause();
          return true;
        } catch (_) {
          return false;
        }
      }

      if (activeMode === 'neural-webaudio' && activeBufferSource && activeAudioCtx) {
        try {
          webAudioOffsetSec = Math.max(0, activeAudioCtx.currentTime - webAudioStartedAt);
          activeBufferSource.onended = null;
          activeBufferSource.stop(0);
          activeBufferSource.disconnect();
          activeBufferSource = null;
          emitStateChange('paused', { engine: 'neural-webaudio' });
          if (typeof activeCallbacks.onPause === 'function') activeCallbacks.onPause();
          return true;
        } catch (_) {
          return false;
        }
      }

      if (activeMode === 'speech-synthesis' && synthApi && typeof synthApi.pause === 'function') {
        try {
          synthApi.pause();
          emitStateChange('paused', { engine: 'speech-synthesis' });
          if (typeof activeCallbacks.onPause === 'function') activeCallbacks.onPause();
          return true;
        } catch (_) {
          return false;
        }
      }

      return false;
    }

    function resume() {
      if (state !== 'paused') return false;
      const runId = activeRunId;

      if (activeMode === 'neural-audio' && activeAudio && typeof activeAudio.play === 'function') {
        try {
          const playRes = activeAudio.play();
          if (playRes && typeof playRes.catch === 'function') {
            playRes.catch(() => {
              if (runId === activeRunId) stop();
            });
          }
          emitStateChange('playing', { engine: 'neural-audio' });
          if (typeof activeCallbacks.onResume === 'function') activeCallbacks.onResume();
          return true;
        } catch (_) {
          return false;
        }
      }

      if (activeMode === 'neural-webaudio' && decodedAudioBuffer) {
        if (startWebAudioNode(webAudioOffsetSec, runId)) {
          emitStateChange('playing', { engine: 'neural-webaudio' });
          if (typeof activeCallbacks.onResume === 'function') activeCallbacks.onResume();
          return true;
        }
        return false;
      }

      if (activeMode === 'speech-synthesis' && synthApi && typeof synthApi.resume === 'function') {
        try {
          synthApi.resume();
          emitStateChange('playing', { engine: 'speech-synthesis' });
          if (typeof activeCallbacks.onResume === 'function') activeCallbacks.onResume();
          return true;
        } catch (_) {
          return false;
        }
      }

      return false;
    }

    function speak(noteObj, callbacks = {}) {
      if (!isSupported() || !noteObj) {
        if (typeof callbacks.onUnsupported === 'function') callbacks.onUnsupported();
        return false;
      }

      stop();

      const runId = ++activeRunId;
      activeCallbacks = { ...callbacks, noteObj };
      const textToRead = normalizeSpeechText(noteObj);
      if (!textToRead) {
        if (typeof callbacks.onError === 'function') callbacks.onError(new Error('Empty note text'));
        return false;
      }

      if (!hasNeuralTtsSupport()) {
        return speakWithSystemSpeech(textToRead, runId, true);
      }

      unlockAudioContextGesture();
      emitStateChange('loading', { engine: 'piper-wasm' });
      if (typeof callbacks.onLoading === 'function') callbacks.onLoading();

      const cacheKey = `${piperConfig.voiceId}::${textToRead}`;
      const cachedWav = wavCache.get(cacheKey);
      if (cachedWav) {
        playWavBuffer(cachedWav.slice(0), runId).catch(() => {
          if (runId === activeRunId) {
            speakWithSystemSpeech(textToRead, runId, true);
          }
        });
        return true;
      }

      synthesizeViaWorker(textToRead, runId, callbacks.onProgress)
        .then((res) => {
          if (runId !== activeRunId) return;

          // Keep a compact in-memory cache (up to 8 synthesized notes) for instant replay
          if (wavCache.size >= 8) {
            const oldestKey = wavCache.keys().next().value;
            wavCache.delete(oldestKey);
          }
          wavCache.set(cacheKey, res.wavBuffer.slice(0));

          return playWavBuffer(res.wavBuffer, runId);
        })
        .catch(() => {
          if (runId !== activeRunId) return;
          speakWithSystemSpeech(textToRead, runId, true);
        });

      return true;
    }

    return {
      isSupported,
      isSpeaking: () => state === 'loading' || state === 'playing' || state === 'paused',
      isPaused: () => state === 'paused',
      getState: () => state,
      speak,
      pause,
      resume,
      stop
    };
  }

  return {
    BABY_NOTES,
    getBabyNote,
    createSpeechReader
  };
});
