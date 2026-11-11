(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const calc = require('./calculations');
    module.exports = factory(calc);
  } else {
    root.PregnancyStorage = factory(root.PregnancyCalc);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (calc) {
  'use strict';

  const STORAGE_KEY = 'bellyhaven_state_v1';
  const PREVIOUS_STORAGE_KEY = 'pregnancy_tracker_state_v1';
  const CYCLE_STORAGE_KEY = 'bellyhaven_cycle_length';
  const CYCLE_CLEANUP_FLAG_KEY = 'bellyhaven_cycle_reset_v1';
  const LEGACY_LMP_KEY = 'user_lmp';
  const LEGACY_KICK_KEY = 'kick_count';

  function createDefaultState() {
    return {
      version: 1,
      profile: {
        inputMode: 'lmp',
        dateStr: '',
        cycleLength: calc.DEFAULT_CYCLE_LENGTH,
        emergencyPhone: ''
      },
      kicks: {
        quickCount: 0,
        activeSession: null,
        sessions: []
      },
      contractions: {
        activeStartMs: null,
        dismissedAlertClusterMs: null,
        history: []
      },
      journal: {
        entries: [],
        appointments: []
      },
      ai: {
        provider: 'offline',
        apiKey: '',
        model: '',
        endpoint: '/api/chat',
        chatHistory: []
      },
      weightTracker: {
        unit: 'kg',
        preWeightKg: null,
        heightCm: null
      }
    };
  }

  function createId(prefix) {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix || 'id'}_${Date.now()}_${rand}`;
  }

  function safeStorageGet(storage, key) {
    try {
      return storage ? storage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(storage, key, value) {
    try {
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeStorageRemove(storage, key) {
    try {
      if (!storage) return;
      storage.removeItem(key);
    } catch (_) {
      // Ignore storage errors in restricted contexts
    }
  }

  function sanitizeActiveSession(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!Number.isFinite(raw.startedAtMs)) return null;
    const taps = Array.isArray(raw.tapTimestampsMs)
      ? raw.tapTimestampsMs.filter((t) => Number.isFinite(t))
      : [];
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : createId('kick_sess'),
      startedAtMs: raw.startedAtMs,
      tapTimestampsMs: taps
    };
  }

  function sanitizeKickSessions(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter((s) => s && typeof s === 'object' && Number.isFinite(s.startedAtMs))
      .map((s) => ({
        id: typeof s.id === 'string' && s.id ? s.id : createId('kick_sess'),
        startedAtMs: s.startedAtMs,
        endedAtMs: Number.isFinite(s.endedAtMs) ? s.endedAtMs : s.startedAtMs,
        count: calc.sanitizePositiveInt(s.count, 0),
        durationSec: calc.sanitizePositiveInt(s.durationSec, 0)
      }))
      .slice(0, 100);
  }

  function sanitizeContractions(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter(
        (c) =>
          c &&
          typeof c === 'object' &&
          Number.isFinite(c.startMs) &&
          Number.isFinite(c.endMs) &&
          c.endMs >= c.startMs
      )
      .map((c) => ({
        id: typeof c.id === 'string' && c.id ? c.id : createId('contr'),
        startMs: c.startMs,
        endMs: c.endMs,
        intensity:
          c.intensity === 'Mild' || c.intensity === 'Moderate' || c.intensity === 'Strong'
            ? c.intensity
            : ''
      }))
      .slice(0, 200);
  }

  function sanitizeJournalEntries(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        id: typeof e.id === 'string' && e.id ? e.id : createId('entry'),
        dateStr: calc.parseLocalDate(e.dateStr) ? e.dateStr : calc.formatLocalDateISO(new Date()),
        mood: typeof e.mood === 'string' ? e.mood.slice(0, 40) : '',
        symptoms: Array.isArray(e.symptoms)
          ? e.symptoms.filter((s) => typeof s === 'string').slice(0, 12)
          : [],
        weight: typeof e.weight === 'string' ? e.weight.slice(0, 20) : '',
        bp: typeof e.bp === 'string' ? e.bp.trim().slice(0, 24) : '',
        note: typeof e.note === 'string' ? e.note.slice(0, 1000) : '',
        createdAtMs: Number.isFinite(e.createdAtMs) ? e.createdAtMs : Date.now()
      }))
      .slice(0, 365);
  }

  function sanitizeAppointments(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter((a) => a && typeof a === 'object' && typeof a.title === 'string' && a.title.trim())
      .map((a) => ({
        id: typeof a.id === 'string' && a.id ? a.id : createId('appt'),
        dateStr: calc.parseLocalDate(a.dateStr) ? a.dateStr : '',
        timeStr: typeof a.timeStr === 'string' ? a.timeStr.slice(0, 10) : '',
        title: a.title.trim().slice(0, 120),
        notes: typeof a.notes === 'string' ? a.notes.slice(0, 500) : '',
        completed: Boolean(a.completed)
      }))
      .slice(0, 100);
  }

  function sanitizeChatHistory(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .filter((m) => m && typeof m === 'object' && typeof m.text === 'string' && m.text.trim())
      .map((m) => ({
        id: typeof m.id === 'string' && m.id ? m.id : createId('msg'),
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text.slice(0, 4000),
        createdAtMs: Number.isFinite(m.createdAtMs) ? m.createdAtMs : Date.now(),
        isRedFlag: Boolean(m.isRedFlag),
        sourceLabel: typeof m.sourceLabel === 'string' ? m.sourceLabel.slice(0, 60) : ''
      }))
      .slice(-60);
  }

  function sanitizeAiConfig(rawAi) {
    const allowedProviders = ['gemini', 'groq', 'serverless', 'offline'];
    const ai = rawAi && typeof rawAi === 'object' ? rawAi : {};
    return {
      provider: allowedProviders.includes(ai.provider) ? ai.provider : 'offline',
      apiKey: typeof ai.apiKey === 'string' ? ai.apiKey.trim().slice(0, 256) : '',
      model: typeof ai.model === 'string' ? ai.model.trim().slice(0, 100) : '',
      endpoint:
        typeof ai.endpoint === 'string' && ai.endpoint.trim()
          ? ai.endpoint.trim().slice(0, 256)
          : '/api/chat',
      chatHistory: sanitizeChatHistory(ai.chatHistory)
    };
  }

  function sanitizeWeightTracker(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const unit = src.unit === 'lbs' ? 'lbs' : 'kg';
    const preWeightKg =
      Number.isFinite(src.preWeightKg) && src.preWeightKg >= 25 && src.preWeightKg <= 260
        ? Math.round(src.preWeightKg * 100) / 100
        : null;
    const heightCm =
      Number.isFinite(src.heightCm) && src.heightCm >= 90 && src.heightCm <= 250
        ? Math.round(src.heightCm * 100) / 100
        : null;
    return { unit, preWeightKg, heightCm };
  }

  function sanitizeState(raw) {
    const defaults = createDefaultState();
    if (!raw || typeof raw !== 'object') return defaults;

    const rawProfile = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
    const rawKicks = raw.kicks && typeof raw.kicks === 'object' ? raw.kicks : {};
    const rawContractions =
      raw.contractions && typeof raw.contractions === 'object' ? raw.contractions : {};
    const rawJournal = raw.journal && typeof raw.journal === 'object' ? raw.journal : {};

    return {
      version: 1,
      profile: {
        inputMode: rawProfile.inputMode === 'edd' ? 'edd' : 'lmp',
        dateStr: calc.parseLocalDate(rawProfile.dateStr) ? rawProfile.dateStr : '',
        cycleLength: calc.normalizeCycleLength(rawProfile.cycleLength),
        emergencyPhone:
          typeof rawProfile.emergencyPhone === 'string'
            ? rawProfile.emergencyPhone.trim().slice(0, 30)
            : ''
      },
      kicks: {
        quickCount: calc.sanitizePositiveInt(rawKicks.quickCount, 0),
        activeSession: sanitizeActiveSession(rawKicks.activeSession),
        sessions: sanitizeKickSessions(rawKicks.sessions)
      },
      contractions: {
        activeStartMs: Number.isFinite(rawContractions.activeStartMs)
          ? rawContractions.activeStartMs
          : null,
        dismissedAlertClusterMs: Number.isFinite(rawContractions.dismissedAlertClusterMs)
          ? rawContractions.dismissedAlertClusterMs
          : null,
        history: sanitizeContractions(rawContractions.history)
      },
      journal: {
        entries: sanitizeJournalEntries(rawJournal.entries),
        appointments: sanitizeAppointments(rawJournal.appointments)
      },
      ai: sanitizeAiConfig(raw.ai),
      weightTracker: sanitizeWeightTracker(raw.weightTracker)
    };
  }

  function getDefaultStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function cleanupStaleCycleOnLoad(state, storage) {
    const hasResetFlag = safeStorageGet(storage, CYCLE_CLEANUP_FLAG_KEY) === '1';
    const rawCycleKey = safeStorageGet(storage, CYCLE_STORAGE_KEY);
    const savedCycle = parseInt(rawCycleKey, 10);

    if (!hasResetFlag) {
      if (savedCycle === 21 || rawCycleKey !== null && (isNaN(savedCycle) || savedCycle < 20 || savedCycle > 45)) {
        safeStorageRemove(storage, CYCLE_STORAGE_KEY);
      }
      if (state.profile.cycleLength === 21) {
        state.profile.cycleLength = 28;
        saveState(state, storage);
      }
      safeStorageSet(storage, CYCLE_CLEANUP_FLAG_KEY, '1');
      return state;
    }

    if (rawCycleKey !== null) {
      if (!isNaN(savedCycle) && savedCycle >= 20 && savedCycle <= 45) {
        state.profile.cycleLength = savedCycle;
      } else {
        safeStorageRemove(storage, CYCLE_STORAGE_KEY);
      }
    }
    return state;
  }

  function loadState(storage = getDefaultStorage()) {
    const rawJson = safeStorageGet(storage, STORAGE_KEY);
    if (rawJson) {
      try {
        return cleanupStaleCycleOnLoad(sanitizeState(JSON.parse(rawJson)), storage);
      } catch (_) {
        return createDefaultState();
      }
    }

    // Seamless migration from previous app storage key ('pregnancy_tracker_state_v1')
    const previousJson = safeStorageGet(storage, PREVIOUS_STORAGE_KEY);
    if (previousJson) {
      try {
        const migratedState = cleanupStaleCycleOnLoad(
          sanitizeState(JSON.parse(previousJson)),
          storage
        );
        if (saveState(migratedState, storage)) {
          safeStorageRemove(storage, PREVIOUS_STORAGE_KEY);
        }
        return migratedState;
      } catch (_) {
        return createDefaultState();
      }
    }

    // Seamless migration from legacy starter HTML keys (user_lmp, kick_count)
    const state = createDefaultState();
    const legacyLmp = safeStorageGet(storage, LEGACY_LMP_KEY);
    const legacyKicks = safeStorageGet(storage, LEGACY_KICK_KEY);
    let migrated = false;

    if (legacyLmp && calc.parseLocalDate(legacyLmp)) {
      state.profile.dateStr = legacyLmp;
      state.profile.inputMode = 'lmp';
      migrated = true;
    }
    if (legacyKicks !== null) {
      state.kicks.quickCount = calc.sanitizePositiveInt(legacyKicks, 0);
      migrated = true;
    }

    cleanupStaleCycleOnLoad(state, storage);
    if (migrated) {
      saveState(state, storage);
    }
    return state;
  }

  function saveState(state, storage = getDefaultStorage()) {
    const clean = sanitizeState(state);
    safeStorageSet(storage, CYCLE_STORAGE_KEY, String(clean.profile.cycleLength));
    return safeStorageSet(storage, STORAGE_KEY, JSON.stringify(clean));
  }

  function clearAllState(storage = getDefaultStorage()) {
    safeStorageRemove(storage, STORAGE_KEY);
    safeStorageRemove(storage, PREVIOUS_STORAGE_KEY);
    safeStorageRemove(storage, CYCLE_STORAGE_KEY);
    safeStorageRemove(storage, LEGACY_LMP_KEY);
    safeStorageRemove(storage, LEGACY_KICK_KEY);
    return createDefaultState();
  }

  function exportBackupJson(state) {
    const clean = sanitizeState(state);
    clean.ai.apiKey = '';
    const payload = {
      app: 'bellyhaven',
      exportedAt: new Date().toISOString(),
      state: clean
    };
    return JSON.stringify(payload, null, 2);
  }

  function parseImportedBackup(jsonText) {
    if (typeof jsonText !== 'string' || !jsonText.trim()) {
      return { ok: false, error: 'Backup file is empty.' };
    }
    try {
      const parsed = JSON.parse(jsonText);
      const rawState =
        parsed && typeof parsed === 'object' && parsed.state ? parsed.state : parsed;
      if (!rawState || typeof rawState !== 'object' || !rawState.profile) {
        return { ok: false, error: 'Invalid backup format.' };
      }
      return { ok: true, state: sanitizeState(rawState) };
    } catch (_) {
      return { ok: false, error: 'Could not parse JSON backup file.' };
    }
  }

  function escapeCsvCell(value) {
    const str = String(value == null ? '' : value);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function buildVisitSummaryCsv(state, stats) {
    const rows = [
      ['Section', 'Date / Time', 'Details', 'Notes']
    ];

    if (stats && stats.valid) {
      rows.push([
        'Overview',
        calc.formatLocalDateISO(new Date()),
        `Stage: ${stats.stageLabel} | EDD: ${stats.eddIso} | ${stats.trimester.label}`,
        `LMP: ${stats.lmpIso} (Cycle: ${stats.cycleLength}d)`
      ]);
    }

    state.kicks.sessions.forEach((sess) => {
      rows.push([
        'Kick Session',
        new Date(sess.startedAtMs).toLocaleString(),
        `${sess.count} kicks in ${calc.formatDurationWords(sess.durationSec)}`,
        ''
      ]);
    });

    const contrStats = calc.computeContractionStats(state.contractions.history);
    contrStats.entries.forEach((entry) => {
      const details = [`Duration: ${calc.formatDurationWords(entry.durationSec)}`];
      if (entry.intensity) details.push(`Intensity: ${entry.intensity}`);
      rows.push([
        'Contraction',
        new Date(entry.startMs).toLocaleString(),
        details.join(' | '),
        entry.intervalSec !== null
          ? `Interval: ${calc.formatDurationWords(entry.intervalSec)}`
          : 'First / standalone'
      ]);
    });

    state.journal.entries.forEach((entry) => {
      rows.push([
        'Journal',
        entry.dateStr,
        [
          entry.mood,
          entry.symptoms.join('; '),
          entry.weight ? `Weight: ${entry.weight}` : '',
          entry.bp ? `BP: ${entry.bp}` : ''
        ]
          .filter(Boolean)
          .join(' | '),
        entry.note
      ]);
    });

    state.journal.appointments.forEach((appt) => {
      rows.push([
        'Appointment',
        [appt.dateStr, appt.timeStr].filter(Boolean).join(' '),
        `${appt.completed ? '[Done] ' : ''}${appt.title}`,
        appt.notes
      ]);
    });

    return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  }

  return {
    STORAGE_KEY,
    createDefaultState,
    createId,
    sanitizeState,
    loadState,
    saveState,
    clearAllState,
    exportBackupJson,
    parseImportedBackup,
    buildVisitSummaryCsv
  };
});
