(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyHavenCarePlan = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CARE_CONTACTS_KEY = 'bellyhaven_care_contacts';
  const HOSPITAL_BAG_KEY = 'bellyhaven_hospital_bag';

  const BAG_CATEGORIES = [
    { id: 'documents', label: 'Documents' },
    { id: 'mom', label: 'For Mom' },
    { id: 'baby', label: 'For Baby' },
    { id: 'partner', label: 'For Partner' }
  ];

  const DEFAULT_HOSPITAL_BAG_ITEMS = [
    // Documents
    { id: 'doc-id-insurance', category: 'documents', label: 'ID / Insurance cards', checked: false, isCustom: false },
    { id: 'doc-prenatal-records', category: 'documents', label: 'Prenatal records', checked: false, isCustom: false },
    { id: 'doc-birth-plan', category: 'documents', label: 'Birth plan copies', checked: false, isCustom: false },
    { id: 'doc-registration', category: 'documents', label: 'Hospital registration papers', checked: false, isCustom: false },

    // For Mom
    { id: 'mom-robe-slippers', category: 'mom', label: 'Comfortable robe / slippers', checked: false, isCustom: false },
    { id: 'mom-nursing-clothes', category: 'mom', label: 'Loose nursing clothes', checked: false, isCustom: false },
    { id: 'mom-maternity-pads', category: 'mom', label: 'Maternity pads', checked: false, isCustom: false },
    { id: 'mom-lip-balm', category: 'mom', label: 'Lip balm', checked: false, isCustom: false },
    { id: 'mom-charging-cable', category: 'mom', label: 'Long charging cable', checked: false, isCustom: false },
    { id: 'mom-toiletry-kit', category: 'mom', label: 'Toiletry kit', checked: false, isCustom: false },

    // For Baby
    { id: 'baby-going-home', category: 'baby', label: 'Going-home outfit', checked: false, isCustom: false },
    { id: 'baby-swaddles', category: 'baby', label: 'Swaddles / blankets', checked: false, isCustom: false },
    { id: 'baby-diapers', category: 'baby', label: 'Newborn diapers', checked: false, isCustom: false },
    { id: 'baby-wipes', category: 'baby', label: 'Wipes', checked: false, isCustom: false },
    { id: 'baby-car-seat', category: 'baby', label: 'Installed infant car seat', checked: false, isCustom: false },

    // For Partner
    { id: 'partner-snacks', category: 'partner', label: 'Snacks', checked: false, isCustom: false },
    { id: 'partner-water', category: 'partner', label: 'Refillable water bottle', checked: false, isCustom: false },
    { id: 'partner-charger', category: 'partner', label: 'Phone charger', checked: false, isCustom: false },
    { id: 'partner-clothes', category: 'partner', label: 'Change of clothes', checked: false, isCustom: false }
  ];

  const RED_FLAG_GUIDELINES = [
    {
      id: 'rf-pain',
      badge: 'Urgent',
      tone: 'rose',
      text: 'Severe or persistent abdominal/pelvic pain or cramping.'
    },
    {
      id: 'rf-bleeding',
      badge: 'Immediate',
      tone: 'rose',
      text: 'Heavy vaginal bleeding or fluid leakage (potential water break).'
    },
    {
      id: 'rf-movements',
      badge: 'Call Promptly',
      tone: 'amber',
      text: 'Significantly decreased or absent baby movements (fetal movement slowdown).'
    },
    {
      id: 'rf-preeclampsia',
      badge: 'Urgent',
      tone: 'rose',
      text: 'Sudden swelling of face/hands, severe persistent headaches, or visual disturbances (spots, flashing lights).'
    },
    {
      id: 'rf-fever',
      badge: 'Monitor Closely',
      tone: 'amber',
      text: 'Fever over 100.4°F (38°C) or severe persistent vomiting/inability to keep liquids down.'
    }
  ];

  const GUIDE_DISCLAIMER =
    'This list is informational only and does not replace medical diagnosis. If you feel uneasy, trust your instincts and contact your provider immediately.';

  function getDefaultStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function safeGet(storage, key) {
    try {
      return storage ? storage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeSet(storage, key, val) {
    try {
      if (!storage) return false;
      storage.setItem(key, val);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeRemove(storage, key) {
    try {
      if (!storage) return;
      storage.removeItem(key);
    } catch (_) {
      // Ignore restricted storage environments
    }
  }

  function createDefaultContacts() {
    return {
      doctorName: '',
      clinicName: '',
      doctorPhone: '',
      partnerName: '',
      partnerPhone: ''
    };
  }

  function sanitizeContacts(raw) {
    const base = createDefaultContacts();
    if (!raw || typeof raw !== 'object') return base;
    return {
      doctorName: typeof raw.doctorName === 'string' ? raw.doctorName.trim().slice(0, 100) : '',
      clinicName: typeof raw.clinicName === 'string' ? raw.clinicName.trim().slice(0, 120) : '',
      doctorPhone: typeof raw.doctorPhone === 'string' ? raw.doctorPhone.trim().slice(0, 30) : '',
      partnerName: typeof raw.partnerName === 'string' ? raw.partnerName.trim().slice(0, 100) : '',
      partnerPhone: typeof raw.partnerPhone === 'string' ? raw.partnerPhone.trim().slice(0, 30) : ''
    };
  }

  function sanitizePhoneForDial(phone) {
    const cleaned = String(phone || '').replace(/[^+\d*#]/g, '');
    return /\d/.test(cleaned) ? cleaned : '';
  }

  function buildTelHref(phone) {
    const dialable = sanitizePhoneForDial(phone);
    return dialable ? `tel:${dialable}` : '';
  }

  function loadCareContacts(storage = getDefaultStorage()) {
    const raw = safeGet(storage, CARE_CONTACTS_KEY);
    if (!raw) return createDefaultContacts();
    try {
      return sanitizeContacts(JSON.parse(raw));
    } catch (_) {
      return createDefaultContacts();
    }
  }

  function saveCareContacts(contacts, storage = getDefaultStorage()) {
    const clean = sanitizeContacts(contacts);
    safeSet(storage, CARE_CONTACTS_KEY, JSON.stringify(clean));
    return clean;
  }

  function createDefaultHospitalBag() {
    return DEFAULT_HOSPITAL_BAG_ITEMS.map((item) => Object.assign({}, item));
  }

  function normalizeCategoryId(catId) {
    return BAG_CATEGORIES.some((c) => c.id === catId) ? catId : 'mom';
  }

  function sanitizeHospitalBag(rawList) {
    const defaults = createDefaultHospitalBag();
    if (!Array.isArray(rawList)) return defaults;

    const checkedById = new Map();
    const customItems = [];
    const defaultIds = new Set(defaults.map((item) => item.id));

    rawList.forEach((raw) => {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return;
      if (defaultIds.has(raw.id)) {
        checkedById.set(raw.id, Boolean(raw.checked));
      } else if (raw.isCustom && typeof raw.label === 'string' && raw.label.trim()) {
        customItems.push({
          id: raw.id.slice(0, 60),
          category: normalizeCategoryId(raw.category),
          label: raw.label.trim().slice(0, 80),
          checked: Boolean(raw.checked),
          isCustom: true
        });
      }
    });

    const mergedDefaults = defaults.map((item) =>
      Object.assign({}, item, {
        checked: checkedById.has(item.id) ? checkedById.get(item.id) : false
      })
    );

    return mergedDefaults.concat(customItems.slice(0, 60));
  }

  function loadHospitalBag(storage = getDefaultStorage()) {
    const raw = safeGet(storage, HOSPITAL_BAG_KEY);
    if (!raw) return createDefaultHospitalBag();
    try {
      return sanitizeHospitalBag(JSON.parse(raw));
    } catch (_) {
      return createDefaultHospitalBag();
    }
  }

  function saveHospitalBag(items, storage = getDefaultStorage()) {
    const clean = sanitizeHospitalBag(items);
    safeSet(storage, HOSPITAL_BAG_KEY, JSON.stringify(clean));
    return clean;
  }

  function toggleHospitalBagItem(items, itemId) {
    return sanitizeHospitalBag(items).map((item) =>
      item.id === itemId ? Object.assign({}, item, { checked: !item.checked }) : item
    );
  }

  function addCustomHospitalBagItem(items, rawLabel, categoryId) {
    const label = String(rawLabel || '').trim().slice(0, 80);
    if (!label) {
      return { items: sanitizeHospitalBag(items), added: false, error: 'Enter an item name first.' };
    }
    const cleanItems = sanitizeHospitalBag(items);
    const duplicate = cleanItems.some(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      return { items: cleanItems, added: false, error: 'That item is already in your checklist.' };
    }
    const newItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: normalizeCategoryId(categoryId),
      label,
      checked: false,
      isCustom: true
    };
    return { items: cleanItems.concat(newItem), added: true, item: newItem, error: '' };
  }

  function removeCustomHospitalBagItem(items, itemId) {
    return sanitizeHospitalBag(items).filter((item) => !(item.id === itemId && item.isCustom));
  }

  function getHospitalBagProgress(items) {
    const clean = sanitizeHospitalBag(items);
    const total = clean.length;
    const packed = clean.filter((item) => item.checked).length;
    const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
    return {
      packed,
      total,
      percent,
      label: `${packed} of ${total} packed`
    };
  }

  function clearCarePlanStorage(storage = getDefaultStorage()) {
    safeRemove(storage, CARE_CONTACTS_KEY);
    safeRemove(storage, HOSPITAL_BAG_KEY);
  }

  return {
    CARE_CONTACTS_KEY,
    HOSPITAL_BAG_KEY,
    BAG_CATEGORIES,
    DEFAULT_HOSPITAL_BAG_ITEMS,
    RED_FLAG_GUIDELINES,
    GUIDE_DISCLAIMER,
    createDefaultContacts,
    sanitizeContacts,
    sanitizePhoneForDial,
    buildTelHref,
    loadCareContacts,
    saveCareContacts,
    createDefaultHospitalBag,
    sanitizeHospitalBag,
    loadHospitalBag,
    saveHospitalBag,
    toggleHospitalBagItem,
    addCustomHospitalBagItem,
    removeCustomHospitalBagItem,
    getHospitalBagProgress,
    clearCarePlanStorage
  };
});
