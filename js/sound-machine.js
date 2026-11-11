(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyHavenSoundMachine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODES = {
    womb: {
      id: 'womb',
      label: 'Womb Heartbeat',
      subtitle: '65 BPM rhythmic maternal pulse'
    },
    noise: {
      id: 'noise',
      label: 'Pink / White Noise',
      subtitle: 'Soft filtered hush for rest & nausea relief'
    },
    breathing: {
      id: 'breathing',
      label: 'Guided 4-7-8 Breathing',
      subtitle: 'Inhale 4s · Hold 7s · Exhale 8s with chimes'
    }
  };

  const BREATH_CYCLE_SEC = 19; // 4 + 7 + 8

  function getModeMeta(mode) {
    return MODES[mode] || MODES.womb;
  }

  function getBreathingPhaseForElapsedSec(elapsedSec) {
    const safeSec = Math.max(0, Number.isFinite(elapsedSec) ? elapsedSec : 0);
    const inCycle = safeSec % BREATH_CYCLE_SEC;
    if (inCycle < 4) {
      return {
        phase: 'inhale',
        label: 'Inhale Gently',
        durationSec: 4,
        remainingSec: Math.ceil(4 - inCycle),
        scale: 1.28
      };
    }
    if (inCycle < 11) {
      return {
        phase: 'hold',
        label: 'Hold Softly',
        durationSec: 7,
        remainingSec: Math.ceil(11 - inCycle),
        scale: 1.28
      };
    }
    return {
      phase: 'exhale',
      label: 'Exhale Slowly',
      durationSec: 8,
      remainingSec: Math.ceil(19 - inCycle),
      scale: 0.78
    };
  }

  function formatTimerRemaining(totalSec) {
    const safe = Math.max(0, Math.ceil(Number.isFinite(totalSec) ? totalSec : 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function createSoundEngine() {
    let audioCtx = null;
    let masterGain = null;
    let pinkBuffer = null;

    let isPlaying = false;
    let currentMode = 'womb';
    let volume = 0.65;
    let sleepTimerMinutes = 0; // 0 = off, 15, 30
    let sleepEndsAtMs = null;

    let heartbeatIntervalId = null;
    let breathTickIntervalId = null;
    let sleepTickIntervalId = null;
    let breathStartedAtMs = 0;
    let lastBreathPhase = '';

    let activeNodes = [];
    const listeners = new Set();

    function notify() {
      const snap = getSnapshot();
      listeners.forEach((fn) => {
        try {
          fn(snap);
        } catch (_) {
          // Ignore listener UI errors
        }
      });
    }

    function ensureAudioContext() {
      const AudioCtor =
        typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtor) return null;

      if (!audioCtx) {
        audioCtx = new AudioCtor();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(audioCtx.destination);
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    function createPinkNoiseBuffer(ctx) {
      if (pinkBuffer && pinkBuffer.sampleRate === ctx.sampleRate) {
        return pinkBuffer;
      }
      const durationSec = 4;
      const length = ctx.sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      pinkBuffer = buffer;
      return buffer;
    }

    function registerNode(node) {
      if (node) activeNodes.push(node);
    }

    function stopModeNodes() {
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
      }
      if (breathTickIntervalId !== null) {
        clearInterval(breathTickIntervalId);
        breathTickIntervalId = null;
      }
      lastBreathPhase = '';

      activeNodes.forEach((node) => {
        try {
          if (typeof node.stop === 'function') node.stop();
        } catch (_) {}
        try {
          if (typeof node.disconnect === 'function') node.disconnect();
        } catch (_) {}
      });
      activeNodes = [];
    }

    function playThump(ctx, atTime, startFreq, endFreq, peakGain, durationSec) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, atTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), atTime + durationSec);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(145, atTime);

      gain.gain.setValueAtTime(0.0001, atTime);
      gain.gain.linearRampToValueAtTime(peakGain, atTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, atTime + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(atTime);
      osc.stop(atTime + durationSec + 0.03);
    }

    function startWombHeartbeat(ctx) {
      // Soft enveloping acoustic womb murmur underneath the 65 BPM pulse
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = createPinkNoiseBuffer(ctx);
      noiseSrc.loop = true;

      const warmFilter = ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.value = 170;

      const murmurGain = ctx.createGain();
      murmurGain.gain.value = 0.24;

      noiseSrc.connect(warmFilter);
      warmFilter.connect(murmurGain);
      murmurGain.connect(masterGain);
      noiseSrc.start();
      registerNode(noiseSrc);
      registerNode(warmFilter);
      registerNode(murmurGain);

      const triggerBeat = () => {
        if (!isPlaying || currentMode !== 'womb') return;
        const now = ctx.currentTime + 0.02;
        playThump(ctx, now, 68, 38, 0.72, 0.22);        // Lub
        playThump(ctx, now + 0.26, 78, 44, 0.48, 0.18); // Dub
      };

      triggerBeat();
      heartbeatIntervalId = setInterval(triggerBeat, Math.round((60 / 65) * 1000));
    }

    function startPinkNoise(ctx) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = createPinkNoiseBuffer(ctx);
      noiseSrc.loop = true;

      const smoothFilter = ctx.createBiquadFilter();
      smoothFilter.type = 'lowpass';
      smoothFilter.frequency.value = 1050;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.45);

      noiseSrc.connect(smoothFilter);
      smoothFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSrc.start();

      registerNode(noiseSrc);
      registerNode(smoothFilter);
      registerNode(noiseGain);
    }

    function playChimeNote(ctx, freq, delaySec, durationSec, peakGain) {
      const startTime = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, startTime);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0.18;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

      osc.connect(gain);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      harmonic.start(startTime);
      osc.stop(startTime + durationSec + 0.05);
      harmonic.stop(startTime + durationSec + 0.05);
    }

    function playBreathCue(ctx, phase) {
      if (!ctx) return;
      if (phase === 'inhale') {
        playChimeNote(ctx, 261.63, 0, 1.3, 0.22); // C4
        playChimeNote(ctx, 329.63, 0.16, 1.4, 0.18); // E4
        playChimeNote(ctx, 392.00, 0.34, 1.5, 0.15); // G4
      } else if (phase === 'hold') {
        playChimeNote(ctx, 392.00, 0, 1.4, 0.14); // G4
        playChimeNote(ctx, 493.88, 0.15, 1.5, 0.10); // B4
      } else if (phase === 'exhale') {
        playChimeNote(ctx, 329.63, 0, 1.6, 0.18); // E4
        playChimeNote(ctx, 261.63, 0.22, 1.8, 0.22); // C4
      }
    }

    function startBreathingPacer(ctx) {
      breathStartedAtMs = Date.now();
      lastBreathPhase = '';

      const tick = () => {
        if (!isPlaying || currentMode !== 'breathing') return;
        const elapsedSec = (Date.now() - breathStartedAtMs) / 1000;
        const phaseInfo = getBreathingPhaseForElapsedSec(elapsedSec);
        if (phaseInfo.phase !== lastBreathPhase) {
          lastBreathPhase = phaseInfo.phase;
          playBreathCue(ctx, phaseInfo.phase);
        }
        notify();
      };

      tick();
      breathTickIntervalId = setInterval(tick, 250);
    }

    function clearSleepTicker() {
      if (sleepTickIntervalId !== null) {
        clearInterval(sleepTickIntervalId);
        sleepTickIntervalId = null;
      }
    }

    function ensureSleepTicker() {
      clearSleepTicker();
      if (!isPlaying || sleepTimerMinutes <= 0) {
        sleepEndsAtMs = null;
        return;
      }
      sleepEndsAtMs = Date.now() + sleepTimerMinutes * 60 * 1000;
      sleepTickIntervalId = setInterval(() => {
        if (!isPlaying || !sleepEndsAtMs) {
          clearSleepTicker();
          return;
        }
        const remMs = sleepEndsAtMs - Date.now();
        if (remMs <= 0) {
          pause();
          return;
        }
        notify();
      }, 1000);
    }

    function startCurrentMode() {
      stopModeNodes();
      const ctx = ensureAudioContext();
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.04);
      }

      if (currentMode === 'womb' && ctx) {
        startWombHeartbeat(ctx);
      } else if (currentMode === 'noise' && ctx) {
        startPinkNoise(ctx);
      } else if (currentMode === 'breathing') {
        startBreathingPacer(ctx);
      }
    }

    function play() {
      isPlaying = true;
      startCurrentMode();
      ensureSleepTicker();
      notify();
    }

    function pause() {
      isPlaying = false;
      stopModeNodes();
      clearSleepTicker();
      sleepEndsAtMs = null;
      notify();
    }

    function toggle() {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
      return isPlaying;
    }

    function setMode(mode) {
      currentMode = MODES[mode] ? mode : 'womb';
      if (isPlaying) {
        startCurrentMode();
      }
      notify();
    }

    function setVolume(nextVal) {
      const num = Number(nextVal);
      volume = Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : 0.65;
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.03);
      }
      notify();
    }

    function setSleepTimerMinutes(minutes) {
      const parsed = Number.parseInt(minutes, 10);
      sleepTimerMinutes = parsed === 15 || parsed === 30 ? parsed : 0;
      if (isPlaying) {
        ensureSleepTicker();
      } else {
        sleepEndsAtMs = null;
      }
      notify();
    }

    function getSnapshot() {
      const remainingTimerSec =
        isPlaying && sleepEndsAtMs ? Math.max(0, Math.ceil((sleepEndsAtMs - Date.now()) / 1000)) : 0;
      const breathPhase =
        isPlaying && currentMode === 'breathing'
          ? getBreathingPhaseForElapsedSec((Date.now() - breathStartedAtMs) / 1000)
          : { phase: 'idle', label: 'Ready to Breathe', durationSec: 4, remainingSec: 0, scale: 1 };

      return {
        isPlaying,
        mode: currentMode,
        modeMeta: getModeMeta(currentMode),
        volume,
        sleepTimerMinutes,
        remainingTimerSec,
        breathPhase
      };
    }

    function subscribe(fn) {
      if (typeof fn === 'function') {
        listeners.add(fn);
      }
      return () => listeners.delete(fn);
    }

    return {
      play,
      pause,
      toggle,
      setMode,
      setVolume,
      setSleepTimerMinutes,
      getSnapshot,
      subscribe
    };
  }

  return {
    MODES,
    BREATH_CYCLE_SEC,
    getModeMeta,
    getBreathingPhaseForElapsedSec,
    formatTimerRemaining,
    createSoundEngine
  };
});
