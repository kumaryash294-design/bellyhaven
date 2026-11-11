(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PregnancyCalc = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STANDARD_GESTATION_DAYS = 280;
  const DEFAULT_CYCLE_LENGTH = 28;
  const MIN_CYCLE_LENGTH = 20;
  const MAX_CYCLE_LENGTH = 45;
  const MAX_VALID_GESTATION_DAYS = 308; // 44 weeks
  const MS_PER_DAY = 86400000;
  const CONTRACTION_GAP_CUTOFF_MS = 6 * 60 * 60 * 1000;
  const FIVE_ONE_ONE_RECENCY_MS = 30 * 60 * 1000;
  const FIVE_ONE_ONE_BREAK_MS = 15 * 60 * 1000;
  const FIVE_ONE_ONE_MIN_SPAN_MS = 60 * 60 * 1000;

  /**
   * Weekly fetal size milestones (Weeks 4-42) with cm/g metrics and watercolor illustration URLs.
   */
  const MILESTONES = {
    4: { name: 'Poppy Seed', icon: 'seed', imageUrl: './icons/milestones/poppy-seed.svg', lengthCm: 0.2, weightG: 0.2, tip: 'Implantation completes and the amniotic sac begins forming.' },
    5: { name: 'Sesame Seed', icon: 'seed', imageUrl: './icons/milestones/sesame-seed.svg', lengthCm: 0.3, weightG: 0.4, tip: 'Early neural tube and circulatory structures start developing.' },
    6: { name: 'Lentil', icon: 'seed', imageUrl: './icons/milestones/lentil.svg', lengthCm: 0.6, weightG: 0.6, tip: 'Tiny buds that will become arms and legs appear.' },
    7: { name: 'Blueberry', icon: 'berry', imageUrl: './icons/milestones/blueberry.svg', lengthCm: 1.3, weightG: 0.8, tip: 'Facial features and brain hemispheres grow rapidly.' },
    8: { name: 'Raspberry', icon: 'berry', imageUrl: './icons/milestones/raspberry.svg', lengthCm: 1.6, weightG: 1, tip: 'Tiny fingers and toes begin forming; movement starts, though too small to feel.' },
    9: { name: 'Cherry', icon: 'berry', imageUrl: './icons/milestones/cherry.svg', lengthCm: 2.3, weightG: 2, tip: 'Essential organs continue developing and heart valves form.' },
    10: { name: 'Strawberry', icon: 'berry', imageUrl: './icons/milestones/strawberry.svg', lengthCm: 3.1, weightG: 4, tip: 'The embryonic period ends and tooth buds begin forming under the gums.' },
    11: { name: 'Fig', icon: 'plum', imageUrl: './icons/milestones/fig.svg', lengthCm: 4.1, weightG: 7, tip: 'Hands can open and close into tiny fists.' },
    12: { name: 'Plum', icon: 'plum', imageUrl: './icons/milestones/plum.svg', lengthCm: 5.4, weightG: 14, tip: 'Reflexes develop; kidneys start producing small amounts of urine.' },
    13: { name: 'Peach', icon: 'plum', imageUrl: './icons/milestones/peach.svg', lengthCm: 7.4, weightG: 23, tip: 'Unique fingerprints begin forming at the end of the first trimester.' },
    14: { name: 'Lemon', icon: 'citrus', imageUrl: './icons/milestones/lemon.svg', lengthCm: 8.7, weightG: 43, tip: 'Welcome to the second trimester; facial muscles can make tiny expressions.' },
    15: { name: 'Apple', icon: 'apple', imageUrl: './icons/milestones/apple.svg', lengthCm: 10.1, weightG: 70, tip: 'Bones are hardening and baby can sense light through closed eyelids.' },
    16: { name: 'Avocado', icon: 'avocado', imageUrl: './icons/milestones/avocado.svg', lengthCm: 11.6, weightG: 100, tip: 'Ears reach their final position and baby may begin hearing muffled sounds.' },
    17: { name: 'Pear', icon: 'avocado', imageUrl: './icons/milestones/pear.svg', lengthCm: 13.0, weightG: 140, tip: 'Skeleton shifts from soft cartilage toward firmer bone.' },
    18: { name: 'Bell Pepper', icon: 'apple', imageUrl: './icons/milestones/bell-pepper.svg', lengthCm: 14.2, weightG: 190, tip: 'Yawning and hiccups occur; you may soon feel early flutters.' },
    19: { name: 'Mango', icon: 'papaya', imageUrl: './icons/milestones/mango.svg', lengthCm: 15.3, weightG: 240, tip: 'Protective vernix caseosa begins coating delicate skin.' },
    20: { name: 'Banana', icon: 'banana', imageUrl: './icons/milestones/banana.svg', lengthCm: 25.6, weightG: 300, tip: 'Halfway milestone! Swallowing practice strengthens the digestive tract.' },
    21: { name: 'Carrot', icon: 'banana', imageUrl: './icons/milestones/carrot.svg', lengthCm: 26.7, weightG: 360, tip: 'Eyebrows and eyelids are well formed and kicks become stronger.' },
    22: { name: 'Sweet Potato', icon: 'squash', imageUrl: './icons/milestones/sweet-potato.svg', lengthCm: 27.8, weightG: 430, tip: 'Sense of touch develops as baby explores hands and the umbilical cord.' },
    23: { name: 'Grapefruit', icon: 'citrus', imageUrl: './icons/milestones/grapefruit.svg', lengthCm: 28.9, weightG: 501, tip: 'Lungs prepare for breathing by practicing small chest movements.' },
    24: { name: 'Ear of Corn', icon: 'corn', imageUrl: './icons/milestones/ear-of-corn.svg', lengthCm: 30.0, weightG: 600, tip: 'Inner ear balance matures and regular sleep-wake cycles emerge.' },
    25: { name: 'Cantaloupe', icon: 'melon', imageUrl: './icons/milestones/cantaloupe.svg', lengthCm: 34.6, weightG: 660, tip: 'Baby responds to familiar voices and rhythmic movement.' },
    26: { name: 'Lettuce Head', icon: 'melon', imageUrl: './icons/milestones/lettuce-head.svg', lengthCm: 35.6, weightG: 760, tip: 'Eyes begin opening briefly; lung air sacs continue branching.' },
    27: { name: 'Rutabaga', icon: 'squash', imageUrl: './icons/milestones/rutabaga.svg', lengthCm: 36.6, weightG: 875, tip: 'Final week of the second trimester; brain tissue grows rapidly.' },
    28: { name: 'Eggplant', icon: 'eggplant', imageUrl: './icons/milestones/eggplant.svg', lengthCm: 37.6, weightG: 1000, tip: 'Third trimester begins! Eyelashes are present and baby blinks.' },
    29: { name: 'Acorn Squash', icon: 'squash', imageUrl: './icons/milestones/acorn-squash.svg', lengthCm: 38.6, weightG: 1150, tip: 'Muscles and lungs continue maturing as fat layers build.' },
    30: { name: 'Cabbage', icon: 'melon', imageUrl: './icons/milestones/cabbage.svg', lengthCm: 39.9, weightG: 1300, tip: 'Brain develops characteristic folds and temperature regulation improves.' },
    31: { name: 'Coconut', icon: 'melon', imageUrl: './icons/milestones/coconut.svg', lengthCm: 41.1, weightG: 1500, tip: 'All five senses are functioning and weight gain accelerates.' },
    32: { name: 'Pineapple', icon: 'pineapple', imageUrl: './icons/milestones/pineapple.svg', lengthCm: 42.4, weightG: 1700, tip: 'Fingernails and toenails are complete; baby practices breathing motions.' },
    33: { name: 'Celery Bunch', icon: 'corn', imageUrl: './icons/milestones/celery-bunch.svg', lengthCm: 43.7, weightG: 1900, tip: 'Bones harden further while skull bones stay flexible for delivery.' },
    34: { name: 'Honeydew', icon: 'melon', imageUrl: './icons/milestones/honeydew.svg', lengthCm: 45.0, weightG: 2150, tip: 'Central nervous system and lungs continue their final maturation.' },
    35: { name: 'Butternut Squash', icon: 'squash', imageUrl: './icons/milestones/butternut-squash.svg', lengthCm: 46.2, weightG: 2400, tip: 'Space gets cozier, so movements often feel more like rolls and stretches.' },
    36: { name: 'Papaya', icon: 'papaya', imageUrl: './icons/milestones/papaya.svg', lengthCm: 47.4, weightG: 2600, tip: 'Skin smooths out and baby may settle lower into the pelvis.' },
    37: { name: 'Winter Melon', icon: 'watermelon', imageUrl: './icons/milestones/winter-melon.svg', lengthCm: 48.6, weightG: 2850, tip: 'Early term! Baby practices sucking, grasping, and breathing.' },
    38: { name: 'Small Pumpkin', icon: 'squash', imageUrl: './icons/milestones/small-pumpkin.svg', lengthCm: 49.8, weightG: 3100, tip: 'Organ systems are ready for life outside; fine lanugo hair sheds.' },
    39: { name: 'Mini Watermelon', icon: 'watermelon', imageUrl: './icons/milestones/mini-watermelon.svg', lengthCm: 50.7, weightG: 3300, tip: 'Full term! Brain and lungs keep adding final finishing touches.' },
    40: { name: 'Watermelon', icon: 'watermelon', imageUrl: './icons/milestones/watermelon.svg', lengthCm: 51.2, weightG: 3500, tip: 'Estimated due date week! Baby is full term and ready to meet you.' },
    41: { name: 'Large Watermelon', icon: 'watermelon', imageUrl: './icons/milestones/large-watermelon.svg', lengthCm: 51.7, weightG: 3600, tip: 'Late term; providers often monitor fluid levels and fetal movement closely.' },
    42: { name: 'Jackfruit', icon: 'pineapple', imageUrl: './icons/milestones/jackfruit.svg', lengthCm: 52.0, weightG: 3700, tip: 'Post-term week; stay in close contact with your care team.' }
  };

  function formatLengthDual(lengthCm) {
    const inches = (lengthCm / 2.54).toFixed(1);
    return `${lengthCm.toFixed(1)} cm / ${inches} in`;
  }

  function formatWeightDual(weightG) {
    if (weightG < 1) {
      return '< 1 g / < 0.1 oz';
    }
    const oz = (weightG / 28.3495).toFixed(1);
    if (weightG >= 1000) {
      const lb = (weightG / 453.592).toFixed(1);
      return `${weightG.toLocaleString()} g / ${oz} oz (${lb} lb)`;
    }
    return `${weightG} g / ${oz} oz`;
  }

  function parseLocalDate(dateStr) {
    if (typeof dateStr !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function padTwo(num) {
    return String(num).padStart(2, '0');
  }

  function formatLocalDateISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
  }

  function formatReadableDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-';
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      return date.toDateString();
    }
  }

  function addCalendarDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function diffCalendarDays(startDate, endDate) {
    const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((endUtc - startUtc) / MS_PER_DAY);
  }

  function normalizeCycleLength(cycleLength) {
    const parsed = Number.parseInt(cycleLength, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CYCLE_LENGTH;
    return Math.min(MAX_CYCLE_LENGTH, Math.max(MIN_CYCLE_LENGTH, parsed));
  }

  function getCycleOffsetDays(cycleLength) {
    return STANDARD_GESTATION_DAYS + (normalizeCycleLength(cycleLength) - DEFAULT_CYCLE_LENGTH);
  }

  function calculateEddFromLmp(lmpDate, cycleLength) {
    return addCalendarDays(lmpDate, getCycleOffsetDays(cycleLength));
  }

  function calculateLmpFromEdd(eddDate, cycleLength) {
    return addCalendarDays(eddDate, -getCycleOffsetDays(cycleLength));
  }

  function getMilestone(weeks) {
    const numericWeeks = Number.isFinite(weeks) ? Math.floor(weeks) : 0;
    const clampedWeek = numericWeeks < 4 ? 4 : Math.min(42, numericWeeks);
    const entry = MILESTONES[clampedWeek] || MILESTONES[42];
    return {
      week: Math.max(0, Math.min(42, numericWeeks)),
      name: entry.name,
      icon: entry.icon,
      imageUrl: entry.imageUrl,
      lengthCm: entry.lengthCm,
      weightG: entry.weightG,
      length: formatLengthDual(entry.lengthCm),
      weight: formatWeightDual(entry.weightG),
      tip: entry.tip
    };
  }

  function getTrimesterInfo(weeks) {
    if (weeks < 14) {
      return { number: 1, label: '1st Trimester' };
    }
    if (weeks < 28) {
      return { number: 2, label: '2nd Trimester' };
    }
    return { number: 3, label: '3rd Trimester' };
  }

  function validatePregnancyInput({ mode, dateStr, cycleLength, referenceDate }) {
    const ref = referenceDate instanceof Date ? referenceDate : new Date();
    const parsed = parseLocalDate(dateStr);
    if (!parsed) {
      return { valid: false, error: 'Please select a valid calendar date.' };
    }

    const normalizedCycle = normalizeCycleLength(cycleLength);
    const inputMode = mode === 'edd' ? 'edd' : 'lmp';
    const lmp = inputMode === 'edd' ? calculateLmpFromEdd(parsed, normalizedCycle) : parsed;
    const edd = inputMode === 'edd' ? parsed : calculateEddFromLmp(parsed, normalizedCycle);

    const daysSinceLmp = diffCalendarDays(lmp, ref);
    if (daysSinceLmp < 0) {
      return {
        valid: false,
        error:
          inputMode === 'edd'
            ? 'That due date corresponds to a future LMP. Please verify your due date.'
            : 'Last Menstrual Period date cannot be in the future.'
      };
    }

    if (daysSinceLmp > MAX_VALID_GESTATION_DAYS) {
      return {
        valid: false,
        error: 'That date is more than 44 weeks ago. Please verify the date entered.'
      };
    }

    return {
      valid: true,
      mode: inputMode,
      cycleLength: normalizedCycle,
      lmp,
      edd
    };
  }

  function calculatePregnancyStats({ mode, dateStr, cycleLength = DEFAULT_CYCLE_LENGTH, referenceDate }) {
    const ref = referenceDate instanceof Date ? referenceDate : new Date();
    const validation = validatePregnancyInput({ mode, dateStr, cycleLength, referenceDate: ref });
    if (!validation.valid) {
      return validation;
    }

    const { lmp, edd, cycleLength: normalizedCycle } = validation;
    const daysRemaining = diffCalendarDays(ref, edd);
    const rawGestationDays = STANDARD_GESTATION_DAYS - daysRemaining;
    const gestationDays = Math.max(0, rawGestationDays);
    const weeks = Math.floor(gestationDays / 7);
    const days = gestationDays % 7;
    const progressPercent = Math.min(100, Math.max(0, Math.round((gestationDays / STANDARD_GESTATION_DAYS) * 100)));
    const progressPercentExact = Math.min(
      100,
      Math.max(0, Math.round((gestationDays / STANDARD_GESTATION_DAYS) * 1000) / 10)
    );

    return {
      valid: true,
      mode: validation.mode,
      cycleLength: normalizedCycle,
      lmp,
      lmpIso: formatLocalDateISO(lmp),
      edd,
      eddIso: formatLocalDateISO(edd),
      eddFormatted: formatReadableDate(edd),
      gestationDays,
      weeks,
      days,
      stageLabel: `${weeks}w ${days}d`,
      daysRemaining,
      isDueToday: daysRemaining === 0,
      isPastDue: daysRemaining < 0,
      progressPercent,
      progressPercentExact,
      trimester: getTrimesterInfo(weeks),
      milestone: getMilestone(weeks)
    };
  }

  function sanitizePositiveInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  function formatDurationSeconds(totalSeconds) {
    const safeSec = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const hours = Math.floor(safeSec / 3600);
    const minutes = Math.floor((safeSec % 3600) / 60);
    const seconds = safeSec % 60;
    if (hours > 0) {
      return `${hours}:${padTwo(minutes)}:${padTwo(seconds)}`;
    }
    return `${padTwo(minutes)}:${padTwo(seconds)}`;
  }

  function formatDurationWords(totalSeconds) {
    const safeSec = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const minutes = Math.floor(safeSec / 60);
    const seconds = safeSec % 60;
    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Evaluates the intelligent clinical 5-1-1 Rule on the active contraction cluster & rolling last-60m window:
   * - Contractions roughly every 4 to 5 minutes (avg interval <= 330s, max gap <= 480s)
   * - Lasting 45 to 60+ seconds (avg >= 45s, >= 70% in active window >= 45s)
   * - Sustained continuously for at least 1 full hour (span >= 60 min, >= 8 contractions)
   */
  function evaluateFiveOneOneRule(enrichedAsc, nowMs) {
    const empty = {
      isMatch: false,
      spanMinutes: 0,
      count: 0,
      lastHourCount: 0,
      avgDurationSec: null,
      avgIntervalSec: null,
      clusterStartMs: null,
      analyzerPhase: 'idle',
      analyzerText: 'Log contractions to monitor for an active 5-1-1 pattern.'
    };

    if (!Array.isArray(enrichedAsc) || enrichedAsc.length === 0) {
      return empty;
    }

    const latest = enrichedAsc[enrichedAsc.length - 1];
    const lastHourStartMs = nowMs - 60 * 60 * 1000;
    const lastHourAll = enrichedAsc.filter((c) => c.startMs >= lastHourStartMs);

    if (nowMs - latest.endMs > FIVE_ONE_ONE_RECENCY_MS) {
      return {
        ...empty,
        lastHourCount: lastHourAll.length,
        analyzerPhase: lastHourAll.length > 0 ? 'monitoring' : 'idle',
        analyzerText:
          lastHourAll.length > 0
            ? `Last 60m: ${lastHourAll.length} contraction${lastHourAll.length === 1 ? '' : 's'} logged. Tap Start when the next begins.`
            : empty.analyzerText
      };
    }

    // Build continuous active cluster walking backward from latest contraction
    const cluster = [latest];
    for (let i = enrichedAsc.length - 2; i >= 0; i--) {
      const gapMs = cluster[0].startMs - enrichedAsc[i].startMs;
      if (gapMs > FIVE_ONE_ONE_BREAK_MS) {
        break;
      }
      cluster.unshift(enrichedAsc[i]);
    }

    const activeWindow = cluster.filter((c) => c.startMs >= latest.startMs - 65 * 60 * 1000);
    const evaluated = activeWindow.length >= 8 ? activeWindow : cluster;

    const spanMs = latest.startMs - cluster[0].startMs;
    const spanMinutes = Math.round(spanMs / 60000);

    const durations = evaluated.map((c) => c.durationSec);
    const avgDurationSec = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
    const consistentDurationRatio = durations.filter((d) => d >= 45).length / durations.length;

    const intervals = [];
    for (let i = 1; i < evaluated.length; i++) {
      intervals.push(Math.round((evaluated[i].startMs - evaluated[i - 1].startMs) / 1000));
    }
    const avgIntervalSec =
      intervals.length > 0
        ? Math.round(intervals.reduce((sum, v) => sum + v, 0) / intervals.length)
        : null;
    const maxIntervalSec = intervals.length > 0 ? Math.max(...intervals) : null;

    const hasHourSpan = cluster.length >= 8 && spanMs >= FIVE_ONE_ONE_MIN_SPAN_MS;
    const meetsDuration = avgDurationSec >= 45 && consistentDurationRatio >= 0.7;
    const meetsFrequency = avgIntervalSec !== null && avgIntervalSec <= 330 && maxIntervalSec !== null && maxIntervalSec <= 480;
    const isMatch = hasHourSpan && meetsDuration && meetsFrequency;

    let analyzerPhase = 'monitoring';
    let analyzerText = `Last 60m: ${lastHourAll.length} contraction${lastHourAll.length === 1 ? '' : 's'} · Avg ${formatDurationWords(avgDurationSec)}${
      avgIntervalSec !== null ? ` every ${formatDurationWords(avgIntervalSec)}` : ''
    }`;

    if (isMatch) {
      analyzerPhase = 'matched';
      analyzerText = `5-1-1 Pattern Active: ${cluster.length} contractions over ${spanMinutes}m (avg ${formatDurationWords(avgDurationSec)} every ${formatDurationWords(avgIntervalSec)})`;
    } else if (cluster.length >= 4 && meetsDuration && meetsFrequency) {
      analyzerPhase = 'developing';
      const remainingMin = Math.max(1, 60 - spanMinutes);
      analyzerText = `Active ${formatDurationWords(avgDurationSec)} / q${formatDurationWords(avgIntervalSec)} for ${spanMinutes}m (~${remainingMin}m toward 1hr threshold)`;
    }

    return {
      isMatch,
      spanMinutes,
      count: cluster.length,
      lastHourCount: lastHourAll.length,
      avgDurationSec,
      avgIntervalSec,
      clusterStartMs: cluster[0].startMs,
      analyzerPhase,
      analyzerText
    };
  }

  function computeContractionStats(history, nowMs = Date.now()) {
    if (!Array.isArray(history) || history.length === 0) {
      return {
        entries: [],
        lastHourCount: 0,
        avgDurationSec: null,
        avgIntervalSec: null,
        overallAvgDurationSec: null,
        overallAvgIntervalSec: null,
        intensityCounts: { Mild: 0, Moderate: 0, Strong: 0 },
        isFiveOneOnePattern: false,
        fiveOneOne: evaluateFiveOneOneRule([], nowMs)
      };
    }

    const sortedAsc = history
      .filter((item) => item && Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs >= item.startMs)
      .slice()
      .sort((a, b) => a.startMs - b.startMs);

    const intensityCounts = { Mild: 0, Moderate: 0, Strong: 0 };

    const enrichedAsc = sortedAsc.map((item, idx) => {
      const durationSec = Math.max(1, Math.round((item.endMs - item.startMs) / 1000));
      let intervalSec = null;
      if (idx > 0) {
        const gapMs = item.startMs - sortedAsc[idx - 1].startMs;
        if (gapMs >= 0 && gapMs <= CONTRACTION_GAP_CUTOFF_MS) {
          intervalSec = Math.round(gapMs / 1000);
        }
      }
      const intensity =
        item.intensity === 'Mild' || item.intensity === 'Moderate' || item.intensity === 'Strong'
          ? item.intensity
          : '';
      if (intensity) {
        intensityCounts[intensity] += 1;
      }
      return {
        id: item.id,
        startMs: item.startMs,
        endMs: item.endMs,
        durationSec,
        intervalSec,
        intensity
      };
    });

    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const lastHourEntries = enrichedAsc.filter((item) => item.startMs >= oneHourAgo);

    const avgOf = (nums) =>
      nums.length > 0 ? Math.round(nums.reduce((sum, v) => sum + v, 0) / nums.length) : null;

    const avgDurationSec = avgOf(lastHourEntries.map((i) => i.durationSec));
    const avgIntervalSec = avgOf(
      lastHourEntries.map((i) => i.intervalSec).filter((v) => v !== null)
    );
    const overallAvgDurationSec = avgOf(enrichedAsc.map((i) => i.durationSec));
    const overallAvgIntervalSec = avgOf(
      enrichedAsc.map((i) => i.intervalSec).filter((v) => v !== null)
    );

    const fiveOneOne = evaluateFiveOneOneRule(enrichedAsc, nowMs);

    return {
      entries: enrichedAsc.slice().reverse(),
      lastHourCount: lastHourEntries.length,
      avgDurationSec,
      avgIntervalSec,
      overallAvgDurationSec,
      overallAvgIntervalSec,
      intensityCounts,
      isFiveOneOnePattern: fiveOneOne.isMatch,
      fiveOneOne
    };
  }

  function computeKickSummary(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return {
        totalSessions: 0,
        totalKicks: 0,
        avgDurationSec: null,
        avgKicksPerSession: null
      };
    }

    const totalSessions = sessions.length;
    const totalKicks = sessions.reduce((sum, s) => sum + sanitizePositiveInt(s.count, 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + sanitizePositiveInt(s.durationSec, 0), 0);

    return {
      totalSessions,
      totalKicks,
      avgDurationSec: Math.round(totalDuration / totalSessions),
      avgKicksPerSession: Math.round((totalKicks / totalSessions) * 10) / 10
    };
  }

  /**
   * Computes average kicks/hour across the most recent N (default 7) logged kick sessions.
   */
  function computeRecentKickRatePerHour(sessions, limit = 7) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { sessionCount: 0, totalKicks: 0, avgKicksPerHour: null, avgDurationSec: null };
    }
    const recent = sessions.slice(0, Math.max(1, limit));
    let totalKicks = 0;
    let totalDurationSec = 0;

    recent.forEach((s) => {
      totalKicks += sanitizePositiveInt(s.count, 0);
      totalDurationSec += Math.max(60, sanitizePositiveInt(s.durationSec, 0));
    });

    const totalHours = totalDurationSec / 3600;
    const avgKicksPerHour = totalHours > 0 ? Math.round((totalKicks / totalHours) * 10) / 10 : null;

    return {
      sessionCount: recent.length,
      totalKicks,
      avgKicksPerHour,
      avgDurationSec: Math.round(totalDurationSec / recent.length)
    };
  }

  /**
   * Counts total fetal movements logged on the reference calendar day (saved sessions + active taps + quick counter).
   */
  function computeTodaysKickCount(kicksState, referenceDate = new Date()) {
    if (!kicksState || typeof kicksState !== 'object') return 0;
    const targetIso = formatLocalDateISO(referenceDate);
    let total = sanitizePositiveInt(kicksState.quickCount, 0);

    if (Array.isArray(kicksState.sessions)) {
      kicksState.sessions.forEach((sess) => {
        if (sess && Number.isFinite(sess.startedAtMs)) {
          if (formatLocalDateISO(new Date(sess.startedAtMs)) === targetIso) {
            total += sanitizePositiveInt(sess.count, 0);
          }
        }
      });
    }

    const active = kicksState.activeSession;
    if (active && Number.isFinite(active.startedAtMs) && Array.isArray(active.tapTimestampsMs)) {
      if (formatLocalDateISO(new Date(active.startedAtMs)) === targetIso) {
        total += active.tapTimestampsMs.length;
      }
    }

    return total;
  }

  return {
    STANDARD_GESTATION_DAYS,
    DEFAULT_CYCLE_LENGTH,
    MIN_CYCLE_LENGTH,
    MAX_CYCLE_LENGTH,
    MAX_VALID_GESTATION_DAYS,
    MILESTONES,
    parseLocalDate,
    formatLocalDateISO,
    formatReadableDate,
    formatLengthDual,
    formatWeightDual,
    addCalendarDays,
    diffCalendarDays,
    normalizeCycleLength,
    calculateEddFromLmp,
    calculateLmpFromEdd,
    getMilestone,
    getTrimesterInfo,
    validatePregnancyInput,
    calculatePregnancyStats,
    sanitizePositiveInt,
    formatDurationSeconds,
    formatDurationWords,
    computeContractionStats,
    computeKickSummary,
    computeRecentKickRatePerHour,
    computeTodaysKickCount
  };
});
