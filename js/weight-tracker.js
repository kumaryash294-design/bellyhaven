(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyHavenWeightTracker = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KG_PER_LB = 0.45359237;
  const CM_PER_IN = 2.54;

  const ACOG_GUIDELINES = {
    underweight: {
      key: 'underweight',
      label: 'Underweight',
      bmiRange: '< 18.5',
      totalMinKg: 12.5,
      totalMaxKg: 18.0,
      firstTriMinKg: 0.5,
      firstTriMaxKg: 2.0
    },
    normal: {
      key: 'normal',
      label: 'Normal',
      bmiRange: '18.5–24.9',
      totalMinKg: 11.5,
      totalMaxKg: 16.0,
      firstTriMinKg: 0.5,
      firstTriMaxKg: 2.0
    },
    overweight: {
      key: 'overweight',
      label: 'Overweight',
      bmiRange: '25.0–29.9',
      totalMinKg: 7.0,
      totalMaxKg: 11.5,
      firstTriMinKg: 0.5,
      firstTriMaxKg: 2.0
    },
    obese: {
      key: 'obese',
      label: 'Obese',
      bmiRange: '>= 30.0',
      totalMinKg: 5.0,
      totalMaxKg: 9.0,
      firstTriMinKg: 0.5,
      firstTriMaxKg: 2.0
    }
  };

  function kgToLbs(kg) {
    return kg / KG_PER_LB;
  }

  function lbsToKg(lbs) {
    return lbs * KG_PER_LB;
  }

  function cmToIn(cm) {
    return cm / CM_PER_IN;
  }

  function inToCm(inches) {
    return inches * CM_PER_IN;
  }

  function toDisplayWeight(kg, unit) {
    if (!Number.isFinite(kg)) return null;
    const raw = unit === 'lbs' ? kgToLbs(kg) : kg;
    return Math.round(raw * 10) / 10;
  }

  function computeBaselineBmi(preWeightKg, heightCm) {
    if (!Number.isFinite(preWeightKg) || !Number.isFinite(heightCm) || preWeightKg <= 0 || heightCm <= 50) {
      return null;
    }
    const heightM = heightCm / 100;
    const bmi = preWeightKg / (heightM * heightM);
    if (!Number.isFinite(bmi) || bmi <= 5 || bmi >= 100) return null;

    let categoryKey = 'normal';
    if (bmi < 18.5) {
      categoryKey = 'underweight';
    } else if (bmi < 25) {
      categoryKey = 'normal';
    } else if (bmi < 30) {
      categoryKey = 'overweight';
    } else {
      categoryKey = 'obese';
    }

    const guide = ACOG_GUIDELINES[categoryKey];
    return {
      bmi: Math.round(bmi * 10) / 10,
      categoryKey,
      categoryLabel: guide.label,
      guide
    };
  }

  function getRecommendedGainAtWeekKg(week, categoryKey) {
    const guide = ACOG_GUIDELINES[categoryKey] || ACOG_GUIDELINES.normal;
    const w = Math.max(0, Math.min(42, Number.isFinite(week) ? week : 0));

    if (w <= 13) {
      const t = w / 13;
      return {
        minGainKg: guide.firstTriMinKg * t,
        maxGainKg: guide.firstTriMaxKg * t
      };
    }

    const t = Math.min(42 - 13, w - 13) / 27;
    return {
      minGainKg: guide.firstTriMinKg + (guide.totalMinKg - guide.firstTriMinKg) * t,
      maxGainKg: guide.firstTriMaxKg + (guide.totalMaxKg - guide.firstTriMaxKg) * t
    };
  }

  function parseJournalWeightKg(rawWeightStr, fallbackUnit = 'kg') {
    if (typeof rawWeightStr !== 'string' && typeof rawWeightStr !== 'number') return null;
    const str = String(rawWeightStr).trim().toLowerCase();
    if (!str) return null;

    const numMatch = /(\d+(?:[.,]\d+)?)/.exec(str);
    if (!numMatch) return null;
    const num = Number.parseFloat(numMatch[1].replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;

    let isLbs = fallbackUnit === 'lbs';
    if (/\b(?:lb|lbs|pound|pounds)\b/.test(str)) {
      isLbs = true;
    } else if (/\b(?:kg|kgs|kilo|kilogram|kilograms)\b/.test(str)) {
      isLbs = false;
    }

    const kg = isLbs ? lbsToKg(num) : num;
    if (kg < 25 || kg > 260) return null;
    return Math.round(kg * 100) / 100;
  }

  /**
   * Builds a smooth cubic Bezier SVG path through sorted chart coordinates (Catmull-Rom spline with clamped handles).
   */
  function buildSmoothSvgPath(points) {
    if (!Array.isArray(points) || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    }
    if (points.length === 2) {
      return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < points.length ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function extractPlottedJournalPoints({ journalEntries, lmpDate, calc, fallbackUnit }) {
    if (!Array.isArray(journalEntries) || !lmpDate || !calc) return [];
    const byDate = new Map();

    journalEntries.forEach((entry) => {
      if (!entry || !entry.dateStr || !entry.weight) return;
      const kg = parseJournalWeightKg(entry.weight, fallbackUnit);
      if (kg === null) return;
      const entryDate = calc.parseLocalDate(entry.dateStr);
      if (!entryDate) return;
      const days = calc.diffCalendarDays(lmpDate, entryDate);
      const week = days / 7;
      if (week < 0 || week > 42) return;

      if (!byDate.has(entry.dateStr)) {
        byDate.set(entry.dateStr, {
          dateStr: entry.dateStr,
          week: Math.round(week * 10) / 10,
          kg
        });
      }
    });

    return Array.from(byDate.values()).sort((a, b) => a.week - b.week);
  }

  function computeWeightChartModel({
    unit = 'kg',
    preWeightKg = null,
    heightCm = null,
    currentWeek = null,
    journalEntries = [],
    lmpDate = null,
    calc = null
  }) {
    const safeUnit = unit === 'lbs' ? 'lbs' : 'kg';
    const bmiInfo = computeBaselineBmi(preWeightKg, heightCm);
    const activeCategory = bmiInfo ? bmiInfo.categoryKey : 'normal';
    const guide = ACOG_GUIDELINES[activeCategory];

    const rawPoints = extractPlottedJournalPoints({
      journalEntries,
      lmpDate,
      calc,
      fallbackUnit: safeUnit
    });

    const baselineKg = Number.isFinite(preWeightKg) && preWeightKg > 25 ? preWeightKg : null;
    const isGainOnlyMode = baselineKg === null;
    const baseDisplay = baselineKg !== null ? toDisplayWeight(baselineKg, safeUnit) : 0;

    // Sample ACOG upper/lower boundary curves across Weeks 0, 13, 40
    const sampleWeeks = [0, 13, 40];
    const bandUpperPts = sampleWeeks.map((w) => {
      const g = getRecommendedGainAtWeekKg(w, activeCategory);
      const totalKg = isGainOnlyMode ? g.maxGainKg : baselineKg + g.maxGainKg;
      return { week: w, val: toDisplayWeight(totalKg, safeUnit) };
    });
    const bandLowerPts = sampleWeeks.map((w) => {
      const g = getRecommendedGainAtWeekKg(w, activeCategory);
      const totalKg = isGainOnlyMode ? g.minGainKg : baselineKg + g.minGainKg;
      return { week: w, val: toDisplayWeight(totalKg, safeUnit) };
    });

    const plottedPoints = rawPoints.map((pt) => {
      const val = isGainOnlyMode ? pt.kg : pt.kg;
      return {
        week: pt.week,
        dateStr: pt.dateStr,
        kg: pt.kg,
        val: toDisplayWeight(val, safeUnit)
      };
    });

    // When user hasn't entered pre-pregnancy weight yet, plot absolute weights centered cleanly
    const allVals = [];
    if (!isGainOnlyMode) {
      bandLowerPts.forEach((p) => allVals.push(p.val));
      bandUpperPts.forEach((p) => allVals.push(p.val));
    } else {
      allVals.push(0, toDisplayWeight(guide.totalMaxKg, safeUnit));
    }
    if (!isGainOnlyMode) {
      plottedPoints.forEach((p) => allVals.push(p.val));
    }

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const span = Math.max(safeUnit === 'lbs' ? 12 : 6, rawMax - rawMin);
    const pad = span * 0.14;
    const yMin = Math.floor((rawMin - pad) * 10) / 10;
    const yMax = Math.ceil((rawMax + pad) * 10) / 10;

    const svgWidth = 360;
    const svgHeight = 205;
    const margin = { top: 18, right: 16, bottom: 28, left: 42 };
    const plotW = svgWidth - margin.left - margin.right;
    const plotH = svgHeight - margin.top - margin.bottom;

    const scaleX = (week) => margin.left + (Math.max(0, Math.min(40, week)) / 40) * plotW;
    const scaleY = (val) => {
      const norm = (val - yMin) / Math.max(0.1, yMax - yMin);
      return margin.top + plotH - norm * plotH;
    };

    const upperCoords = bandUpperPts.map((p) => ({ x: scaleX(p.week), y: scaleY(p.val) }));
    const lowerCoords = bandLowerPts.map((p) => ({ x: scaleX(p.week), y: scaleY(p.val) }));

    const bandPolygonStr = upperCoords
      .concat(lowerCoords.slice().reverse())
      .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');

    const upperPathD = `M ${upperCoords.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ')}`;
    const lowerPathD = `M ${lowerCoords.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ')}`;

    const userCoords = !isGainOnlyMode
      ? plottedPoints.map((p) => ({
          x: scaleX(p.week),
          y: scaleY(p.val),
          week: p.week,
          val: p.val,
          dateStr: p.dateStr
        }))
      : [];

    const userPathD = buildSmoothSvgPath(userCoords);

    // Status assessment for latest logged point
    let statusNote = 'Enter pre-pregnancy weight and height above to calculate baseline BMI and plot your personal ACOG gain zone.';
    if (bmiInfo) {
      const minTargetDisp = toDisplayWeight(guide.totalMinKg, safeUnit);
      const maxTargetDisp = toDisplayWeight(guide.totalMaxKg, safeUnit);
      const unitLabel = safeUnit;

      if (userCoords.length === 0) {
        statusNote = `ACOG guideline for ${bmiInfo.categoryLabel} BMI (${bmiInfo.bmi}): ${minTargetDisp}–${maxTargetDisp} ${unitLabel} total gain by Week 40. Log weight in Daily Check-In above to plot points.`;
      } else {
        const latest = userCoords[userCoords.length - 1];
        const expected = getRecommendedGainAtWeekKg(latest.week, activeCategory);
        const minAtWeek = toDisplayWeight(baselineKg + expected.minGainKg, safeUnit);
        const maxAtWeek = toDisplayWeight(baselineKg + expected.maxGainKg, safeUnit);
        if (latest.val < minAtWeek) {
          statusNote = `Latest (${latest.val} ${unitLabel} at ~${latest.week}w) is slightly below the typical Week ${Math.round(latest.week)} ACOG band (${minAtWeek}–${maxAtWeek} ${unitLabel}).`;
        } else if (latest.val > maxAtWeek) {
          statusNote = `Latest (${latest.val} ${unitLabel} at ~${latest.week}w) is above the typical Week ${Math.round(latest.week)} ACOG band (${minAtWeek}–${maxAtWeek} ${unitLabel}). Share trends at your next visit.`;
        } else {
          statusNote = `Latest (${latest.val} ${unitLabel} at ~${latest.week}w) tracks within the healthy ACOG range (${minAtWeek}–${maxAtWeek} ${unitLabel}).`;
        }
      }
    }

    return {
      unit: safeUnit,
      bmiInfo,
      guide,
      isGainOnlyMode,
      baseDisplay,
      yMin,
      yMax,
      svgWidth,
      svgHeight,
      margin,
      bandPolygonStr,
      upperPathD,
      lowerPathD,
      userCoords,
      userPathD,
      currentWeekX: Number.isFinite(currentWeek) && currentWeek >= 0 ? scaleX(Math.min(40, currentWeek)) : null,
      scaleX,
      scaleY,
      statusNote
    };
  }

  function svgEl(tag, attrs = {}, text = null) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== null && v !== undefined) {
        el.setAttribute(k, String(v));
      }
    });
    if (text !== null) {
      el.textContent = text;
    }
    return el;
  }

  function renderWeightChartSvg(containerEl, model) {
    if (!containerEl || !model) return;
    containerEl.innerHTML = '';

    const { svgWidth, svgHeight, margin, yMin, yMax, unit } = model;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      class: 'weight-trajectory-svg',
      role: 'img',
      'aria-label': 'ACOG-standard prenatal weight gain trajectory chart across 40 weeks'
    });

    // Subtle horizontal Y gridlines (4 steps)
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const val = yMin + ((yMax - yMin) * i) / steps;
      const y = model.scaleY(val);
      svg.appendChild(
        svgEl('line', {
          x1: margin.left,
          y1: y.toFixed(1),
          x2: svgWidth - margin.right,
          y2: y.toFixed(1),
          stroke: '#f0e1e3',
          'stroke-width': 1
        })
      );
      svg.appendChild(
        svgEl(
          'text',
          {
            x: margin.left - 6,
            y: (y + 3).toFixed(1),
            'text-anchor': 'end',
            'font-size': 9.5,
            fill: '#6f738a'
          },
          `${Math.round(val * 10) / 10}`
        )
      );
    }

    // Y-axis unit tag
    svg.appendChild(
      svgEl(
        'text',
        {
          x: margin.left - 6,
          y: margin.top - 5,
          'text-anchor': 'end',
          'font-size': 9,
          'font-weight': 700,
          fill: '#C4737E'
        },
        model.isGainOnlyMode ? `+${unit}` : unit
      )
    );

    // Week X-axis ticks (0w, 13w, 20w, 28w, 40w)
    [0, 13, 20, 28, 40].forEach((wk) => {
      const x = model.scaleX(wk);
      svg.appendChild(
        svgEl('line', {
          x1: x.toFixed(1),
          y1: margin.top,
          x2: x.toFixed(1),
          y2: svgHeight - margin.bottom,
          stroke: wk === 13 || wk === 28 ? '#eedade' : '#f6ecee',
          'stroke-width': 1,
          'stroke-dasharray': wk === 13 || wk === 28 ? '2,3' : null
        })
      );
      svg.appendChild(
        svgEl(
          'text',
          {
            x: x.toFixed(1),
            y: svgHeight - 10,
            'text-anchor': 'middle',
            'font-size': 9.5,
            fill: '#6f738a'
          },
          `${wk}w`
        )
      );
    });

    // Shaded ACOG healthy gain band polygon
    svg.appendChild(
      svgEl('polygon', {
        points: model.bandPolygonStr,
        fill: 'rgba(232, 180, 184, 0.34)',
        stroke: 'none'
      })
    );

    // Upper & lower dashed clinical boundary lines
    svg.appendChild(
      svgEl('path', {
        d: model.upperPathD,
        fill: 'none',
        stroke: '#d699a2',
        'stroke-width': 1.4,
        'stroke-dasharray': '4,3'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: model.lowerPathD,
        fill: 'none',
        stroke: '#d699a2',
        'stroke-width': 1.4,
        'stroke-dasharray': '4,3'
      })
    );

    // Current pregnancy week vertical marker
    if (model.currentWeekX !== null) {
      svg.appendChild(
        svgEl('line', {
          x1: model.currentWeekX.toFixed(1),
          y1: margin.top,
          x2: model.currentWeekX.toFixed(1),
          y2: svgHeight - margin.bottom,
          stroke: '#C4737E',
          'stroke-width': 1.2,
          'stroke-opacity': 0.55,
          'stroke-dasharray': '3,2'
        })
      );
    }

    // Baseline horizontal reference if pre-pregnancy weight entered
    if (!model.isGainOnlyMode) {
      const baseY = model.scaleY(model.baseDisplay);
      svg.appendChild(
        svgEl('line', {
          x1: margin.left,
          y1: baseY.toFixed(1),
          x2: svgWidth - margin.right,
          y2: baseY.toFixed(1),
          stroke: '#b8bdc9',
          'stroke-width': 1,
          'stroke-dasharray': '2,2'
        })
      );
    }

    // Logged weight curve + points
    if (model.userCoords.length >= 2 && model.userPathD) {
      svg.appendChild(
        svgEl('path', {
          d: model.userPathD,
          fill: 'none',
          stroke: '#C4737E',
          'stroke-width': 2.5,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        })
      );
    }

    model.userCoords.forEach((pt, idx) => {
      const isLast = idx === model.userCoords.length - 1;
      const circle = svgEl('circle', {
        cx: pt.x.toFixed(1),
        cy: pt.y.toFixed(1),
        r: isLast ? 4.5 : 3.4,
        fill: isLast ? '#C4737E' : '#ffffff',
        stroke: '#C4737E',
        'stroke-width': 2
      });
      const title = svgEl('title', {}, `${pt.dateStr} (${pt.week}w): ${pt.val} ${unit}`);
      circle.appendChild(title);
      svg.appendChild(circle);
    });

    containerEl.appendChild(svg);
  }

  return {
    ACOG_GUIDELINES,
    kgToLbs,
    lbsToKg,
    cmToIn,
    inToCm,
    toDisplayWeight,
    computeBaselineBmi,
    getRecommendedGainAtWeekKg,
    parseJournalWeightKg,
    buildSmoothSvgPath,
    computeWeightChartModel,
    renderWeightChartSvg
  };
});
