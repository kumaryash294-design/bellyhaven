(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const calc = require('./calculations');
    module.exports = factory(calc);
  } else {
    root.PregnancyDoula = factory(root.PregnancyCalc);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (calc) {
  'use strict';

  const DISCLAIMER =
    'Educational companion only. Always confirm with your OB-GYN or healthcare provider.';

  const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
  const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
  const REQUEST_TIMEOUT_MS = 20000;

  const RED_FLAG_RULES = [
    {
      label: 'vaginal bleeding',
      pattern: /\b(heavy\s+bleeding|vaginal\s+bleeding|soaking\s+(a\s+)?pad|bright\s+red\s+blood|bleeding\s+heavily|passing\s+clots)\b/i
    },
    {
      label: 'severe abdominal or pelvic pain',
      pattern: /\b(severe\s+(abdominal|stomach|belly|pelvic)\s*(pain|cramp|cramps|cramping)|intense\s+cramping|sharp\s+one[- ]sided\s+pain|unbearable\s+pain)\b/i
    },
    {
      label: 'sudden swelling or vision/headache warning signs',
      pattern: /\b(sudden\s+(facial|face|hand|hands|eye)\s+swelling|swelling\s+in\s+(my\s+)?face|blurred\s+vision|seeing\s+spots|flashing\s+lights|severe\s+headache)\b/i
    },
    {
      label: 'reduced or absent fetal movement',
      pattern: /\b(reduced\s+(fetal\s+)?movement|decreased\s+(fetal\s+)?movement|baby\s+(stopped|isn'?t|is\s+not|hasn'?t\s+been)\s+(moving|kicking)|no\s+(fetal\s+)?movement|haven'?t\s+felt\s+(the\s+)?baby\s+move)\b/i
    },
    {
      label: 'high fever',
      pattern: /\b(high\s+fever|fever\s+(over|above)\s*(100\.4|101|102|38)|38\.[5-9]|39\s*°?c|10[1-4]\s*°?f)\b/i
    },
    {
      label: 'fluid leakage / possible water breaking',
      pattern: /\b(water\s+broke|gush\s+of\s+fluid|leaking\s+(amniotic\s+)?fluid)\b/i
    },
    {
      label: 'chest pain, trouble breathing, or fainting',
      pattern: /\b(chest\s+pain|shortness\s+of\s+breath|trouble\s+breathing|hard\s+to\s+breathe|fainted|passing\s+out)\b/i
    }
  ];

  function detectRedFlags(text) {
    if (typeof text !== 'string' || !text.trim()) {
      return { isRedFlag: false, reasons: [] };
    }
    const reasons = [];
    RED_FLAG_RULES.forEach((rule) => {
      if (rule.pattern.test(text)) {
        reasons.push(rule.label);
      }
    });
    return {
      isRedFlag: reasons.length > 0,
      reasons
    };
  }

  function getRecentSymptoms14Days(entries, referenceDate = new Date()) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return {
        entryCount: 0,
        symptomCounts: {},
        symptomsList: [],
        moods: [],
        notesSummary: []
      };
    }

    const symptomCounts = {};
    const moodSet = new Set();
    const notesSummary = [];
    let entryCount = 0;

    entries.forEach((entry) => {
      if (!entry || !entry.dateStr) return;
      const parsed = calc.parseLocalDate(entry.dateStr);
      if (!parsed) return;
      const daysAgo = calc.diffCalendarDays(parsed, referenceDate);
      if (daysAgo < 0 || daysAgo > 14) return;

      entryCount += 1;
      if (Array.isArray(entry.symptoms)) {
        entry.symptoms.forEach((sym) => {
          if (typeof sym === 'string' && sym.trim()) {
            const key = sym.trim();
            symptomCounts[key] = (symptomCounts[key] || 0) + 1;
          }
        });
      }
      if (entry.mood) {
        moodSet.add(entry.mood);
      }
      if (entry.note && entry.note.trim() && notesSummary.length < 4) {
        notesSummary.push(`${entry.dateStr}: ${entry.note.trim().slice(0, 140)}`);
      }
    });

    const symptomsList = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => (count > 1 ? `${name} (${count}x)` : name));

    return {
      entryCount,
      symptomCounts,
      symptomsList,
      moods: Array.from(moodSet),
      notesSummary
    };
  }

  function buildContextData(state, stats, referenceDate = new Date()) {
    const recent14 = getRecentSymptoms14Days(
      state && state.journal ? state.journal.entries : [],
      referenceDate
    );
    const hasProfile = Boolean(stats && stats.valid);

    return {
      hasProfile,
      weeks: hasProfile ? stats.weeks : null,
      days: hasProfile ? stats.days : null,
      stageLabel: hasProfile ? stats.stageLabel : 'Not configured',
      trimesterNumber: hasProfile ? stats.trimester.number : null,
      trimesterLabel: hasProfile ? stats.trimester.label : 'Pregnancy (stage unset)',
      eddFormatted: hasProfile ? stats.eddFormatted : 'Not configured',
      milestoneName: hasProfile ? stats.milestone.name : null,
      milestoneLength: hasProfile ? stats.milestone.length : null,
      milestoneWeight: hasProfile ? stats.milestone.weight : null,
      recent14Days: recent14,
      recentSymptomsList: recent14.symptomsList,
      emergencyPhone:
        state && state.profile && state.profile.emergencyPhone
          ? state.profile.emergencyPhone
          : ''
    };
  }

  function buildSystemPrompt(contextData) {
    const stageLine = contextData.hasProfile
      ? `Week ${contextData.weeks}, Day ${contextData.days} (${contextData.stageLabel}) — ${contextData.trimesterLabel}; Estimated Due Date: ${contextData.eddFormatted}; Milestone size: ${contextData.milestoneName} (${contextData.milestoneLength}, ${contextData.milestoneWeight}).`
      : 'Gestational date not yet saved by user.';

    const symptomsLine =
      contextData.recentSymptomsList.length > 0
        ? contextData.recentSymptomsList.join(', ')
        : 'None logged in the past 14 days.';

    const moodsLine =
      contextData.recent14Days.moods.length > 0
        ? contextData.recent14Days.moods.join(', ')
        : 'None logged.';

    const notesLine =
      contextData.recent14Days.notesSummary.length > 0
        ? contextData.recent14Days.notesSummary.join(' | ')
        : 'None.';

    return [
      'You are Haven AI, a certified, gentle 24/7 maternity companion and pregnancy educator for the BellyHaven app. Provide calm, evidence-based guidance (ACOG/NHS compliant). Always include the standard non-diagnostic medical disclaimer.',
      '',
      'TONE & COMMUNICATION:',
      '- Be warm, empathetic, reassuring, calm, clear, and non-judgmental.',
      '- Keep answers concise, well-structured, and easy to read on a mobile screen (use short paragraphs or bullet points).',
      '- Never diagnose conditions or prescribe medications.',
      '',
      'PATIENT PREGNANCY CONTEXT (automatically injected):',
      `- Gestational Stage: ${stageLine}`,
      `- Symptoms logged in last 14 days: ${symptomsLine}`,
      `- Recent moods (14 days): ${moodsLine}`,
      `- Recent journal notes: ${notesLine}`,
      '',
      'RED FLAG SAFETY PROTOCOL (MANDATORY):',
      '- If the user describes or asks about urgent warning signs—such as heavy vaginal bleeding, severe abdominal/pelvic cramping or pain, sudden facial/hand swelling, severe headache with vision changes, reduced/absent fetal movement in the 3rd trimester, leaking amniotic fluid, high fever, chest pain, or trouble breathing—IMMEDIATELY advise seeking urgent medical care from their OB-GYN, midwife, maternity triage, or local emergency services.',
      '',
      'MANDATORY CLOSING DISCLAIMER:',
      `- Every single response MUST end with this exact sentence on its own line: "${DISCLAIMER}"`
    ].join('\n');
  }

  function ensureDisclaimer(text) {
    const clean = String(text || '').trim();
    if (!clean) return DISCLAIMER;
    if (clean.includes(DISCLAIMER)) return clean;
    return `${clean}\n\n${DISCLAIMER}`;
  }

  function buildDoctorQuestionsPrompt(contextData) {
    const symptomsText =
      contextData.recentSymptomsList.length > 0
        ? contextData.recentSymptomsList.join(', ')
        : 'no specific symptoms logged in the past 14 days';
    const stageText = contextData.hasProfile
      ? `Week ${contextData.weeks}+${contextData.days} (${contextData.trimesterLabel})`
      : 'my current stage of pregnancy';

    return `Based on my stage (${stageText}) and my logged symptoms over the last 14 days (${symptomsText}), generate exactly 3 concise, practical bulleted questions I should ask at my next OB-GYN or midwife appointment.`;
  }

  function generateDoctorQuestionsOffline(contextData) {
    const stageRef = contextData.hasProfile
      ? `At **Week ${contextData.weeks}** (${contextData.trimesterLabel})`
      : 'For your upcoming prenatal visit';
    const symptoms = contextData.recentSymptomsList;
    const rawKeys = Object.keys(contextData.recent14Days.symptomCounts || {});
    const questions = [];

    if (rawKeys.length > 0) {
      const topList = symptoms.slice(0, 3).join(', ');
      questions.push(
        `- I have logged **${topList}** over the past 14 days—are these patterns expected for my current stage, and what safe relief options do you recommend?`
      );
    } else if (contextData.hasProfile) {
      questions.push(
        `- Looking ahead from **Week ${contextData.weeks}**, which normal changes should I expect before my next visit, and which symptoms mean I should call the clinic?`
      );
    } else {
      questions.push(
        '- Based on my current week of pregnancy, which routine screenings, labs, or vaccines should we plan for next?'
      );
    }

    if (rawKeys.includes('Swelling') || rawKeys.includes('Headache')) {
      questions.push(
        '- Since I noted **swelling or headaches** recently, should we double-check my blood pressure or review specific warning signs to watch for at home?'
      );
    } else if (rawKeys.includes('Braxton Hicks') || rawKeys.includes('Cramps')) {
      questions.push(
        '- Given my recent **cramping or Braxton Hicks**, how do you recommend distinguishing normal uterine tightening from contractions that need evaluation?'
      );
    } else if (contextData.hasProfile && contextData.weeks >= 28) {
      questions.push(
        '- What kick-counting routine and fetal movement baseline would you like me to follow during this 3rd trimester?'
      );
    } else {
      questions.push(
        '- Is baby’s growth and my weight/blood pressure trend right on track for this stage of pregnancy?'
      );
    }

    if (contextData.hasProfile && contextData.weeks >= 32) {
      questions.push(
        '- When should I call labor & delivery triage versus coming in, and what are your updated preferences for my birth plan?'
      );
    } else if (contextData.hasProfile && contextData.weeks >= 18 && contextData.weeks <= 24) {
      questions.push(
        '- What specific milestones or anatomy measurements will we review at my mid-pregnancy ultrasound?'
      );
    } else {
      questions.push(
        '- Are there any adjustments needed for my prenatal vitamins, hydration, iron levels, or sleep routine right now?'
      );
    }

    return ensureDisclaimer(
      `${stageRef}, here are **3 concise questions** to bring to your next appointment:\n\n${questions.join('\n')}`
    );
  }

  function generateOfflineDoulaResponse(userMessage, contextData, options = {}) {
    const redFlag = detectRedFlags(userMessage);
    if (redFlag.isRedFlag) {
      const contactHint = contextData.emergencyPhone
        ? `You have an emergency/provider number saved (**${contextData.emergencyPhone}**) — tap **Call Doctor / Emergency Contact** below to reach them directly.`
        : 'Please call your OB-GYN, midwife, maternity triage unit, or local emergency services right away.';

      const urgentBody = [
        `⚠️ **Please seek prompt medical evaluation.** You mentioned **${redFlag.reasons.join(', ')}**, which can be an urgent warning sign in pregnancy.`,
        '',
        contactHint,
        '',
        '**Helpful details to share when you call:**',
        contextData.hasProfile
          ? `- Current stage: **${contextData.stageLabel}** (${contextData.trimesterLabel})`
          : '- How many weeks pregnant you are',
        '- When the symptom started and how severe it feels',
        '- Any accompanying changes (dizziness, fever, fluid leakage, or movement changes)',
        '',
        'You are doing the right thing by checking in quickly.'
      ].join('\n');

      return {
        text: ensureDisclaimer(urgentBody),
        isRedFlag: true,
        sourceLabel: 'Urgent Safety Protocol'
      };
    }

    const msg = String(userMessage || '').toLowerCase();

    if (
      options.intent === 'doctor-questions' ||
      /\b(3|three)\s+questions\b/.test(msg) ||
      /questions\s+for\s+my\s+next\s+ob/i.test(msg)
    ) {
      return {
        text: generateDoctorQuestionsOffline(contextData),
        isRedFlag: false,
        sourceLabel: 'Haven AI · Offline'
      };
    }

    // Baby size / growth milestone
    if (/\b(baby('?s)?\s*(current\s*)?size|size\s+normal|weight|length|how\s+big)\b/.test(msg)) {
      if (contextData.hasProfile) {
        const body = [
          `At **Week ${contextData.weeks}** (${contextData.trimesterLabel}), babies are roughly the size of a **${contextData.milestoneName}** — about **${contextData.milestoneLength}** long and **${contextData.milestoneWeight}**.`,
          '',
          '- **Normal range:** Healthy babies vary noticeably in length and weight, especially from the 2nd trimester onward.',
          '- **How growth is checked:** Your care team tracks growth through fundal height measurements and scheduled ultrasounds rather than app estimates alone.',
          contextData.recentSymptomsList.length > 0
            ? `- **Your recent context:** I also see you recently logged *${contextData.recentSymptomsList.join(', ')}* — mention any persistent discomfort at your next check-in.`
            : ''
        ]
          .filter(Boolean)
          .join('\n');
        return { text: ensureDisclaimer(body), isRedFlag: false, sourceLabel: 'Offline Guide' };
      }
      return {
        text: ensureDisclaimer(
          'Every baby grows at a slightly different pace! Save your **LMP or Due Date** on the **Progress** tab so I can share your exact weekly size milestone, length, and weight estimate.'
        ),
        isRedFlag: false,
        sourceLabel: 'Offline Guide'
      };
    }

    // Food safety checker
    if (
      /\b(eat|food\s+safety|safe\s+to\s+eat|cheese|sushi|fish|coffee|caffeine|deli|meat|egg|tea|pineapple|papaya|honey|alcohol|wine|milk)\b/.test(
        msg
      )
    ) {
      const specifics = [];
      if (/\b(cheese|brie|feta|camembert|dairy|milk)\b/.test(msg)) {
        specifics.push('- **Cheeses & dairy:** Hard cheeses (cheddar, parmesan) and **pasteurized** soft cheeses/milk are safe; avoid unpasteurized soft/mold-ripened cheeses unless cooked steaming hot.');
      }
      if (/\b(sushi|fish|salmon|tuna|seafood|shellfish)\b/.test(msg)) {
        specifics.push('- **Seafood & sushi:** Cooked low-mercury fish (like salmon, cod, shrimp, tilapia) 2–3 servings/week is recommended by ACOG. Avoid raw/undercooked fish and high-mercury fish (shark, swordfish, king mackerel, bigeye tuna).');
      }
      if (/\b(coffee|caffeine|tea|espresso|matcha)\b/.test(msg)) {
        specifics.push('- **Caffeine:** ACOG and NHS recommend keeping total caffeine under **200 mg per day** (roughly one 12 oz brewed coffee). Check herbal teas individually.');
      }
      if (/\b(deli|ham|turkey|hot\s*dog|salami|meat)\b/.test(msg)) {
        specifics.push('- **Deli meats:** Heat cold cuts, hot dogs, and cured meats until steaming hot (165°F / 74°C) to reduce Listeria risk, and ensure poultry/beef are cooked through.');
      }

      const body = [
        '**Evidence-Based Pregnancy Food Safety (ACOG / NHS):**',
        ...(specifics.length > 0
          ? specifics
          : [
              '- **Safe staples:** Well-cooked meats, eggs cooked until firm (or pasteurized), washed produce, pasteurized dairy, and cooked low-mercury fish (salmon, shrimp, cod).',
              '- **Foods to avoid or heat:** Unpasteurized dairy/juices, raw/undercooked fish/meat/eggs, high-mercury fish, cold deli meats (unless heated steaming hot), and all alcohol.',
              '- **Caffeine limit:** Keep caffeine under **200 mg/day**.'
            ]),
        '',
        'Tell me the exact food or drink you have in mind and I can check the guidance for it!'
      ].join('\n');

      return { text: ensureDisclaimer(body), isRedFlag: false, sourceLabel: 'Offline Guide' };
    }

    // Sleep positions
    if (/\b(sleep|sleeping|position|pillow|back\s+sleep|side\s+sleep)\b/.test(msg)) {
      const trim = contextData.trimesterNumber;
      const stageAdvice =
        trim === 1
          ? `In your **1st Trimester** (Week ${contextData.weeks}), sleeping in whichever position feels comfortable is generally fine—it’s also a great time to start practicing side-sleeping habits.`
          : trim === 2 || trim === 3
            ? `In your **${contextData.trimesterLabel}** (Week ${contextData.weeks}), NHS and ACOG guidance recommends **going to sleep on your side** (left or right) to support optimal blood flow to the placenta and reduce pressure on major blood vessels.`
            : 'From the **2nd trimester onward (~20+ weeks)**, settling to sleep on your **side** (either left or right) supports healthy blood flow for you and baby.';

      const body = [
        stageAdvice,
        '',
        '- **Comfort tips:** Tuck a pillow between your knees, support your growing belly with a small wedge, and place a pillow behind your back so you stay tilted comfortably.',
        '- **Waking up on your back:** Don’t worry if you roll onto your back while asleep—simply roll gently back onto your side when you notice.'
      ].join('\n');

      return { text: ensureDisclaimer(body), isRedFlag: false, sourceLabel: 'Offline Guide' };
    }

    // Common symptoms
    if (/\b(nausea|morning\s+sickness|vomit|queasy|heartburn|acid\s+reflux|fatigue|tired|backache|back\s+pain|swelling|braxton)\b/.test(msg)) {
      const tips = [];
      if (/\b(nausea|morning\s+sickness|vomit|queasy)\b/.test(msg)) {
        tips.push('- **Nausea:** Small, frequent bland meals (crackers before getting up), ginger, cold fluids, and vitamin B6 options discussed with your provider often help.');
      }
      if (/\b(heartburn|acid\s+reflux)\b/.test(msg)) {
        tips.push('- **Heartburn:** Smaller meals, staying upright 30–60 min after eating, and elevating your upper body slightly at night can ease reflux.');
      }
      if (/\b(fatigue|tired)\b/.test(msg)) {
        tips.push('- **Fatigue:** Rest breaks, steady hydration, protein-rich snacks, and checking iron/hemoglobin levels at prenatal visits are worthwhile.');
      }
      if (/\b(backache|back\s+pain)\b/.test(msg)) {
        tips.push('- **Backache:** Supportive footwear, warm compresses, gentle prenatal stretches, and sleeping with a pillow between your knees help relieve pelvic/lumbar strain.');
      }
      if (/\b(swelling)\b/.test(msg)) {
        tips.push('- **Mild ankle/foot swelling:** Elevate feet, stay hydrated, and avoid tight socks. Seek urgent care immediately if swelling appears suddenly in your face or hands.');
      }
      if (/\b(braxton)\b/.test(msg)) {
        tips.push('- **Braxton Hicks:** Practice tightenings are usually irregular and ease with hydration or rest. Use our **Timer** tab if contractions become regular or follow the 5-1-1 rule.');
      }

      const intro = contextData.hasProfile
        ? `At **${contextData.stageLabel}** (${contextData.trimesterLabel}), here are gentle, evidence-based comfort strategies:`
        : 'Here are gentle, evidence-based comfort strategies:';

      return {
        text: ensureDisclaimer(`${intro}\n\n${tips.join('\n')}`),
        isRedFlag: false,
        sourceLabel: 'Offline Guide'
      };
    }

    // General fallback
    const stagePrefix = contextData.hasProfile
      ? `I have your current context (**${contextData.stageLabel}**, ${contextData.trimesterLabel}${
          contextData.recentSymptomsList.length > 0
            ? `, recent symptoms: *${contextData.recentSymptomsList.slice(0, 3).join(', ')}*`
            : ''
        }).`
      : 'Tip: Save your LMP or Due Date on the **Progress** tab so I can tailor guidance to your exact week.';

    const generalBody = [
      `I’m here to support you calmly with evidence-based pregnancy education. ${stagePrefix}`,
      '',
      'You can ask me about:',
      '- **Baby size & weekly development**',
      '- **Food & drink safety** (e.g., sushi, soft cheese, caffeine)',
      '- **Sleep positions, symptom comfort, kick counts, or questions for your OB-GYN**',
      '',
      '*Want full conversational AI answers?* Add a free-tier **Google Gemini** or **Groq** API key (or serverless `/api/chat` URL) in **Settings**.'
    ].join('\n');

    return {
      text: ensureDisclaimer(generalBody),
      isRedFlag: false,
      sourceLabel: 'Haven AI · Offline'
    };
  }

  async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, Object.assign({}, init, { signal: controller.signal }));
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function callGeminiApi(userMessage, systemPrompt, history, aiConfig) {
    const model = aiConfig.model || DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const recentTurns = (Array.isArray(history) ? history.slice(-8) : []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    recentTurns.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': aiConfig.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: recentTurns,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 650
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const parts =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts;
    const reply = Array.isArray(parts) ? parts.map((p) => p.text || '').join('').trim() : '';
    if (!reply) throw new Error('Empty Gemini response');
    return { text: ensureDisclaimer(reply), sourceLabel: `Gemini (${model})` };
  }

  async function callGroqApi(userMessage, systemPrompt, history, aiConfig) {
    const model = aiConfig.model || DEFAULT_GROQ_MODEL;
    const messages = [{ role: 'system', content: systemPrompt }];

    (Array.isArray(history) ? history.slice(-8) : []).forEach((msg) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });
    messages.push({ role: 'user', content: userMessage });

    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 650
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : '';
    if (!reply) throw new Error('Empty Groq response');
    return { text: ensureDisclaimer(reply), sourceLabel: `Groq (${model})` };
  }

  async function callServerlessEndpoint(userMessage, systemPrompt, contextData, history, aiConfig) {
    const endpoint = aiConfig.endpoint || '/api/chat';
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        systemPrompt,
        contextData,
        history: Array.isArray(history) ? history.slice(-8) : []
      })
    });

    if (!response.ok) {
      throw new Error(`Endpoint HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = (data && (data.reply || data.text || data.message || '')).trim();
    if (!reply) throw new Error('Empty endpoint response');
    return { text: ensureDisclaimer(reply), sourceLabel: 'Haven AI Cloud' };
  }

  /**
   * Main AI query entry point: supports Gemini, Groq, serverless /api/chat,
   * and graceful offline clinical FAQ fallback.
   */
  async function fetchAIResponse(userMessage, contextData, options = {}) {
    const aiConfig = options.aiConfig || {};
    const history = options.history || [];
    const provider = aiConfig.provider || 'offline';
    const redFlag = detectRedFlags(userMessage);
    const systemPrompt = buildSystemPrompt(contextData);

    const hasApiKey = Boolean(aiConfig.apiKey && aiConfig.apiKey.trim());
    const shouldUseOffline =
      provider === 'offline' ||
      ((provider === 'gemini' || provider === 'groq') && !hasApiKey);

    if (shouldUseOffline) {
      return generateOfflineDoulaResponse(userMessage, contextData, options);
    }

    try {
      let apiResult;
      if (provider === 'gemini') {
        apiResult = await callGeminiApi(userMessage, systemPrompt, history, aiConfig);
      } else if (provider === 'groq') {
        apiResult = await callGroqApi(userMessage, systemPrompt, history, aiConfig);
      } else {
        apiResult = await callServerlessEndpoint(userMessage, systemPrompt, contextData, history, aiConfig);
      }

      return {
        text: apiResult.text,
        isRedFlag: redFlag.isRedFlag,
        sourceLabel: apiResult.sourceLabel
      };
    } catch (_) {
      const fallback = generateOfflineDoulaResponse(userMessage, contextData, options);
      return {
        text: fallback.text,
        isRedFlag: fallback.isRedFlag || redFlag.isRedFlag,
        sourceLabel: fallback.isRedFlag ? fallback.sourceLabel : 'Haven AI · Offline'
      };
    }
  }

  return {
    DISCLAIMER,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_GROQ_MODEL,
    detectRedFlags,
    getRecentSymptoms14Days,
    buildContextData,
    buildSystemPrompt,
    buildDoctorQuestionsPrompt,
    ensureDisclaimer,
    generateOfflineDoulaResponse,
    fetchAIResponse
  };
});
