(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.BellyHavenBirthPlan = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STORAGE_KEY = 'bellyhaven_birth_plan';

  const BIRTH_PLAN_CATEGORIES = [
    {
      id: 'atmosphere',
      title: 'Labor Atmosphere',
      subtitle: 'Sensory & movement environment',
      options: [
        { id: 'dim-lighting', label: 'Dim / Soft Lighting' },
        { id: 'quiet-minimal', label: 'Quiet / Minimal Talking' },
        { id: 'calming-music', label: 'Calming Music / Sound Machine' },
        { id: 'freedom-move', label: 'Freedom to Walk & Move' }
      ]
    },
    {
      id: 'pain',
      title: 'Pain Management',
      subtitle: 'Comfort & anesthesia preferences',
      options: [
        { id: 'unmedicated-hypno', label: 'Unmedicated / Hypnobirthing' },
        { id: 'nitrous-oxide', label: 'Nitrous Oxide (Gas)' },
        { id: 'epidural-request', label: 'Epidural Available on Request' },
        { id: 'water-immersion', label: 'Water Immersion / Tub' }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery Room Preferences',
      subtitle: 'Birth & first-hour bonding',
      options: [
        { id: 'delayed-cord', label: 'Delayed Cord Clamping (1–3 min)' },
        { id: 'skin-to-skin', label: 'Immediate Skin-to-Skin' },
        { id: 'golden-hour', label: 'Golden Hour (No Interruptions)' },
        { id: 'partner-cord', label: 'Partner Cuts Cord' }
      ]
    },
    {
      id: 'newborn',
      title: 'Newborn Interventions',
      subtitle: 'Early feeding & newborn care',
      options: [
        { id: 'exclusive-breastfeeding', label: 'Exclusive Breastfeeding' },
        { id: 'formula-friendly', label: 'Formula Friendly' },
        { id: 'delay-first-bath', label: 'Delay First Bath (24 hrs)' },
        { id: 'standard-prophylaxis', label: 'Standard Prophylaxis (Vitamin K / Hep B)' }
      ]
    }
  ];

  const VALID_PREF_IDS = new Set();
  BIRTH_PLAN_CATEGORIES.forEach((cat) => {
    cat.options.forEach((opt) => VALID_PREF_IDS.add(opt.id));
  });

  function safeGet(key) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (_) {
      // Ignore storage quota or private-mode restrictions
    }
  }

  function safeRemove(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (_) {
      // Ignore storage restrictions
    }
  }

  function createDefaultBirthPlan() {
    return {
      selected: [],
      specialNotes: '',
      updatedAtMs: 0
    };
  }

  function sanitizeBirthPlan(raw) {
    const base = createDefaultBirthPlan();
    if (!raw || typeof raw !== 'object') return base;

    const seen = new Set();
    const rawSelected = Array.isArray(raw.selected) ? raw.selected : [];
    rawSelected.forEach((id) => {
      if (typeof id === 'string' && VALID_PREF_IDS.has(id) && !seen.has(id)) {
        seen.add(id);
        base.selected.push(id);
      }
    });

    if (typeof raw.specialNotes === 'string') {
      base.specialNotes = raw.specialNotes.slice(0, 2000);
    }
    if (Number.isFinite(raw.updatedAtMs) && raw.updatedAtMs > 0) {
      base.updatedAtMs = raw.updatedAtMs;
    }
    return base;
  }

  function loadBirthPlan() {
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return createDefaultBirthPlan();
    try {
      return sanitizeBirthPlan(JSON.parse(raw));
    } catch (_) {
      return createDefaultBirthPlan();
    }
  }

  function saveBirthPlan(plan) {
    const clean = sanitizeBirthPlan(plan);
    clean.updatedAtMs = Date.now();
    safeSet(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function clearBirthPlanStorage() {
    safeRemove(STORAGE_KEY);
    return createDefaultBirthPlan();
  }

  function togglePreference(plan, prefId) {
    const current = sanitizeBirthPlan(plan);
    if (!VALID_PREF_IDS.has(prefId)) return current;
    const exists = current.selected.includes(prefId);
    const nextSelected = exists
      ? current.selected.filter((id) => id !== prefId)
      : [...current.selected, prefId];
    return {
      ...current,
      selected: nextSelected
    };
  }

  function countSelectedPreferences(plan) {
    return sanitizeBirthPlan(plan).selected.length;
  }

  function getGroupedSelections(plan) {
    const clean = sanitizeBirthPlan(plan);
    const selectedSet = new Set(clean.selected);
    return BIRTH_PLAN_CATEGORIES.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
      selectedOptions: category.options.filter((opt) => selectedSet.has(opt.id)),
      allOptions: category.options
    }));
  }

  function createDomNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function buildBirthPlanPrintFragment(options = {}) {
    const plan = sanitizeBirthPlan(options.birthPlan || loadBirthPlan());
    const stats = options.stats || null;
    const contacts = options.careContacts || {};
    const fallbackEmergencyPhone = options.emergencyPhone || '';
    const docObj = typeof document !== 'undefined' ? document : null;
    if (!docObj) return null;

    const frag = docObj.createDocumentFragment();
    const sheet = createDomNode('div', 'birth-plan-print');
    const generatedDate = new Date().toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Clinical Header
    const header = createDomNode('div', 'report-header bp-print-header');
    const titleWrap = createDomNode('div');
    titleWrap.appendChild(createDomNode('h1', 'report-title bp-print-title', 'BellyHaven Maternal Birth Preferences'));
    const stageText = stats && stats.valid
      ? `Current Stage: ${stats.stageLabel} · ${stats.trimester ? stats.trimester.label : ''}`
      : 'Prepared for Labor & Delivery Team';
    titleWrap.appendChild(createDomNode('p', 'report-subtitle', stageText));
    header.appendChild(titleWrap);
    header.appendChild(createDomNode('p', 'report-subtitle', `Prepared: ${generatedDate}`));
    sheet.appendChild(header);

    // Patient & Clinical Contacts Strip (4 compact metadata boxes)
    const metaGrid = createDomNode('div', 'bp-print-meta-grid');
    const addMeta = (label, value) => {
      const box = createDomNode('div', 'report-meta-box');
      box.appendChild(createDomNode('span', 'report-meta-label', label));
      box.appendChild(createDomNode('strong', 'report-meta-val', value));
      metaGrid.appendChild(box);
    };

    const dueDateLabel = stats && stats.valid ? stats.eddFormatted : 'Not set';
    const hospitalLabel = contacts.clinicName || 'To be confirmed';
    const doctorLabel = [contacts.doctorName, contacts.doctorPhone || fallbackEmergencyPhone]
      .filter(Boolean)
      .join(' · ') || 'Not listed';
    const emergencyLabel = [contacts.partnerName, contacts.partnerPhone]
      .filter(Boolean)
      .join(' · ') || 'Not listed';

    addMeta('Estimated Due Date', dueDateLabel);
    addMeta('Chosen Hospital / Clinic', hospitalLabel);
    addMeta('OB-GYN / Midwife', doctorLabel);
    addMeta('Emergency / Partner Contact', emergencyLabel);
    sheet.appendChild(metaGrid);

    // Grouped Preference Categories
    const catGrid = createDomNode('div', 'bp-print-categories');
    const grouped = getGroupedSelections(plan);

    grouped.forEach((group) => {
      const block = createDomNode('div', 'bp-print-cat-card');
      block.appendChild(createDomNode('h2', 'bp-print-cat-title', group.title));
      const list = createDomNode('ul', 'bp-print-list');

      if (group.selectedOptions.length > 0) {
        group.selectedOptions.forEach((opt) => {
          list.appendChild(createDomNode('li', 'bp-print-item-selected', opt.label));
        });
      } else {
        list.appendChild(
          createDomNode(
            'li',
            'bp-print-item-empty',
            'Open to care team recommendations / discuss upon admission.'
          )
        );
      }

      block.appendChild(list);
      catGrid.appendChild(block);
    });
    sheet.appendChild(catGrid);

    // Special Notes / Medical Instructions Section
    const notesSec = createDomNode('div', 'bp-print-notes-box');
    notesSec.appendChild(createDomNode('h2', 'bp-print-cat-title', 'Special Notes / Medical Instructions for Labor Team'));
    const rawNotes = (plan.specialNotes || '').trim();
    const notesList = createDomNode('ul', 'bp-print-notes-list');
    if (rawNotes) {
      rawNotes
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
        .filter(Boolean)
        .forEach((line) => {
          notesList.appendChild(createDomNode('li', null, line));
        });
    } else {
      notesList.appendChild(
        createDomNode('li', 'bp-print-item-empty', 'No additional special medical instructions entered.')
      );
    }
    notesSec.appendChild(notesList);
    sheet.appendChild(notesSec);

    // Clinical Disclaimer & Attending Staff Signature Line
    const signOff = createDomNode('div', 'bp-print-footer-wrap');
    signOff.appendChild(
      createDomNode(
        'p',
        'report-footer bp-print-disclaimer',
        'Informational Birth Preferences Document: We understand that labor is dynamic and appreciate our care team adapting these preferences whenever needed to protect maternal and newborn safety.'
      )
    );

    const sigRow = createDomNode('div', 'bp-print-signature-row');
    const staffSig = createDomNode('div', 'bp-print-sig-col');
    staffSig.appendChild(createDomNode('div', 'bp-print-sig-line', ''));
    staffSig.appendChild(createDomNode('span', 'bp-print-sig-label', 'Attending Labor & Delivery Staff / Clinician Review Signature'));

    const dateSig = createDomNode('div', 'bp-print-sig-col bp-print-sig-date');
    dateSig.appendChild(createDomNode('div', 'bp-print-sig-line', ''));
    dateSig.appendChild(createDomNode('span', 'bp-print-sig-label', 'Admission Date & Time'));

    sigRow.appendChild(staffSig);
    sigRow.appendChild(dateSig);
    signOff.appendChild(sigRow);

    sheet.appendChild(signOff);
    frag.appendChild(sheet);
    return frag;
  }

  return {
    STORAGE_KEY,
    BIRTH_PLAN_CATEGORIES,
    createDefaultBirthPlan,
    sanitizeBirthPlan,
    loadBirthPlan,
    saveBirthPlan,
    clearBirthPlanStorage,
    togglePreference,
    countSelectedPreferences,
    getGroupedSelections,
    buildBirthPlanPrintFragment
  };
});
