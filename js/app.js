(function (calc, store, doula, carePlan, soundMod, babyNotesMod, weightMod, birthPlanMod, blossomMod) {
  'use strict';

  const RING_RADIUS = 56;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const KICK_TARGET = 10;
  const CELEBRATION_STORAGE_KEY = 'bellyhaven_celebrated_tier_v1';

  const triggerHaptic = (pattern = 15) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (_) {
        // Ignore haptic API restrictions
      }
    }
  };

  let state = store.loadState();
  let careContacts = carePlan ? carePlan.loadCareContacts() : {
    doctorName: '',
    clinicName: '',
    doctorPhone: '',
    partnerName: '',
    partnerPhone: ''
  };
  let hospitalBagItems = carePlan ? carePlan.loadHospitalBag() : [];
  let birthPlan = birthPlanMod
    ? birthPlanMod.loadBirthPlan()
    : { selected: [], specialNotes: '', updatedAtMs: 0 };
  const soundEngine = soundMod ? soundMod.createSoundEngine() : null;
  const speechReader = babyNotesMod ? babyNotesMod.createSpeechReader() : null;
  let confettiAnimationId = null;
  let activeNoteWeek = null;
  let gyroTiltController = null;
  let fiveOneOneRecheckTimerId = null;
  let selectedBlossomPlanId = 'onetime';
  let pendingBlossomAction = null;
  let freePreviewPrintGranted = false;
  let activeDateMode = state.profile.inputMode || 'lmp';
  let activeKickMode = 'session';
  let previewMilestoneWeek = null;
  let lastRenderedMilestoneWeek = null;
  const preloadedMilestoneUrls = new Set();
  let selectedMood = '';
  let selectedSymptoms = new Set();
  let selectedIntensity = '';
  let lastFiveOneOneClusterStartMs = null;
  let lastGeneratedDoctorQuestions = '';
  let isDoulaBusy = false;
  let deferredInstallPrompt = null;
  let timerIntervalId = null;
  let toastTimeoutId = null;
  let dateHighlightTimerId = null;

  const dom = {};

  function $(id) {
    return document.getElementById(id);
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
      dom.toast.hidden = true;
    }, 2800);
  }

  function cacheDom() {
    dom.headerStageBadge = $('header-stage-badge');
    dom.openSettingsBtn = $('open-settings-btn');

    // PWA Install Banner
    dom.installBanner = $('install-banner');
    dom.installAppBtn = $('install-app-btn');
    dom.dismissInstallBtn = $('dismiss-install-btn');

    dom.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    dom.tabPanels = {
      progress: $('tab-progress'),
      kicks: $('tab-kicks'),
      contractions: $('tab-contractions'),
      journal: $('tab-journal'),
      doula: $('tab-doula')
    };

    // Progress Dashboard, Milestones & Setup
    dom.progressGreetingBanner = $('progress-greeting-banner');
    dom.progressGreetingHeading = $('progress-greeting-heading');
    dom.progressDashboardCard = $('progress-dashboard-card');
    dom.trimesterBadge = $('trimester-badge');
    dom.heroStagePill = $('hero-stage-pill');
    dom.progressRingFill = $('progress-ring-fill');
    dom.heroWeekTitle = $('hero-week-title');
    dom.heroPercentLabel = $('hero-percent-label');
    dom.heroSummaryLine = $('hero-summary-line');
    dom.heroCountdownLine = $('hero-countdown-line');

    dom.milestoneCard = $('milestone-card');
    dom.milestoneIllustration = $('milestone-illustration');
    dom.milestoneImage = $('milestone-image');
    dom.milestoneName = $('milestone-name');
    dom.milestonePrevWeek = $('milestone-prev-week');
    dom.milestoneWeekLabel = $('milestone-week-label');
    dom.milestoneNextWeek = $('milestone-next-week');
    dom.milestoneResetWeek = $('milestone-reset-week');
    dom.milestoneLength = $('milestone-length');
    dom.milestoneWeight = $('milestone-weight');
    dom.milestoneTip = $('milestone-tip');

    // A Note from Baby
    dom.babyNoteCard = $('baby-note-card');
    dom.babyNoteWeekPill = $('baby-note-week-pill');
    dom.babyNoteListenBtn = $('baby-note-listen-btn');
    dom.babyNoteListenLabel = $('baby-note-listen-label');
    dom.babyNoteTitle = $('baby-note-title');
    dom.babyNoteMessage = $('baby-note-message');
    dom.babyNoteSignoff = $('baby-note-signoff');

    dom.progressResults = $('progress-results');
    dom.eddVal = $('edd-val');
    dom.weeksVal = $('weeks-val');
    dom.trimesterVal = $('trimester-val');
    dom.lmpVal = $('lmp-val');

    dom.dateSetupCard = $('date-setup-card');
    dom.setupUserName = $('setup-user-name');
    dom.dateModeButtons = Array.from(document.querySelectorAll('[data-date-mode]'));
    dom.dateSetupForm = $('date-setup-form');
    dom.dateInputLabel = $('date-input-label');
    dom.primaryDateInput = $('primary-date-input');
    dom.cycleLengthInput = $('cycleLength');
    dom.dateError = $('date-error');
    dom.clearDateBtn = $('clear-date-btn');

    // Kicks
    dom.kickModeButtons = Array.from(document.querySelectorAll('[data-kick-mode]'));
    dom.kickSessionView = $('kick-session-view');
    dom.kickQuickView = $('kick-quick-view');
    dom.kickSessionTimer = $('kick-session-timer');
    dom.kickSessionCount = $('kick-session-count');
    dom.kickProgressFill = $('kick-progress-fill');
    dom.kickSessionTapBtn = $('kick-session-tap-btn');
    dom.kickUndoBtn = $('kick-undo-btn');
    dom.kickFinishBtn = $('kick-finish-btn');
    dom.kickDiscardBtn = $('kick-discard-btn');
    dom.kickTapLog = $('kick-tap-log');
    dom.quickKickCount = $('quick-kick-count');
    dom.quickKickAdd = $('quick-kick-add');
    dom.quickKickReset = $('quick-kick-reset');
    dom.clearKickHistoryBtn = $('clear-kick-history-btn');
    dom.kickSessionsList = $('kick-sessions-list');

    // Contractions & 5-1-1 Banner
    dom.contraction511Banner = $('contraction-511-banner');
    dom.contraction511Metrics = $('contraction-511-metrics');
    dom.callDoctorBtn = $('call-doctor-btn');
    dom.dismiss511Btn = $('dismiss-511-btn');
    dom.emergencyPhoneInline = $('emergency-phone-inline');
    dom.inlineDoctorPhone = $('inline-doctor-phone');
    dom.saveInlinePhoneBtn = $('save-inline-phone-btn');
    dom.contraction511DismissedPill = $('contraction-511-dismissed-pill');
    dom.reshow511Btn = $('reshow-511-btn');
    dom.contractionAnalyzerBar = $('contraction-analyzer-bar');
    dom.contractionAnalyzerText = $('contraction-analyzer-text');

    dom.contractionStatus = $('contraction-status');
    dom.contractionTimer = $('contraction-timer');
    dom.contractionIntensityGroup = $('contraction-intensity-group');
    dom.contractionToggleBtn = $('contraction-toggle-btn');
    dom.contrLastHourCount = $('contr-last-hour-count');
    dom.contrAvgDuration = $('contr-avg-duration');
    dom.contrAvgInterval = $('contr-avg-interval');
    dom.clearContractionsBtn = $('clear-contractions-btn');
    dom.contractionsList = $('contractions-list');

    // Journal, Report & Appointments
    dom.journalForm = $('journal-form');
    dom.journalDate = $('journal-date');
    dom.journalWeight = $('journal-weight');
    dom.journalBp = $('journal-bp');
    dom.journalMoodGroup = $('journal-mood-group');
    dom.journalSymptomsGroup = $('journal-symptoms-group');
    dom.journalNote = $('journal-note');
    dom.journalEntriesList = $('journal-entries-list');

    // Maternal Weight Tracker
    dom.weightTrackerCard = $('weight-tracker-card');
    dom.weightUnitGroup = $('weight-unit-group');
    dom.preWeightLabel = $('pre-weight-label');
    dom.heightLabel = $('height-label');
    dom.prePregnancyWeight = $('pre-pregnancy-weight');
    dom.maternalHeight = $('maternal-height');
    dom.bmiResultPill = $('bmi-result-pill');
    dom.acogRangeSummary = $('acog-range-summary');
    dom.weightChartContainer = $('weight-chart-container');
    dom.weightTrajectoryNote = $('weight-trajectory-note');
    dom.generateDoctorQuestionsBtn = $('generate-doctor-questions-btn');
    dom.aiDoctorQuestionsCard = $('ai-doctor-questions-card');
    dom.doctorQuestionsSource = $('doctor-questions-source');
    dom.aiDoctorQuestionsBody = $('ai-doctor-questions-body');
    dom.copyDoctorQuestionsBtn = $('copy-doctor-questions-btn');
    dom.openQuestionsInDoulaBtn = $('open-questions-in-doula-btn');
    dom.exportReportBtn = $('export-report-btn');
    dom.doctorReport = $('doctor-report');
    dom.appointmentForm = $('appointment-form');
    dom.apptTitle = $('appt-title');
    dom.apptDate = $('appt-date');
    dom.apptTime = $('appt-time');
    dom.apptNotes = $('appt-notes');
    dom.appointmentsList = $('appointments-list');

    // AI Doula Companion
    dom.doulaModeBadge = $('doula-mode-badge');
    dom.doulaClearBtn = $('doula-clear-btn');
    dom.doulaContextStrip = $('doula-context-strip');
    dom.doulaMessages = $('doula-messages');
    dom.doulaLoading = $('doula-loading');
    dom.doulaQuickPrompts = $('doula-quick-prompts');
    dom.qpBabySize = $('qp-baby-size');
    dom.qpFoodSafety = $('qp-food-safety');
    dom.qpSleepPos = $('qp-sleep-pos');
    dom.qpObQuestions = $('qp-ob-questions');
    dom.doulaForm = $('doula-form');
    dom.doulaInput = $('doula-input');
    dom.doulaSendBtn = $('doula-send-btn');

    // Settings Modal
    dom.settingsModal = $('settings-modal');
    dom.closeSettingsBtn = $('close-settings-btn');
    dom.settingsUserName = $('settings-user-name');
    dom.saveUserNameBtn = $('save-user-name-btn');
    dom.settingsDoctorPhone = $('settings-doctor-phone');
    dom.saveDoctorPhoneBtn = $('save-doctor-phone-btn');
    dom.exportJsonBtn = $('export-json-btn');
    dom.importJsonInput = $('import-json-input');
    dom.exportCsvBtn = $('export-csv-btn');
    dom.resetAllBtn = $('reset-all-btn');
    dom.resetConfirmBox = $('reset-confirm-box');
    dom.confirmResetYes = $('confirm-reset-yes');
    dom.confirmResetNo = $('confirm-reset-no');

    dom.toast = $('toast');

    // Emergency & Care Plan
    dom.openCarePlanBtn = $('open-care-plan-btn');
    dom.dashboardBagPill = $('dashboard-bag-pill');
    dom.dashboardCareSummary = $('dashboard-care-summary');
    dom.dashboardOpenCarePlanBtn = $('dashboard-open-care-plan-btn');
    dom.dashboardCallDoctorLink = $('dashboard-call-doctor-link');
    dom.dashboardRedFlagsBtn = $('dashboard-red-flags-btn');

    dom.carePlanModal = $('care-plan-modal');
    dom.closeCarePlanBtn = $('close-care-plan-btn');
    dom.careJumpNav = $('care-jump-nav');
    dom.careJumpButtons = Array.from(document.querySelectorAll('[data-care-jump]'));
    dom.careSheetBody = $('care-sheet-body');

    dom.careContactsStatus = $('care-contacts-status');
    dom.careDoctorName = $('care-doctor-name');
    dom.careClinicName = $('care-clinic-name');
    dom.careDoctorPhone = $('care-doctor-phone');
    dom.carePartnerName = $('care-partner-name');
    dom.carePartnerPhone = $('care-partner-phone');
    dom.careCallDoctorLink = $('care-call-doctor-link');
    dom.careCallEmergencyLink = $('care-call-emergency-link');

    dom.hospitalBagProgressPill = $('hospital-bag-progress-pill');
    dom.hospitalBagProgressFill = $('hospital-bag-progress-fill');
    dom.hospitalBagCustomForm = $('hospital-bag-custom-form');
    dom.bagCustomItemInput = $('bag-custom-item-input');
    dom.bagCustomCategory = $('bag-custom-category');
    dom.hospitalBagGroups = $('hospital-bag-groups');

    dom.guideCallCareTeamLink = $('guide-call-care-team-link');
    dom.progressExportReportBtn = $('progress-export-report-btn');
    dom.careExportReportBtn = $('care-export-report-btn');

    // Luxury Edition: Sound Machine, Doctor Report Preview, Partner Share & Celebration
    dom.dashboardSoundStatus = $('dashboard-sound-status');
    dom.openSoundMachineBtn = $('open-sound-machine-btn');
    dom.timerOpenSoundBtn = $('timer-open-sound-btn');
    dom.openPartnerShareBtn = $('open-partner-share-btn');
    dom.soundActiveBar = $('sound-active-bar');
    dom.soundActiveLabel = $('sound-active-label');
    dom.soundBarOpenBtn = $('sound-bar-open-btn');
    dom.soundBarPauseBtn = $('sound-bar-pause-btn');

    dom.soundMachineModal = $('sound-machine-modal');
    dom.closeSoundModalBtn = $('close-sound-modal-btn');
    dom.soundModeGroup = $('sound-mode-group');
    dom.breathPacerStage = $('breath-pacer-stage');
    dom.breathPacerOrb = $('breath-pacer-orb');
    dom.breathCountdownNum = $('breath-countdown-num');
    dom.breathPhaseLabel = $('breath-phase-label');
    dom.soundPlayToggleBtn = $('sound-play-toggle-btn');
    dom.soundVolumeSlider = $('sound-volume-slider');
    dom.soundVolumeVal = $('sound-volume-val');
    dom.soundTimerGroup = $('sound-timer-group');
    dom.soundTimerDisplay = $('sound-timer-display');

    dom.reportPreviewModal = $('report-preview-modal');
    dom.closeReportPreviewBtn = $('close-report-preview-btn');
    dom.reportPreviewBody = $('report-preview-body');
    dom.printDoctorReportBtn = $('print-doctor-report-btn');
    dom.dismissReportPreviewBtn = $('dismiss-report-preview-btn');

    dom.partnerShareModal = $('partner-share-modal');
    dom.closePartnerShareBtn = $('close-partner-share-btn');
    dom.partnerUpdateText = $('partner-update-text');
    dom.partnerNativeShareBtn = $('partner-native-share-btn');
    dom.partnerWhatsappLink = $('partner-whatsapp-link');
    dom.partnerCopyBtn = $('partner-copy-btn');
    dom.partnerRefreshDraftBtn = $('partner-refresh-draft-btn');

    dom.celebrationModal = $('celebration-modal');
    dom.confettiCanvas = $('confetti-canvas');
    dom.celebrationBadge = $('celebration-badge');
    dom.celebrationTitle = $('celebration-title');
    dom.celebrationSubtitle = $('celebration-subtitle');
    dom.celebrationShareBtn = $('celebration-share-btn');
    dom.closeCelebrationBtn = $('close-celebration-btn');

    // Interactive Birth Plan Builder
    dom.dashboardBirthPlanPill = $('dashboard-birth-plan-pill');
    dom.dashboardBirthPlanSummary = $('dashboard-birth-plan-summary');
    dom.dashboardOpenBirthPlanBtn = $('dashboard-open-birth-plan-btn');
    dom.dashboardExportBirthPlanBtn = $('dashboard-export-birth-plan-btn');
    dom.careBirthPlanPill = $('care-birth-plan-pill');
    dom.careBirthPlanSummary = $('care-birth-plan-summary');
    dom.careOpenBirthPlanBtn = $('care-open-birth-plan-btn');
    dom.careExportBirthPlanBtn = $('care-export-birth-plan-btn');
    dom.birthPlanModal = $('birth-plan-modal');
    dom.closeBirthPlanBtn = $('close-birth-plan-btn');
    dom.birthPlanCountPill = $('birth-plan-count-pill');
    dom.birthPlanCategories = $('birth-plan-categories');
    dom.birthPlanNotes = $('birth-plan-notes');
    dom.birthPlanSaveStatus = $('birth-plan-save-status');
    dom.exportBirthPlanPdfBtn = $('export-birth-plan-pdf-btn');
    dom.resetBirthPlanBtn = $('reset-birth-plan-btn');

    // BellyHaven Blossom Paywall & Settings Status
    dom.settingsBlossomCard = $('settings-blossom-card');
    dom.settingsBlossomBadge = $('settings-blossom-badge');
    dom.settingsBlossomDesc = $('settings-blossom-desc');
    dom.settingsUpgradeBlossomBtn = $('settings-upgrade-blossom-btn');
    dom.blossomPaywallModal = $('blossom-paywall-modal');
    dom.closeBlossomBtn = $('close-blossom-btn');
    dom.blossomTriggerNote = $('blossom-trigger-note');
    dom.blossomPlanSelector = $('blossom-plan-selector');
    dom.blossomPlanMonthly = $('blossom-plan-monthly');
    dom.blossomPlanOnetime = $('blossom-plan-onetime');
    dom.blossomCheckoutSummary = $('blossom-checkout-summary');
    dom.paypalStatusNote = $('paypal-status-note');
    dom.paypalButtonContainer = $('paypal-button-container');
    dom.blossomMaybeLaterBtn = $('blossom-maybe-later-btn');
  }

  function persist() {
    store.saveState(state);
  }

  function getCurrentStats() {
    if (!state.profile.dateStr) return null;
    return calc.calculatePregnancyStats({
      mode: state.profile.inputMode,
      dateStr: state.profile.dateStr,
      cycleLength: state.profile.cycleLength
    });
  }

  /* ---------------- MILESTONE VISUALS & FALLBACKS ---------------- */

  function getMilestoneSvgDataUri(iconKey) {
    const shapes = {
      seed: '<circle cx="32" cy="34" r="7" fill="#b5838d"/><circle cx="30" cy="32" r="2" fill="#f7dcde"/><path d="M32 23c0-5 5-9 10-8-1 5-5 8-10 8z" fill="#7fa98f"/>',
      berry: '<circle cx="26" cy="34" r="7" fill="#d97282"/><circle cx="38" cy="34" r="7" fill="#e5989b"/><circle cx="32" cy="26" r="7" fill="#c95d6c"/><circle cx="32" cy="40" r="7" fill="#c95d6c"/><path d="M26 20c4 3 8 3 12 0-4-4-8-4-12 0z" fill="#7fa98f"/>',
      plum: '<ellipse cx="32" cy="34" rx="14" ry="16" fill="#9c6b86"/><ellipse cx="27" cy="29" rx="3" ry="6" fill="#be8fa8" opacity="0.6"/><path d="M32 18c2-4 7-6 10-4-2 4-6 5-10 4z" fill="#7fa98f"/>',
      citrus: '<circle cx="32" cy="34" r="16" fill="#f3c677"/><circle cx="32" cy="34" r="12" fill="#f9dc9c"/><path d="M32 18c3-4 8-4 10-1-3 3-7 3-10 1z" fill="#7fa98f"/>',
      apple: '<path d="M32 22c-8-4-17 3-15 15 2 10 8 15 15 13 7 2 13-3 15-13 2-12-7-19-15-15z" fill="#e07a7d"/><path d="M32 21c0-5 4-9 9-8-1 5-4 8-9 8z" fill="#7fa98f"/>',
      avocado: '<path d="M32 14c-8 0-15 13-15 24 0 8 7 14 15 14s15-6 15-14c0-11-7-24-15-24z" fill="#7fa98f"/><path d="M32 18c-6 0-11 10-11 20 0 6 5 10 11 10s11-4 11-10c0-10-5-20-11-20z" fill="#dce8b6"/><circle cx="32" cy="39" r="6.5" fill="#9d6b53"/>',
      banana: '<path d="M18 40c8 10 26 8 31-10 1-4-2-7-4-4-4 12-16 14-24 8-3-2-5 3-3 6z" fill="#f2cf66"/><path d="M46 21l3-4" stroke="#8a6d3b" stroke-width="3" stroke-linecap="round"/>',
      corn: '<ellipse cx="32" cy="33" rx="9" ry="18" fill="#f3cf63"/><path d="M23 30c-5 6-4 16 4 21-1-8 1-14 5-20-3-2-6-2-9-1z" fill="#7fa98f"/><path d="M41 30c5 6 4 16-4 21 1-8-1-14-5-20 3-2 6-2 9-1z" fill="#6b967b"/><line x1="27" y1="24" x2="37" y2="24" stroke="#d9aa38" stroke-width="1.5"/><line x1="26" y1="30" x2="38" y2="30" stroke="#d9aa38" stroke-width="1.5"/><line x1="27" y1="36" x2="37" y2="36" stroke="#d9aa38" stroke-width="1.5"/>',
      squash: '<path d="M32 18c-6 0-9 5-8 12-4 3-7 8-6 14 1 6 7 9 14 9s13-3 14-9c1-6-2-11-6-14 1-7-2-12-8-12z" fill="#e6a66b"/><path d="M32 18v-5" stroke="#7c8c62" stroke-width="3" stroke-linecap="round"/>',
      melon: '<circle cx="32" cy="33" r="17" fill="#c9dcac"/><path d="M22 20c5 9 5 18 0 26M32 16v34M42 20c-5 9-5 18 0 26" fill="none" stroke="#9db87b" stroke-width="2"/>',
      eggplant: '<path d="M34 18c-6 0-9 8-12 16-3 7 1 16 10 17 9 1 14-6 12-16-2-9-4-17-10-17z" fill="#7b5882"/><path d="M27 20c3-4 11-4 13 1-4 2-9 2-13-1z" fill="#7fa98f"/><path d="M33 17v-5" stroke="#6b967b" stroke-width="3" stroke-linecap="round"/>',
      pineapple: '<path d="M24 22l4-10 4 7 4-7 4 10z" fill="#6b967b"/><ellipse cx="32" cy="37" rx="13" ry="15" fill="#e8ba55"/><path d="M23 31l18 12M23 43l18-12" stroke="#c99332" stroke-width="1.6"/>',
      papaya: '<ellipse cx="32" cy="34" rx="13" ry="17" fill="#f09c67"/><ellipse cx="32" cy="34" rx="8" ry="12" fill="#f7c496"/><circle cx="32" cy="31" r="1.7" fill="#4a4e69"/><circle cx="30" cy="35" r="1.7" fill="#4a4e69"/><circle cx="34" cy="36" r="1.7" fill="#4a4e69"/><circle cx="32" cy="39" r="1.7" fill="#4a4e69"/>',
      watermelon: '<circle cx="32" cy="33" r="18" fill="#6d9c7a"/><path d="M16 33a16 16 0 0 0 32 0z" fill="#e57a84"/><circle cx="27" cy="38" r="1.4" fill="#4a4e69"/><circle cx="32" cy="40" r="1.4" fill="#4a4e69"/><circle cx="37" cy="38" r="1.4" fill="#4a4e69"/>'
    };

    const inner = shapes[iconKey] || shapes.berry;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${inner}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function preloadMilestoneImage(week) {
    if (week < 4 || week > 42) return;
    const url = calc.getMilestone(week).imageUrl;
    if (!url || preloadedMilestoneUrls.has(url)) return;
    preloadedMilestoneUrls.add(url);
    const img = new Image();
    img.src = url;
  }

  /* ---------------- TAB NAVIGATION ---------------- */

  function switchTab(tabKey) {
    if (!dom.tabPanels[tabKey]) return;

    if (tabKey !== 'progress' && speechReader && speechReader.isSpeaking()) {
      speechReader.stop();
      setBabyNoteListenState(false);
    }

    dom.navButtons.forEach((btn) => {
      const isSelected = btn.dataset.tab === tabKey;
      btn.classList.toggle('is-active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    Object.entries(dom.tabPanels).forEach(([key, panel]) => {
      panel.hidden = key !== tabKey;
    });
  }

  /* ---------------- PROGRESS & MILESTONES ---------------- */

  function updateDateModeUI(mode) {
    activeDateMode = mode === 'edd' ? 'edd' : 'lmp';

    dom.dateModeButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.dateMode === activeDateMode);
    });

    const today = new Date();
    if (activeDateMode === 'edd') {
      dom.dateInputLabel.textContent = 'Estimated Due Date (EDD)';
      dom.primaryDateInput.min = calc.formatLocalDateISO(calc.addCalendarDays(today, -28));
      dom.primaryDateInput.max = calc.formatLocalDateISO(calc.addCalendarDays(today, 290));
    } else {
      dom.dateInputLabel.textContent = 'Last Menstrual Period (LMP)';
      dom.primaryDateInput.min = calc.formatLocalDateISO(calc.addCalendarDays(today, -calc.MAX_VALID_GESTATION_DAYS));
      dom.primaryDateInput.max = calc.formatLocalDateISO(today);
    }

    const stats = getCurrentStats();
    if (stats && stats.valid) {
      dom.primaryDateInput.value = activeDateMode === 'edd' ? stats.eddIso : stats.lmpIso;
    }
    dom.dateError.hidden = true;
  }

  function formatCountdown(stats) {
    if (stats.isDueToday) return 'Due today!';
    if (stats.isPastDue) {
      const over = Math.abs(stats.daysRemaining);
      return `${over} day${over === 1 ? '' : 's'} past EDD`;
    }
    return `${stats.daysRemaining} day${stats.daysRemaining === 1 ? '' : 's'} remaining`;
  }

  function renderMilestoneCard(currentWeek) {
    const clampedCurrent = Math.max(0, Math.min(42, currentWeek));
    const shownWeek = previewMilestoneWeek !== null ? previewMilestoneWeek : clampedCurrent;
    const milestone = calc.getMilestone(shownWeek);
    const hasWeekChanged =
      lastRenderedMilestoneWeek !== null && lastRenderedMilestoneWeek !== shownWeek;

    if (hasWeekChanged && dom.milestoneCard) {
      const directionShift = shownWeek > lastRenderedMilestoneWeek ? '8px' : '-8px';
      dom.milestoneCard.style.setProperty('--milestone-shift', directionShift);
      dom.milestoneCard.classList.remove('is-transitioning');
      void dom.milestoneCard.offsetWidth;
      dom.milestoneCard.classList.add('is-transitioning');
    }

    dom.milestoneWeekLabel.textContent = `Week ${shownWeek}`;
    dom.milestoneName.textContent = milestone.name;
    dom.milestoneLength.textContent = milestone.length;
    dom.milestoneWeight.textContent = milestone.weight;
    dom.milestoneTip.textContent = milestone.tip;

    if (dom.milestoneImage) {
      const nextSrc = milestone.imageUrl || getMilestoneSvgDataUri(milestone.icon);
      dom.milestoneImage.dataset.fallbackIcon = milestone.icon || 'berry';
      delete dom.milestoneImage.dataset.fallbackApplied;
      if (dom.milestoneImage.getAttribute('src') !== nextSrc) {
        dom.milestoneImage.src = nextSrc;
      }
      dom.milestoneImage.alt = `Week ${shownWeek}: ${milestone.name} baby size illustration`;
    }

    lastRenderedMilestoneWeek = shownWeek;
    preloadMilestoneImage(shownWeek - 1);
    preloadMilestoneImage(shownWeek + 1);

    dom.milestonePrevWeek.disabled = shownWeek <= 4;
    dom.milestoneNextWeek.disabled = shownWeek >= 42;
    dom.milestoneResetWeek.hidden =
      previewMilestoneWeek === null || previewMilestoneWeek === clampedCurrent;

    renderBabyNoteCard(shownWeek);
  }

  function getCycleInputOrDefault() {
    const parsed = parseInt(dom.cycleLengthInput.value, 10);
    return (!isNaN(parsed) && parsed >= 20 && parsed <= 45) ? parsed : 28;
  }

  function getSavedUserName() {
    if (store && typeof store.loadUserName === 'function') {
      return store.loadUserName();
    }
    try {
      return String(localStorage.getItem('bellyhaven_user_name') || '').trim().slice(0, 40);
    } catch (_) {
      return '';
    }
  }

  function saveUserNamePreference(rawName) {
    if (store && typeof store.saveUserName === 'function') {
      return store.saveUserName(rawName);
    }
    const clean = String(rawName || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    try {
      if (clean) {
        localStorage.setItem('bellyhaven_user_name', clean);
      } else {
        localStorage.removeItem('bellyhaven_user_name');
      }
    } catch (_) {}
    return clean;
  }

  function getTimeBasedGreeting(name, now = new Date()) {
    const clean = (store && typeof store.sanitizeUserName === 'function')
      ? store.sanitizeUserName(name)
      : String(name || '').trim().slice(0, 40);
    if (!clean) {
      return 'Hello, Mama 💕';
    }
    const hour = (now instanceof Date ? now : new Date()).getHours();
    if (hour >= 5 && hour < 12) {
      return `Good morning, ${clean} 🌸`;
    }
    if (hour >= 12 && hour < 17) {
      return `Good afternoon, ${clean} ✨`;
    }
    return `Good evening, ${clean} 💕`;
  }

  function syncUserNameInputs(name = getSavedUserName()) {
    if (dom.setupUserName && dom.setupUserName.value !== name) {
      dom.setupUserName.value = name;
    }
    if (dom.settingsUserName && dom.settingsUserName.value !== name) {
      dom.settingsUserName.value = name;
    }
  }

  function renderGreetingBanner() {
    if (!dom.progressGreetingHeading) return;
    const name = getSavedUserName();
    dom.progressGreetingHeading.textContent = getTimeBasedGreeting(name);
  }

  function renderProgress() {
    const normalizedCycle = calc.normalizeCycleLength(state.profile.cycleLength || 28);
    state.profile.cycleLength = normalizedCycle;
    dom.cycleLengthInput.value = normalizedCycle;
    renderGreetingBanner();
    syncUserNameInputs();
    const stats = getCurrentStats();

    if (!stats || !stats.valid) {
      dom.progressDashboardCard.hidden = true;
      dom.milestoneCard.hidden = true;
      if (dom.babyNoteCard) dom.babyNoteCard.hidden = true;
      if (speechReader && speechReader.isSpeaking()) {
        speechReader.stop();
        setBabyNoteListenState(false);
      }
      dom.progressResults.hidden = true;
      lastRenderedMilestoneWeek = null;
      dom.headerStageBadge.textContent = 'Set date';
      if (state.profile.dateStr) {
        dom.primaryDateInput.value = state.profile.dateStr;
      }
      renderWeightTracker();
      return;
    }

    dom.primaryDateInput.value = activeDateMode === 'edd' ? stats.eddIso : stats.lmpIso;
    dom.headerStageBadge.textContent = stats.stageLabel;

    // Dashboard Hero Card (displayed above details)
    dom.trimesterBadge.textContent = stats.trimester.label;
    dom.heroStagePill.textContent = stats.stageLabel;
    dom.heroWeekTitle.textContent = `Week ${stats.weeks}`;
    dom.heroPercentLabel.textContent = `${stats.progressPercent}% of 40w`;
    dom.heroSummaryLine.textContent = `Week ${stats.weeks} (${stats.progressPercent}%)`;
    dom.heroCountdownLine.textContent = formatCountdown(stats);

    const offset = RING_CIRCUMFERENCE * (1 - stats.progressPercentExact / 100);
    dom.progressRingFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    dom.progressRingFill.style.strokeDashoffset = String(offset);

    // Gestational Details Card
    dom.eddVal.textContent = stats.eddFormatted;
    dom.weeksVal.textContent = stats.stageLabel;
    dom.trimesterVal.textContent = stats.trimester.label;
    dom.lmpVal.textContent = calc.formatReadableDate(stats.lmp);

    dom.progressDashboardCard.hidden = false;
    dom.milestoneCard.hidden = false;
    if (dom.babyNoteCard) dom.babyNoteCard.hidden = false;
    dom.progressResults.hidden = false;
    renderMilestoneCard(stats.weeks);
    renderWeightTracker();
  }

  function handleDateSubmit(event) {
    event.preventDefault();
    const dateStr = dom.primaryDateInput.value;
    const cycleLength = getCycleInputOrDefault();
    dom.cycleLengthInput.value = cycleLength;

    const stats = calc.calculatePregnancyStats({
      mode: activeDateMode,
      dateStr,
      cycleLength
    });

    if (!stats.valid) {
      dom.dateError.textContent = stats.error;
      dom.dateError.hidden = false;
      return;
    }

    dom.dateError.hidden = true;
    state.profile.inputMode = activeDateMode;
    state.profile.dateStr = dateStr;
    state.profile.cycleLength = cycleLength;
    if (dom.setupUserName) {
      saveUserNamePreference(dom.setupUserName.value);
      syncUserNameInputs();
    }
    previewMilestoneWeek = null;
    lastRenderedMilestoneWeek = null;
    persist();
    renderProgress();
    renderDoulaContextAndPrompts();
    showToast('Progress updated');
    checkMilestoneCelebration(stats);
  }

  function handleClearDate() {
    state.profile.dateStr = '';
    state.profile.cycleLength = 28;
    saveUserNamePreference('');
    syncUserNameInputs('');
    dom.primaryDateInput.value = '';
    dom.cycleLengthInput.value = 28;
    dom.dateError.hidden = true;
    previewMilestoneWeek = null;
    lastRenderedMilestoneWeek = null;
    persist();
    renderProgress();
    renderDoulaContextAndPrompts();
    showToast('Date cleared');
  }

  /* ---------------- KICK COUNTER ---------------- */

  function switchKickMode(mode) {
    activeKickMode = mode === 'quick' ? 'quick' : 'session';
    dom.kickModeButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.kickMode === activeKickMode);
    });
    dom.kickSessionView.hidden = activeKickMode !== 'session';
    dom.kickQuickView.hidden = activeKickMode !== 'quick';
  }

  function renderKickSession() {
    const active = state.kicks.activeSession;
    const count = active ? active.tapTimestampsMs.length : 0;
    const elapsedSec = active ? Math.max(0, Math.floor((Date.now() - active.startedAtMs) / 1000)) : 0;

    dom.kickSessionTimer.textContent = calc.formatDurationSeconds(elapsedSec);
    dom.kickSessionCount.textContent = `${count} / ${KICK_TARGET}`;
    dom.kickProgressFill.style.width = `${Math.min(100, (count / KICK_TARGET) * 100)}%`;

    dom.kickUndoBtn.disabled = count === 0;
    dom.kickFinishBtn.disabled = count === 0;
    dom.kickDiscardBtn.disabled = !active;

    dom.kickTapLog.innerHTML = '';
    if (active && active.tapTimestampsMs.length > 0) {
      const recentTaps = active.tapTimestampsMs.slice(-8).reverse();
      recentTaps.forEach((ts, idx) => {
        const number = active.tapTimestampsMs.length - idx;
        const timeStr = new Date(ts).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        dom.kickTapLog.appendChild(createEl('span', 'tap-chip', `#${number} · ${timeStr}`));
      });
    }
  }

  function renderQuickKicks() {
    dom.quickKickCount.textContent = String(state.kicks.quickCount);
  }

  function renderKickHistory() {
    const list = dom.kickSessionsList;
    list.innerHTML = '';
    const sessions = state.kicks.sessions;
    dom.clearKickHistoryBtn.hidden = sessions.length === 0;

    if (sessions.length === 0) {
      list.appendChild(createEl('div', 'empty-state', 'No saved kick sessions yet.'));
      return;
    }

    sessions.forEach((sess) => {
      const item = createEl('div', 'history-item');
      const main = createEl('div', 'history-item-main');
      const title = createEl(
        'div',
        'history-item-title',
        `${sess.count} movement${sess.count === 1 ? '' : 's'} in ${calc.formatDurationWords(sess.durationSec)}`
      );
      const metaText = new Date(sess.startedAtMs).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      main.appendChild(title);
      main.appendChild(createEl('div', 'history-item-meta', metaText));

      const delBtn = createEl('button', 'delete-item-btn', '×');
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Delete kick session');
      delBtn.addEventListener('click', () => {
        state.kicks.sessions = state.kicks.sessions.filter((s) => s.id !== sess.id);
        persist();
        renderKickHistory();
      });

      item.appendChild(main);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  function handleKickSessionTap() {
    const now = Date.now();
    if (!state.kicks.activeSession) {
      state.kicks.activeSession = {
        id: store.createId('kick_sess'),
        startedAtMs: now,
        tapTimestampsMs: []
      };
    }
    state.kicks.activeSession.tapTimestampsMs.push(now);
    triggerHaptic(15);
    persist();
    ensureLiveTicker();
    renderKickSession();

    if (state.kicks.activeSession.tapTimestampsMs.length === KICK_TARGET) {
      showToast('10 movements reached!');
    }
  }

  function handleKickUndo() {
    if (!state.kicks.activeSession || state.kicks.activeSession.tapTimestampsMs.length === 0) return;
    state.kicks.activeSession.tapTimestampsMs.pop();
    if (state.kicks.activeSession.tapTimestampsMs.length === 0) {
      state.kicks.activeSession = null;
    }
    persist();
    ensureLiveTicker();
    renderKickSession();
  }

  function handleKickFinish() {
    const active = state.kicks.activeSession;
    if (!active || active.tapTimestampsMs.length === 0) return;
    const endedAtMs = Date.now();
    const durationSec = Math.max(1, Math.round((endedAtMs - active.startedAtMs) / 1000));
    state.kicks.sessions.unshift({
      id: active.id,
      startedAtMs: active.startedAtMs,
      endedAtMs,
      count: active.tapTimestampsMs.length,
      durationSec
    });
    state.kicks.sessions = state.kicks.sessions.slice(0, 100);
    state.kicks.activeSession = null;
    persist();
    ensureLiveTicker();
    renderKickSession();
    renderKickHistory();
    showToast('Kick session saved');
  }

  function handleKickDiscard() {
    state.kicks.activeSession = null;
    persist();
    ensureLiveTicker();
    renderKickSession();
  }

  /* ---------------- CONTRACTION TIMER & 5-1-1 ENGINE ---------------- */

  function renderContractionTimer() {
    const activeStart = state.contractions.activeStartMs;
    const isRecording = Number.isFinite(activeStart);

    if (isRecording) {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - activeStart) / 1000));
      dom.contractionTimer.textContent = calc.formatDurationSeconds(elapsedSec);
      dom.contractionStatus.textContent = 'Timing contraction...';
      dom.contractionStatus.classList.add('is-active');
      dom.contractionToggleBtn.textContent = 'Stop Contraction';
      dom.contractionToggleBtn.classList.add('is-recording');
    } else {
      dom.contractionTimer.textContent = '00:00';
      dom.contractionStatus.textContent = 'Ready to time';
      dom.contractionStatus.classList.remove('is-active');
      dom.contractionToggleBtn.textContent = 'Start Contraction';
      dom.contractionToggleBtn.classList.remove('is-recording');
    }
  }

  function renderFiveOneOneAlert(stats) {
    const info = stats.fiveOneOne || {};
    if (dom.contractionAnalyzerBar && dom.contractionAnalyzerText) {
      dom.contractionAnalyzerBar.dataset.phase = info.analyzerPhase || 'idle';
      dom.contractionAnalyzerText.textContent =
        info.analyzerText || 'Log contractions to monitor for an active 5-1-1 pattern.';
    }

    const match = Boolean(info.isMatch);
    if (!match) {
      lastFiveOneOneClusterStartMs = null;
      dom.contraction511Banner.hidden = true;
      dom.contraction511DismissedPill.hidden = true;
      dom.emergencyPhoneInline.hidden = true;
      if (dom.contraction511Metrics) dom.contraction511Metrics.textContent = '';
      return;
    }

    lastFiveOneOneClusterStartMs = info.clusterStartMs;
    if (dom.contraction511Metrics) {
      const durWord = info.avgDurationSec !== null ? calc.formatDurationWords(info.avgDurationSec) : '-';
      const intWord = info.avgIntervalSec !== null ? calc.formatDurationWords(info.avgIntervalSec) : '-';
      dom.contraction511Metrics.textContent = `${info.count} contractions over ${info.spanMinutes}m · Avg ${durWord} every ${intWord}`;
    }

    const isDismissed =
      state.contractions.dismissedAlertClusterMs !== null &&
      state.contractions.dismissedAlertClusterMs === lastFiveOneOneClusterStartMs;

    dom.contraction511Banner.hidden = isDismissed;
    dom.contraction511DismissedPill.hidden = !isDismissed;
  }

  function renderContractionHistory() {
    const stats = calc.computeContractionStats(state.contractions.history);

    dom.contrLastHourCount.textContent = String(stats.lastHourCount);
    dom.contrAvgDuration.textContent =
      stats.avgDurationSec !== null ? calc.formatDurationWords(stats.avgDurationSec) : '-';
    dom.contrAvgInterval.textContent =
      stats.avgIntervalSec !== null ? calc.formatDurationWords(stats.avgIntervalSec) : '-';

    renderFiveOneOneAlert(stats);

    const list = dom.contractionsList;
    list.innerHTML = '';
    dom.clearContractionsBtn.hidden = stats.entries.length === 0;

    if (stats.entries.length === 0) {
      list.appendChild(createEl('div', 'empty-state', 'No contractions recorded yet.'));
      return;
    }

    stats.entries.forEach((entry) => {
      const item = createEl('div', 'history-item');
      const main = createEl('div', 'history-item-main');

      const durationLabel = `Duration: ${calc.formatDurationWords(entry.durationSec)}`;
      const intervalLabel =
        entry.intervalSec !== null
          ? `Interval: ${calc.formatDurationWords(entry.intervalSec)}`
          : 'Start of cluster';

      main.appendChild(createEl('div', 'history-item-title', `${durationLabel} · ${intervalLabel}`));

      const startTimeStr = new Date(entry.startMs).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      main.appendChild(createEl('div', 'history-item-meta', `Started ${startTimeStr}`));

      if (entry.intensity) {
        const tagRow = createEl('div', 'tag-row');
        tagRow.appendChild(createEl('span', 'mini-tag', `${entry.intensity} intensity`));
        main.appendChild(tagRow);
      }

      const delBtn = createEl('button', 'delete-item-btn', '×');
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Delete contraction');
      delBtn.addEventListener('click', () => {
        state.contractions.history = state.contractions.history.filter((c) => c.id !== entry.id);
        persist();
        renderContractionHistory();
      });

      item.appendChild(main);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  function handleContractionToggle() {
    const now = Date.now();
    triggerHaptic(15);
    if (Number.isFinite(state.contractions.activeStartMs)) {
      const startMs = state.contractions.activeStartMs;
      state.contractions.history.push({
        id: store.createId('contr'),
        startMs,
        endMs: Math.max(startMs + 1000, now),
        intensity: selectedIntensity
      });
      state.contractions.history = state.contractions.history.slice(-200);
      state.contractions.activeStartMs = null;

      selectedIntensity = '';
      dom.contractionIntensityGroup
        .querySelectorAll('.choice-chip')
        .forEach((chip) => chip.classList.remove('is-selected'));

      showToast('Contraction logged');
    } else {
      state.contractions.activeStartMs = now;
    }
    persist();
    ensureLiveTicker();
    renderContractionTimer();
    renderContractionHistory();
  }

  function triggerDoctorCall(phoneNumber) {
    const dialable = String(phoneNumber || '').replace(/[^+\d*#]/g, '');
    if (!dialable) return false;
    window.location.href = `tel:${dialable}`;
    return true;
  }

  /* ---------------- JOURNAL, APPOINTMENTS & PDF DOCTOR REPORT ---------------- */

  function renderJournalEntries() {
    const list = dom.journalEntriesList;
    list.innerHTML = '';
    const entries = state.journal.entries;

    if (entries.length === 0) {
      list.appendChild(createEl('div', 'empty-state', 'No check-ins yet. Log how you feel above.'));
      return;
    }

    entries.forEach((entry) => {
      const item = createEl('div', 'history-item');
      const main = createEl('div', 'history-item-main');

      const parsed = calc.parseLocalDate(entry.dateStr);
      const dateLabel = parsed ? calc.formatReadableDate(parsed) : entry.dateStr;
      const titleParts = [dateLabel];
      if (entry.mood) titleParts.push(`· ${entry.mood}`);
      if (entry.weight) titleParts.push(`· ${entry.weight}`);
      if (entry.bp) titleParts.push(`· BP ${entry.bp}`);

      main.appendChild(createEl('div', 'history-item-title', titleParts.join(' ')));

      if (entry.symptoms.length > 0) {
        const tagRow = createEl('div', 'tag-row');
        entry.symptoms.forEach((sym) => {
          tagRow.appendChild(createEl('span', 'mini-tag', sym));
        });
        main.appendChild(tagRow);
      }

      if (entry.note) {
        main.appendChild(createEl('div', 'history-item-note', entry.note));
      }

      const delBtn = createEl('button', 'delete-item-btn', '×');
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Delete check-in');
      delBtn.addEventListener('click', () => {
        state.journal.entries = state.journal.entries.filter((e) => e.id !== entry.id);
        persist();
        renderJournalEntries();
        renderWeightTracker();
      });

      item.appendChild(main);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  function renderAppointments() {
    const list = dom.appointmentsList;
    list.innerHTML = '';
    const appts = state.journal.appointments;

    if (appts.length === 0) {
      list.appendChild(createEl('div', 'empty-state', 'No upcoming appointments added.'));
      return;
    }

    appts.forEach((appt) => {
      const item = createEl('div', `history-item${appt.completed ? ' is-completed' : ''}`);
      const left = createEl('div', 'appt-row history-item-main');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'appt-checkbox';
      checkbox.checked = Boolean(appt.completed);
      checkbox.setAttribute('aria-label', `Mark ${appt.title} completed`);
      checkbox.addEventListener('change', () => {
        appt.completed = checkbox.checked;
        persist();
        renderAppointments();
      });

      const content = createEl('div', 'history-item-main');
      content.appendChild(createEl('div', 'history-item-title', appt.title));

      const dateParts = [];
      if (appt.dateStr) {
        const parsed = calc.parseLocalDate(appt.dateStr);
        dateParts.push(parsed ? calc.formatReadableDate(parsed) : appt.dateStr);
      }
      if (appt.timeStr) dateParts.push(appt.timeStr);
      if (dateParts.length > 0) {
        content.appendChild(createEl('div', 'history-item-meta', dateParts.join(' · ')));
      }
      if (appt.notes) {
        content.appendChild(createEl('div', 'history-item-note', appt.notes));
      }

      left.appendChild(checkbox);
      left.appendChild(content);

      const delBtn = createEl('button', 'delete-item-btn', '×');
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Delete appointment');
      delBtn.addEventListener('click', () => {
        state.journal.appointments = state.journal.appointments.filter((a) => a.id !== appt.id);
        persist();
        renderAppointments();
      });

      item.appendChild(left);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  function buildClinicalReportFragment() {
    const frag = document.createDocumentFragment();
    const stats = getCurrentStats();
    const kickSummary = calc.computeKickSummary(state.kicks.sessions);
    const recentKickRate = calc.computeRecentKickRatePerHour(state.kicks.sessions, 7);
    const contrStats = calc.computeContractionStats(state.contractions.history);
    const generatedAt = new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Header
    const header = createEl('div', 'report-header');
    const titleWrap = createEl('div');
    titleWrap.appendChild(createEl('h1', 'report-title', 'BellyHaven Clinical Prenatal Summary'));
    const headerSub = stats && stats.valid
      ? `Gestational Age: ${stats.stageLabel} · EDD: ${stats.eddFormatted}`
      : 'Patient-recorded gestational, vitals, kick, and contraction log';
    titleWrap.appendChild(createEl('p', 'report-subtitle', headerSub));
    header.appendChild(titleWrap);
    header.appendChild(createEl('p', 'report-subtitle', `Generated: ${generatedAt}`));
    frag.appendChild(header);

    // Patient Gestational Summary Grid
    const metaGrid = createEl('div', 'report-meta-grid');
    const addMetaBox = (label, value) => {
      const box = createEl('div', 'report-meta-box');
      box.appendChild(createEl('span', 'report-meta-label', label));
      box.appendChild(createEl('strong', 'report-meta-val', value));
      metaGrid.appendChild(box);
    };

    if (stats && stats.valid) {
      addMetaBox('Gestational Age', `${stats.stageLabel} (${stats.trimester.label})`);
      addMetaBox('Estimated Due Date', stats.eddFormatted);
      addMetaBox('Calculated LMP', `${calc.formatReadableDate(stats.lmp)} (${stats.cycleLength}d cycle)`);
    } else {
      addMetaBox('Gestational Age', 'Not configured');
      addMetaBox('Estimated Due Date', 'Not configured');
      addMetaBox('Report Date', generatedAt);
    }
    frag.appendChild(metaGrid);

    // Care Team & Emergency Contacts Summary
    const contactsSec = createEl('div', 'report-section');
    contactsSec.appendChild(createEl('h2', null, 'Emergency & Care Plan Contacts'));
    const contactsList = createEl('ul', 'report-summary-list');
    const docLabel = [
      careContacts.doctorName || 'OB-GYN / Midwife not set',
      careContacts.clinicName,
      careContacts.doctorPhone || state.profile.emergencyPhone || 'No phone saved'
    ].filter(Boolean).join(' · ');
    contactsList.appendChild(createEl('li', null, `Primary Provider: ${docLabel}`));
    const partnerLabel = [
      careContacts.partnerName || 'Emergency contact not set',
      careContacts.partnerPhone || 'No phone saved'
    ].filter(Boolean).join(' · ');
    contactsList.appendChild(createEl('li', null, `Emergency / Partner: ${partnerLabel}`));
    contactsSec.appendChild(contactsList);
    frag.appendChild(contactsSec);

    // Recent Contraction & Kick Summary
    const activitySec = createEl('div', 'report-section');
    activitySec.appendChild(createEl('h2', null, 'Recent Kick Sessions & Contraction History'));

    const summaryGrid = createEl('div', 'report-summary-grid');

    // Kick card
    const kickCard = createEl('div', 'report-summary-card');
    kickCard.appendChild(createEl('h3', null, 'Recent Kick Sessions (Last 7)'));
    const kickList = createEl('ul', 'report-summary-list');
    kickList.appendChild(
      createEl(
        'li',
        null,
        `Avg Rate (Last ${recentKickRate.sessionCount || 7}): ${
          recentKickRate.avgKicksPerHour !== null
            ? `${recentKickRate.avgKicksPerHour} kicks/hr (${recentKickRate.sessionCount} session${recentKickRate.sessionCount === 1 ? '' : 's'})`
            : 'No sessions logged yet'
        }`
      )
    );
    kickList.appendChild(createEl('li', null, `Total Saved Sessions: ${kickSummary.totalSessions}`));
    kickList.appendChild(
      createEl(
        'li',
        null,
        `Average Session Duration: ${
          kickSummary.avgDurationSec !== null ? calc.formatDurationWords(kickSummary.avgDurationSec) : '-'
        }`
      )
    );
    kickList.appendChild(
      createEl('li', null, `Movements Logged Today: ${calc.computeTodaysKickCount(state.kicks)}`)
    );
    kickCard.appendChild(kickList);
    summaryGrid.appendChild(kickCard);

    // Contraction card
    const contrCard = createEl('div', 'report-summary-card');
    contrCard.appendChild(createEl('h3', null, 'Contraction History & Pattern'));
    const contrList = createEl('ul', 'report-summary-list');
    contrList.appendChild(createEl('li', null, `Total Recorded: ${contrStats.entries.length} (Last Hr: ${contrStats.lastHourCount})`));
    contrList.appendChild(
      createEl(
        'li',
        null,
        `Avg Duration / Frequency: ${
          contrStats.overallAvgDurationSec !== null ? calc.formatDurationWords(contrStats.overallAvgDurationSec) : '-'
        } / ${
          contrStats.overallAvgIntervalSec !== null ? calc.formatDurationWords(contrStats.overallAvgIntervalSec) : '-'
        }`
      )
    );
    const intensityParts = ['Mild', 'Moderate', 'Strong']
      .filter((lvl) => contrStats.intensityCounts[lvl] > 0)
      .map((lvl) => `${lvl}: ${contrStats.intensityCounts[lvl]}`);
    contrList.appendChild(
      createEl(
        'li',
        null,
        `Recorded Intensity: ${intensityParts.length > 0 ? intensityParts.join(', ') : 'Not recorded'}`
      )
    );
    contrList.appendChild(
      createEl(
        'li',
        null,
        `5-1-1 Rule Status: ${contrStats.isFiveOneOnePattern ? 'Matches 5-1-1 Threshold' : 'Not currently matched'}`
      )
    );
    if (contrStats.entries.length > 0) {
      const latestLogs = contrStats.entries.slice(0, 4).map((c) => {
        const t = new Date(c.startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const d = calc.formatDurationWords(c.durationSec);
        const iv = c.intervalSec !== null ? `q ${calc.formatDurationWords(c.intervalSec)}` : 'initial';
        return `${t} (${d}, ${iv})`;
      });
      contrList.appendChild(createEl('li', null, `Latest Log: ${latestLogs.join('; ')}`));
    }
    contrCard.appendChild(contrList);
    summaryGrid.appendChild(contrCard);

    activitySec.appendChild(summaryGrid);
    frag.appendChild(activitySec);

    // Maternal Vitals Log & Recent Journal Symptoms Table
    const journalSec = createEl('div', 'report-section');
    journalSec.appendChild(createEl('h2', null, 'Maternal Vitals Log & Symptoms'));

    const recentWeights = state.journal.entries.filter((e) => e.weight).map((e) => e.weight);
    const recentBps = state.journal.entries.filter((e) => e.bp).map((e) => e.bp);
    const vitalsTrend = createEl(
      'p',
      'report-subtitle',
      `Latest Weight: ${recentWeights[0] || 'Not logged'}${recentWeights.length > 1 ? ` (Earliest recorded: ${recentWeights[recentWeights.length - 1]})` : ''} · Latest BP: ${recentBps[0] || 'Not logged'}`
    );
    vitalsTrend.style.marginBottom = '8px';
    journalSec.appendChild(vitalsTrend);

    const table = createEl('table', 'report-table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Date', 'Weight', 'Blood Pressure', 'Mood', 'Logged Symptoms & Notes'].forEach((col) => {
      headRow.appendChild(createEl('th', null, col));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const recentEntries = state.journal.entries.slice(0, 20);
    if (recentEntries.length === 0) {
      const emptyRow = document.createElement('tr');
      const cell = createEl('td', null, 'No daily vitals or check-ins recorded yet.');
      cell.colSpan = 5;
      emptyRow.appendChild(cell);
      tbody.appendChild(emptyRow);
    } else {
      recentEntries.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.appendChild(createEl('td', null, entry.dateStr || '-'));
        tr.appendChild(createEl('td', null, entry.weight || '-'));
        tr.appendChild(createEl('td', null, entry.bp || '-'));
        tr.appendChild(createEl('td', null, entry.mood || '-'));
        const details = [
          entry.symptoms.length > 0 ? entry.symptoms.join(', ') : '',
          entry.note || ''
        ].filter(Boolean).join(' — ');
        tr.appendChild(createEl('td', null, details || '-'));
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    journalSec.appendChild(table);
    frag.appendChild(journalSec);

    // Footer disclaimer
    frag.appendChild(
      createEl(
        'p',
        'report-footer',
        `Generated ${generatedAt} via BellyHaven Private Companion. Informational only — this report does not constitute medical diagnosis or replace clinical evaluation.`
      )
    );

    return frag;
  }

  function renderDoctorReport() {
    if (dom.doctorReport) {
      dom.doctorReport.innerHTML = '';
      dom.doctorReport.appendChild(buildClinicalReportFragment());
    }
    if (dom.reportPreviewBody) {
      dom.reportPreviewBody.innerHTML = '';
      dom.reportPreviewBody.appendChild(buildClinicalReportFragment());
    }
  }

  function openReportPreviewModal() {
    renderDoctorReport();
    if (dom.carePlanModal && !dom.carePlanModal.hidden) {
      closeCarePlanModal();
    }
    if (dom.reportPreviewModal) {
      dom.reportPreviewModal.hidden = false;
    } else {
      window.print();
    }
  }

  function closeReportPreviewModal() {
    if (dom.reportPreviewModal) {
      dom.reportPreviewModal.hidden = true;
    }
    freePreviewPrintGranted = false;
  }

  function handleExportPdfReport() {
    if (blossomMod && !blossomMod.isBlossomUnlocked()) {
      openBlossomPaywall(
        'Unlock BellyHaven Blossom ✨ to export and print your Clinical Doctor Summary PDF.',
        () => openReportPreviewModal()
      );
      return;
    }
    openReportPreviewModal();
  }

  function handleJournalSubmit(event) {
    event.preventDefault();
    const dateStr = dom.journalDate.value || calc.formatLocalDateISO(new Date());
    const weight = dom.journalWeight.value.trim();
    const bp = dom.journalBp ? dom.journalBp.value.trim() : '';
    const note = dom.journalNote.value.trim();

    if (!selectedMood && selectedSymptoms.size === 0 && !weight && !bp && !note) {
      showToast('Select a mood, symptom, vitals, or add a note first');
      return;
    }

    state.journal.entries.unshift({
      id: store.createId('entry'),
      dateStr,
      mood: selectedMood,
      symptoms: Array.from(selectedSymptoms),
      weight,
      bp,
      note,
      createdAtMs: Date.now()
    });
    state.journal.entries = state.journal.entries.slice(0, 365);
    persist();

    selectedMood = '';
    selectedSymptoms.clear();
    dom.journalMoodGroup.querySelectorAll('.choice-chip').forEach((c) => c.classList.remove('is-selected'));
    dom.journalSymptomsGroup.querySelectorAll('.choice-chip').forEach((c) => c.classList.remove('is-selected'));
    dom.journalWeight.value = '';
    if (dom.journalBp) dom.journalBp.value = '';
    dom.journalNote.value = '';

    renderJournalEntries();
    renderWeightTracker();
    renderDoulaContextAndPrompts();
    showToast('Check-in saved');
  }

  function handleAppointmentSubmit(event) {
    event.preventDefault();
    const title = dom.apptTitle.value.trim();
    if (!title) return;

    state.journal.appointments.push({
      id: store.createId('appt'),
      dateStr: dom.apptDate.value,
      timeStr: dom.apptTime.value,
      title,
      notes: dom.apptNotes.value.trim(),
      completed: false
    });
    state.journal.appointments.sort((a, b) => (a.dateStr || '9999').localeCompare(b.dateStr || '9999'));
    persist();

    dom.appointmentForm.reset();
    renderAppointments();
    showToast('Appointment added');
  }

  /* ---------------- AI DOULA COMPANION ---------------- */

  function appendInlineFormattedText(parentEl, text) {
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parentEl.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        parentEl.appendChild(strong);
      } else {
        const em = document.createElement('em');
        em.textContent = token.slice(1, -1);
        parentEl.appendChild(em);
      }
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parentEl.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function renderFormattedText(container, rawText) {
    container.innerHTML = '';
    const lines = String(rawText || '').split(/\r?\n/);
    let currentList = null;

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        currentList = null;
        return;
      }

      const bulletMatch = /^(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
      if (bulletMatch) {
        if (!currentList) {
          currentList = document.createElement('ul');
          container.appendChild(currentList);
        }
        const li = document.createElement('li');
        appendInlineFormattedText(li, bulletMatch[1]);
        currentList.appendChild(li);
      } else {
        currentList = null;
        const p = document.createElement('p');
        appendInlineFormattedText(p, line);
        container.appendChild(p);
      }
    });
  }

  function getActiveAiModeLabel() {
    const { provider, apiKey, endpoint } = state.ai;
    if (provider === 'gemini' && apiKey) return 'Gemini Connected';
    if (provider === 'groq' && apiKey) return 'Groq Connected';
    if (provider === 'serverless' && endpoint) return 'Cloud Endpoint';
    return 'Offline Guide';
  }

  function renderDoulaContextAndPrompts() {
    if (!dom.doulaContextStrip) return;
    const stats = getCurrentStats();
    const ctx = doula.buildContextData(state, stats);

    dom.doulaModeBadge.textContent = getActiveAiModeLabel();

    if (ctx.hasProfile) {
      const symText =
        ctx.recentSymptomsList.length > 0
          ? ` · 14d symptoms: ${ctx.recentSymptomsList.slice(0, 3).join(', ')}`
          : ' · No symptoms logged (14d)';
      dom.doulaContextStrip.textContent = `Active context: Week ${ctx.weeks}+${ctx.days} (${ctx.trimesterLabel})${symText}`;

      dom.qpBabySize.textContent = `🥑 Is my baby's size normal for Week ${ctx.weeks}?`;
      dom.qpSleepPos.textContent = '💤 Best sleep positions';
    } else {
      dom.doulaContextStrip.textContent =
        'Tip: Save your LMP or Due Date on the Progress tab so answers adapt to your exact week.';
      dom.qpBabySize.textContent = "🥑 Is my baby's size normal for my week?";
      dom.qpSleepPos.textContent = '💤 Best sleep positions';
    }
  }

  function buildDoulaMessageBubble(msg) {
    const isUser = msg.role === 'user';
    const bubbleClass = isUser
      ? 'chat-bubble chat-bubble-user'
      : `chat-bubble chat-bubble-assistant${msg.isRedFlag ? ' chat-bubble-urgent' : ''}`;
    const bubble = createEl('div', bubbleClass);

    const body = createEl('div', 'chat-body');
    if (isUser) {
      body.appendChild(createEl('p', null, msg.text));
    } else {
      renderFormattedText(body, msg.text);
    }
    bubble.appendChild(body);

    if (!isUser && msg.isRedFlag) {
      const urgentActions = createEl('div', 'chat-urgent-actions');
      const callBtn = createEl('button', 'btn btn-danger btn-sm', 'Call Doctor / Emergency Contact');
      callBtn.type = 'button';
      callBtn.addEventListener('click', () => {
        if (!triggerDoctorCall(state.profile.emergencyPhone)) {
          openSettingsModal();
          dom.settingsDoctorPhone.focus();
          showToast('Add your OB-GYN or emergency number here');
        }
      });
      urgentActions.appendChild(callBtn);
      bubble.appendChild(urgentActions);
    }

    const meta = createEl('div', 'chat-meta');
    const timeLabel = new Date(msg.createdAtMs || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    meta.appendChild(createEl('span', null, msg.sourceLabel ? `${msg.sourceLabel} · ${timeLabel}` : timeLabel));
    bubble.appendChild(meta);

    return bubble;
  }

  function renderDoulaChat() {
    if (!dom.doulaMessages) return;
    renderDoulaContextAndPrompts();

    const list = dom.doulaMessages;
    list.innerHTML = '';

    const history = state.ai.chatHistory;
    dom.doulaClearBtn.hidden = history.length === 0;

    if (history.length === 0) {
      const greeting = `Hi mama, I'm Haven — your 24/7 maternity companion. I'm here to support you with evidence-based nutrition tips, comfort suggestions, and visit prep for your current trimester. How are you feeling today?\n\n${doula.DISCLAIMER}`;

      list.appendChild(
        buildDoulaMessageBubble({
          role: 'assistant',
          text: greeting,
          createdAtMs: Date.now(),
          isRedFlag: false,
          sourceLabel: getActiveAiModeLabel()
        })
      );
      return;
    }

    history.forEach((msg) => {
      list.appendChild(buildDoulaMessageBubble(msg));
    });

    list.scrollTop = list.scrollHeight;
  }

  function setDoulaBusy(busy) {
    isDoulaBusy = busy;
    dom.doulaLoading.hidden = !busy;
    dom.doulaSendBtn.disabled = busy;
    dom.doulaInput.disabled = busy;
    dom.doulaQuickPrompts.querySelectorAll('.quick-prompt-chip').forEach((chip) => {
      chip.disabled = busy;
    });
    if (dom.generateDoctorQuestionsBtn) {
      dom.generateDoctorQuestionsBtn.disabled = busy;
    }
    if (busy && dom.doulaMessages) {
      dom.doulaMessages.scrollTop = dom.doulaMessages.scrollHeight;
    }
  }

  async function sendDoulaMessage(rawMessage, options = {}) {
    const userText = String(rawMessage || '').trim();
    if (!userText || isDoulaBusy) return null;

    if (blossomMod && !options.skipPaywall) {
      const todayIso = calc.formatLocalDateISO(new Date());
      const aiGate = blossomMod.consumeAiQueryGate(todayIso);
      if (!aiGate.allowed) {
        openBlossomPaywall(
          `You've used today's ${aiGate.limit} free Haven AI conversations — unlock BellyHaven Blossom ✨ for unlimited 24/7 guidance.`,
          () => sendDoulaMessage(userText, { ...options, skipPaywall: true })
        );
        return null;
      }
    }

    const stats = getCurrentStats();
    const contextData = doula.buildContextData(state, stats);
    const priorHistory = state.ai.chatHistory.slice(-10);

    state.ai.chatHistory.push({
      id: store.createId('msg'),
      role: 'user',
      text: userText,
      createdAtMs: Date.now(),
      isRedFlag: false,
      sourceLabel: ''
    });
    state.ai.chatHistory = state.ai.chatHistory.slice(-60);
    persist();
    renderDoulaChat();
    setDoulaBusy(true);

    try {
      const reply = await doula.fetchAIResponse(userText, contextData, {
        aiConfig: state.ai,
        history: priorHistory,
        intent: options.intent || 'chat'
      });

      state.ai.chatHistory.push({
        id: store.createId('msg'),
        role: 'assistant',
        text: reply.text,
        createdAtMs: Date.now(),
        isRedFlag: Boolean(reply.isRedFlag),
        sourceLabel: reply.sourceLabel || getActiveAiModeLabel()
      });
      state.ai.chatHistory = state.ai.chatHistory.slice(-60);
      persist();
      return reply;
    } finally {
      setDoulaBusy(false);
      renderDoulaChat();
    }
  }

  function getQuickPromptQuestion(promptType) {
    const ctx = doula.buildContextData(state, getCurrentStats());
    if (promptType === 'baby-size') {
      return ctx.hasProfile
        ? `Is my baby's current size normal for Week ${ctx.weeks}?`
        : "Is my baby's current size normal for my week?";
    }
    if (promptType === 'food-safety') {
      return 'Can I safely eat this? (Food Safety Checker)';
    }
    if (promptType === 'sleep-pos') {
      return ctx.hasProfile
        ? `What are the best sleep positions for Trimester ${ctx.trimesterNumber}?`
        : 'What are the best sleep positions during pregnancy?';
    }
    if (promptType === 'ob-questions') {
      return doula.buildDoctorQuestionsPrompt(ctx);
    }
    return '';
  }

  async function handleGenerateDoctorQuestions() {
    if (isDoulaBusy) return;
    const ctx = doula.buildContextData(state, getCurrentStats());
    const prompt = doula.buildDoctorQuestionsPrompt(ctx);
    const originalLabel = dom.generateDoctorQuestionsBtn.textContent;
    dom.generateDoctorQuestionsBtn.textContent = 'Generating Questions...';

    const reply = await sendDoulaMessage(prompt, { intent: 'doctor-questions' });
    dom.generateDoctorQuestionsBtn.textContent = originalLabel;

    if (reply && reply.text) {
      lastGeneratedDoctorQuestions = reply.text;
      dom.doctorQuestionsSource.textContent = reply.sourceLabel || getActiveAiModeLabel();
      renderFormattedText(dom.aiDoctorQuestionsBody, reply.text);
      dom.aiDoctorQuestionsCard.hidden = false;
      showToast('Doctor questions generated');
    }
  }

  /* ---------------- EMERGENCY & CARE PLAN ---------------- */

  function initCarePlanSync() {
    if (!carePlan) return;
    if (!careContacts.doctorPhone && state.profile.emergencyPhone) {
      careContacts.doctorPhone = state.profile.emergencyPhone;
      careContacts = carePlan.saveCareContacts(careContacts);
    } else if (careContacts.doctorPhone && state.profile.emergencyPhone !== careContacts.doctorPhone) {
      state.profile.emergencyPhone = careContacts.doctorPhone;
      persist();
    }
  }

  function updateCallLinkElement(linkEl, phoneNumber) {
    if (!linkEl || !carePlan) return;
    const telHref = carePlan.buildTelHref(phoneNumber);
    if (telHref) {
      linkEl.setAttribute('href', telHref);
      linkEl.removeAttribute('aria-disabled');
      linkEl.classList.remove('care-btn-soft-disabled');
    } else {
      linkEl.removeAttribute('href');
      linkEl.setAttribute('aria-disabled', 'true');
      linkEl.classList.add('care-btn-soft-disabled');
    }
  }

  function renderDashboardCareSummary() {
    if (!dom.dashboardCareSummary) return;
    const summaryParts = [
      careContacts.doctorName,
      careContacts.clinicName,
      careContacts.doctorPhone || state.profile.emergencyPhone
    ].filter(Boolean);

    dom.dashboardCareSummary.textContent =
      summaryParts.length > 0
        ? `Care Team: ${summaryParts.join(' · ')}`
        : 'Save your OB-GYN contacts, hospital bag checklist, and clinical warning signs offline.';
  }

  function renderCareContacts(forceFieldSync) {
    if (!carePlan || !dom.careDoctorPhone) return;

    const fieldPairs = [
      [dom.careDoctorName, careContacts.doctorName],
      [dom.careClinicName, careContacts.clinicName],
      [dom.careDoctorPhone, careContacts.doctorPhone],
      [dom.carePartnerName, careContacts.partnerName],
      [dom.carePartnerPhone, careContacts.partnerPhone]
    ];

    fieldPairs.forEach(([inputEl, value]) => {
      if (!inputEl) return;
      if (forceFieldSync || document.activeElement !== inputEl) {
        inputEl.value = value || '';
      }
    });

    const effectiveDoctorPhone = careContacts.doctorPhone || state.profile.emergencyPhone;
    const effectiveCareTeamPhone = effectiveDoctorPhone || careContacts.partnerPhone;

    updateCallLinkElement(dom.careCallDoctorLink, effectiveDoctorPhone);
    updateCallLinkElement(dom.dashboardCallDoctorLink, effectiveDoctorPhone);
    updateCallLinkElement(dom.careCallEmergencyLink, careContacts.partnerPhone);
    updateCallLinkElement(dom.guideCallCareTeamLink, effectiveCareTeamPhone);

    renderDashboardCareSummary();
  }

  function handleCareContactInput() {
    if (!carePlan) return;
    careContacts = carePlan.saveCareContacts({
      doctorName: dom.careDoctorName.value,
      clinicName: dom.careClinicName.value,
      doctorPhone: dom.careDoctorPhone.value,
      partnerName: dom.carePartnerName.value,
      partnerPhone: dom.carePartnerPhone.value
    });

    if (state.profile.emergencyPhone !== careContacts.doctorPhone) {
      state.profile.emergencyPhone = careContacts.doctorPhone;
      persist();
    }

    if (dom.careContactsStatus) {
      dom.careContactsStatus.textContent = 'Saved offline';
    }
    renderCareContacts(false);
  }

  function renderHospitalBag() {
    if (!carePlan || !dom.hospitalBagGroups) return;

    const progress = carePlan.getHospitalBagProgress(hospitalBagItems);
    if (dom.hospitalBagProgressPill) {
      dom.hospitalBagProgressPill.textContent = progress.label;
    }
    if (dom.dashboardBagPill) {
      dom.dashboardBagPill.textContent = progress.label;
    }
    if (dom.hospitalBagProgressFill) {
      dom.hospitalBagProgressFill.style.width = `${progress.percent}%`;
    }

    const container = dom.hospitalBagGroups;
    container.innerHTML = '';

    carePlan.BAG_CATEGORIES.forEach((cat) => {
      const catItems = hospitalBagItems.filter((item) => item.category === cat.id);
      if (catItems.length === 0) return;

      const group = createEl('div', 'bag-group');
      const header = createEl('div', 'bag-group-header');
      header.appendChild(createEl('h4', 'bag-group-title', cat.label));
      const catPacked = catItems.filter((item) => item.checked).length;
      header.appendChild(createEl('span', 'bag-group-count', `${catPacked}/${catItems.length}`));
      group.appendChild(header);

      const ul = createEl('ul', 'bag-checklist');
      catItems.forEach((item) => {
        const li = createEl('li', `bag-item${item.checked ? ' is-checked' : ''}`);
        const label = createEl('label', 'bag-item-label');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'bag-checkbox';
        checkbox.checked = Boolean(item.checked);
        checkbox.addEventListener('change', () => {
          triggerHaptic(15);
          hospitalBagItems = carePlan.saveHospitalBag(
            carePlan.toggleHospitalBagItem(hospitalBagItems, item.id)
          );
          renderHospitalBag();
        });

        const textSpan = createEl('span', 'bag-item-text', item.label);
        if (item.isCustom) {
          textSpan.appendChild(createEl('span', 'bag-custom-tag', 'Custom'));
        }

        label.appendChild(checkbox);
        label.appendChild(textSpan);
        li.appendChild(label);

        if (item.isCustom) {
          const delBtn = createEl('button', 'delete-item-btn', '×');
          delBtn.type = 'button';
          delBtn.setAttribute('aria-label', `Remove ${item.label}`);
          delBtn.addEventListener('click', () => {
            hospitalBagItems = carePlan.saveHospitalBag(
              carePlan.removeCustomHospitalBagItem(hospitalBagItems, item.id)
            );
            renderHospitalBag();
            showToast('Custom item removed');
          });
          li.appendChild(delBtn);
        }

        ul.appendChild(li);
      });

      group.appendChild(ul);
      container.appendChild(group);
    });
  }

  function renderCarePlanAll(forceFieldSync) {
    renderCareContacts(Boolean(forceFieldSync));
    renderHospitalBag();
  }

  function setCareJumpActive(sectionId) {
    if (!dom.careJumpButtons) return;
    dom.careJumpButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.careJump === sectionId);
    });
  }

  function scrollToCareSection(sectionId) {
    const target = $(sectionId);
    if (!target) return;
    setCareJumpActive(sectionId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openCarePlanModal(initialSectionId) {
    if (!dom.carePlanModal) return;
    renderCarePlanAll(true);
    dom.carePlanModal.hidden = false;
    const targetId = initialSectionId || 'care-contacts-card';
    setCareJumpActive(targetId);
    if (initialSectionId) {
      requestAnimationFrame(() => scrollToCareSection(initialSectionId));
    } else if (dom.careSheetBody) {
      dom.careSheetBody.scrollTop = 0;
    }
  }

  function closeCarePlanModal() {
    if (!dom.carePlanModal) return;
    dom.carePlanModal.hidden = true;
  }

  function handleTelLinkClick(event, focusInputEl, sectionId, missingMsg) {
    const href = event.currentTarget.getAttribute('href') || '';
    if (href.startsWith('tel:')) return;
    event.preventDefault();
    if (dom.carePlanModal && dom.carePlanModal.hidden) {
      openCarePlanModal(sectionId || 'care-contacts-card');
    } else if (sectionId) {
      scrollToCareSection(sectionId);
    }
    if (focusInputEl) {
      setTimeout(() => focusInputEl.focus(), 60);
    }
    showToast(missingMsg);
  }

  /* ---------------- LUXURY EDITION: CELEBRATION, SOUND & PARTNER SHARE ---------------- */

  function getMilestoneCelebrationTier(weeks) {
    if (!Number.isFinite(weeks)) return null;
    if (weeks >= 40) {
      return {
        tier: 40,
        badge: 'Week 40 · Due Week',
        title: 'Congratulations Mama, welcome to Due Week!',
        subtitle:
          'You made it to full term! Keep your Care Team numbers handy, rest deeply, and trust every instinct.'
      };
    }
    if (weeks >= 28) {
      return {
        tier: 28,
        badge: 'Week 28+ · 3rd Trimester',
        title: 'Congratulations Mama, welcome to Trimester 3!',
        subtitle:
          'You are in the home stretch. Baby is growing strong—remember to count kicks daily and stay hydrated.'
      };
    }
    if (weeks >= 13) {
      return {
        tier: 13,
        badge: 'Week 13+ · 2nd Trimester',
        title: 'Congratulations Mama, welcome to Trimester 2!',
        subtitle:
          'Welcome to the golden trimester! Baby is busy forming tiny movements and unique fingerprints.'
      };
    }
    return null;
  }

  function stopPastelConfetti() {
    if (confettiAnimationId !== null) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    if (dom.confettiCanvas) {
      const ctx = dom.confettiCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, dom.confettiCanvas.width, dom.confettiCanvas.height);
      }
    }
  }

  function startPastelConfetti() {
    const canvas = dom.confettiCanvas;
    if (!canvas) return;
    stopPastelConfetti();

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const palette = ['#E8B4B8', '#C4737E', '#F6D6AD', '#B8D8BA', '#E9D5EC', '#F9E6E8'];

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * (height * 0.35),
      w: 7 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 3.2,
      vy: 2.1 + Math.random() * 3.0,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.14,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.95
    }));

    const startTime = performance.now();
    const durationMs = 3600;

    function frame(now) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      const fadeRatio = elapsed > durationMs - 900 ? Math.max(0, (durationMs - elapsed) / 900) : 1;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.rot += p.vRot;
        ctx.save();
        ctx.globalAlpha = p.alpha * fadeRatio;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (elapsed < durationMs) {
        confettiAnimationId = requestAnimationFrame(frame);
      } else {
        stopPastelConfetti();
      }
    }

    confettiAnimationId = requestAnimationFrame(frame);
  }

  function closeCelebrationModal() {
    stopPastelConfetti();
    if (dom.celebrationModal) {
      dom.celebrationModal.hidden = true;
    }
  }

  function checkMilestoneCelebration(stats) {
    if (!stats || !stats.valid || !dom.celebrationModal) return;
    const tierInfo = getMilestoneCelebrationTier(stats.weeks);
    if (!tierInfo) return;

    let celebratedTier = 0;
    try {
      celebratedTier = Number.parseInt(localStorage.getItem(CELEBRATION_STORAGE_KEY), 10) || 0;
    } catch (_) {
      celebratedTier = 0;
    }

    if (tierInfo.tier <= celebratedTier) return;

    try {
      localStorage.setItem(CELEBRATION_STORAGE_KEY, String(tierInfo.tier));
    } catch (_) {
      // Ignore storage error
    }

    dom.celebrationBadge.textContent = tierInfo.badge;
    dom.celebrationTitle.textContent = tierInfo.title;
    dom.celebrationSubtitle.textContent = `${tierInfo.subtitle} Baby is now about the size of a ${stats.milestone.name}!`;
    dom.celebrationModal.hidden = false;
    startPastelConfetti();
  }

  function renderSoundMachineUi(snap) {
    if (!snap || !soundMod) return;

    if (dom.soundModeGroup) {
      dom.soundModeGroup.querySelectorAll('[data-sound-mode]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.soundMode === snap.mode);
      });
    }

    if (dom.breathPacerStage) {
      const showPacer = snap.mode === 'breathing';
      dom.breathPacerStage.hidden = !showPacer;
      if (showPacer && dom.breathPacerOrb) {
        dom.breathPacerOrb.dataset.phase = snap.breathPhase.phase;
        dom.breathPhaseLabel.textContent = snap.breathPhase.label;
        dom.breathCountdownNum.textContent =
          snap.breathPhase.remainingSec > 0 ? String(snap.breathPhase.remainingSec) : '4';
      }
    }

    if (dom.soundPlayToggleBtn) {
      dom.soundPlayToggleBtn.textContent = snap.isPlaying ? 'Pause Soundscape' : 'Play Soundscape';
    }

    if (dom.soundVolumeSlider && dom.soundVolumeVal) {
      const pct = Math.round(snap.volume * 100);
      dom.soundVolumeSlider.value = String(pct);
      dom.soundVolumeVal.textContent = `${pct}%`;
    }

    if (dom.soundTimerGroup) {
      dom.soundTimerGroup.querySelectorAll('[data-sleep-min]').forEach((btn) => {
        const mins = Number.parseInt(btn.dataset.sleepMin, 10) || 0;
        btn.classList.toggle('is-selected', mins === snap.sleepTimerMinutes);
      });
    }

    if (dom.soundTimerDisplay) {
      const showTimer = snap.isPlaying && snap.remainingTimerSec > 0;
      dom.soundTimerDisplay.hidden = !showTimer;
      if (showTimer) {
        dom.soundTimerDisplay.textContent = soundMod.formatTimerRemaining(snap.remainingTimerSec);
      }
    }

    if (dom.dashboardSoundStatus) {
      dom.dashboardSoundStatus.textContent = snap.isPlaying ? `Playing · ${snap.modeMeta.label}` : 'Offline Audio';
    }

    if (dom.soundActiveBar && dom.soundActiveLabel) {
      dom.soundActiveBar.hidden = !snap.isPlaying;
      if (snap.isPlaying) {
        const timerSuffix =
          snap.remainingTimerSec > 0 ? ` (${soundMod.formatTimerRemaining(snap.remainingTimerSec)})` : '';
        dom.soundActiveLabel.textContent = `${snap.modeMeta.label}${timerSuffix}`;
      }
    }
  }

  function openSoundMachineModal() {
    if (!dom.soundMachineModal) return;
    if (soundEngine) {
      renderSoundMachineUi(soundEngine.getSnapshot());
    }
    dom.soundMachineModal.hidden = false;
  }

  function closeSoundMachineModal() {
    if (dom.soundMachineModal) {
      dom.soundMachineModal.hidden = true;
    }
  }

  function buildPartnerUpdateMessage() {
    const stats = getCurrentStats();
    const week = stats && stats.valid ? stats.weeks : 0;
    const milestone = stats && stats.valid ? stats.milestone : calc.getMilestone(4);
    const kicksToday = calc.computeTodaysKickCount(state.kicks);
    const latestEntry = state.journal.entries[0];
    const momMood =
      latestEntry && (latestEntry.mood || latestEntry.note)
        ? latestEntry.mood || latestEntry.note.slice(0, 60)
        : 'Doing well!';

    return [
      `🍼 BellyHaven Update (Week ${week} - ${milestone.name})!`,
      `✨ Baby is roughly ${milestone.length} long and moving active!`,
      `🩺 Kicks counted today: ${kicksToday}.`,
      `💕 Mom's mood: ${momMood}.`,
      'Reminder for dad: Keep mom hydrated and bring snacks! 🥑'
    ].join('\n');
  }

  function updatePartnerWhatsappHref(message) {
    if (!dom.partnerWhatsappLink) return;
    dom.partnerWhatsappLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message || '')}`;
  }

  function openPartnerShareModal() {
    if (!dom.partnerShareModal) return;
    const msg = buildPartnerUpdateMessage();
    if (dom.partnerUpdateText) {
      dom.partnerUpdateText.value = msg;
    }
    updatePartnerWhatsappHref(msg);
    dom.partnerShareModal.hidden = false;
  }

  function closePartnerShareModal() {
    if (dom.partnerShareModal) {
      dom.partnerShareModal.hidden = true;
    }
  }

  async function copyTextWithFallback(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // Fallback below
      }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const copied = document.execCommand('copy');
      ta.remove();
      return copied;
    } catch (_) {
      return false;
    }
  }

  async function handlePartnerNativeShare() {
    const message = dom.partnerUpdateText ? dom.partnerUpdateText.value.trim() : buildPartnerUpdateMessage();
    if (!message) return;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'BellyHaven Baby Update',
          text: message
        });
        showToast('Update shared!');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    const copied = await copyTextWithFallback(message);
    if (copied) {
      showToast('Share unavailable — message copied! Tap WhatsApp or paste anywhere.');
    } else {
      showToast('Use WhatsApp or copy the message above');
    }
  }

  /* ---------------- BOUTIQUE FEATURES: BABY NOTE, WEIGHT CHART, GYRO TILT ---------------- */

  function setBabyNoteListenState(nextState) {
    if (!dom.babyNoteListenBtn) return;
    let normalized = 'idle';
    if (typeof nextState === 'string') {
      if (nextState === 'loading' || nextState === 'playing' || nextState === 'paused' || nextState === 'idle') {
        normalized = nextState;
      }
    } else if (nextState) {
      normalized = 'playing';
    }

    const isLoading = normalized === 'loading';
    const isPlaying = normalized === 'playing';
    const isPaused = normalized === 'paused';

    dom.babyNoteListenBtn.classList.toggle('is-loading', isLoading);
    dom.babyNoteListenBtn.classList.toggle('is-playing', isPlaying);
    dom.babyNoteListenBtn.classList.toggle('is-speaking', isPlaying);
    dom.babyNoteListenBtn.classList.toggle('is-paused', isPaused);
    dom.babyNoteListenBtn.setAttribute('aria-pressed', String(isLoading || isPlaying));
    dom.babyNoteListenBtn.setAttribute('aria-busy', String(isLoading));

    let labelText = 'Listen';
    let ariaLabel = 'Listen to A Note from Baby';
    if (isLoading) {
      labelText = 'Tuning voice...';
      ariaLabel = 'Tuning neural voice, tap to cancel';
    } else if (isPlaying) {
      labelText = 'Playing...';
      ariaLabel = 'Playing A Note from Baby, tap to pause';
    } else if (isPaused) {
      labelText = 'Resume';
      ariaLabel = 'Paused A Note from Baby, tap to resume';
    }

    dom.babyNoteListenBtn.setAttribute('aria-label', ariaLabel);
    if (dom.babyNoteListenLabel) {
      dom.babyNoteListenLabel.textContent = labelText;
    }
  }

  function renderBabyNoteCard(week) {
    if (!dom.babyNoteCard || !babyNotesMod) return;
    const note = babyNotesMod.getBabyNote(week, getSavedUserName());
    if (activeNoteWeek !== null && activeNoteWeek !== note.week && speechReader && speechReader.isSpeaking()) {
      speechReader.stop();
      setBabyNoteListenState('idle');
    }
    activeNoteWeek = note.week;

    if (dom.babyNoteWeekPill) dom.babyNoteWeekPill.textContent = `Week ${note.week}`;
    if (dom.babyNoteTitle) dom.babyNoteTitle.textContent = note.title;
    if (dom.babyNoteMessage) dom.babyNoteMessage.textContent = note.message;
    if (dom.babyNoteSignoff) dom.babyNoteSignoff.textContent = note.signOff;
  }

  function handleBabyNoteListenClick() {
    if (!speechReader || !babyNotesMod) return;

    const currentState = typeof speechReader.getState === 'function'
      ? speechReader.getState()
      : (speechReader.isSpeaking() ? 'playing' : 'idle');

    if (currentState === 'loading') {
      speechReader.stop();
      setBabyNoteListenState('idle');
      return;
    }

    if (currentState === 'playing') {
      if (typeof speechReader.pause === 'function' && speechReader.pause()) {
        setBabyNoteListenState('paused');
      } else {
        speechReader.stop();
        setBabyNoteListenState('idle');
      }
      return;
    }

    if (currentState === 'paused') {
      if (typeof speechReader.resume === 'function' && speechReader.resume()) {
        setBabyNoteListenState('playing');
        return;
      }
      speechReader.stop();
    }

    const week = activeNoteWeek || 4;
    const note = babyNotesMod.getBabyNote(week, getSavedUserName());
    const started = speechReader.speak(note, {
      onLoading: () => setBabyNoteListenState('loading'),
      onStart: () => setBabyNoteListenState('playing'),
      onPause: () => setBabyNoteListenState('paused'),
      onResume: () => setBabyNoteListenState('playing'),
      onEnd: () => setBabyNoteListenState('idle'),
      onError: () => {
        setBabyNoteListenState('idle');
        showToast('Audio playback unavailable in this browser');
      },
      onUnsupported: () => {
        setBabyNoteListenState('idle');
        showToast('Speech synthesis is not supported in this browser');
      }
    });

    if (!started) {
      setBabyNoteListenState('idle');
    }
  }

  function syncWeightInputsFromState() {
    if (!weightMod || !dom.prePregnancyWeight || !dom.maternalHeight) return;
    const wt = state.weightTracker || { unit: 'kg', preWeightKg: null, heightCm: null };
    const unit = wt.unit === 'lbs' ? 'lbs' : 'kg';

    if (dom.weightUnitGroup) {
      dom.weightUnitGroup.querySelectorAll('[data-weight-unit]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.weightUnit === unit);
      });
    }

    if (dom.preWeightLabel) {
      dom.preWeightLabel.textContent = `Pre-Pregnancy Weight (${unit})`;
    }
    if (dom.heightLabel) {
      dom.heightLabel.textContent = unit === 'lbs' ? 'Height (in)' : 'Height (cm)';
    }

    dom.prePregnancyWeight.placeholder = unit === 'lbs' ? 'e.g. 132' : 'e.g. 60';
    dom.maternalHeight.placeholder = unit === 'lbs' ? 'e.g. 65' : 'e.g. 165';

    if (document.activeElement !== dom.prePregnancyWeight) {
      dom.prePregnancyWeight.value =
        Number.isFinite(wt.preWeightKg) && wt.preWeightKg > 0
          ? String(unit === 'lbs' ? Math.round(weightMod.kgToLbs(wt.preWeightKg) * 10) / 10 : wt.preWeightKg)
          : '';
    }
    if (document.activeElement !== dom.maternalHeight) {
      dom.maternalHeight.value =
        Number.isFinite(wt.heightCm) && wt.heightCm > 0
          ? String(unit === 'lbs' ? Math.round(weightMod.cmToIn(wt.heightCm) * 10) / 10 : wt.heightCm)
          : '';
    }
  }

  function renderWeightTracker() {
    if (!weightMod || !dom.weightChartContainer) return;
    const wt = state.weightTracker || { unit: 'kg', preWeightKg: null, heightCm: null };
    const unit = wt.unit === 'lbs' ? 'lbs' : 'kg';
    const stats = getCurrentStats();

    const model = weightMod.computeWeightChartModel({
      unit,
      preWeightKg: wt.preWeightKg,
      heightCm: wt.heightCm,
      currentWeek: stats && stats.valid ? stats.gestationDays / 7 : null,
      journalEntries: state.journal.entries,
      lmpDate: stats && stats.valid ? stats.lmp : null,
      calc
    });

    if (dom.bmiResultPill && dom.acogRangeSummary) {
      if (model.bmiInfo) {
        const minDisp = weightMod.toDisplayWeight(model.guide.totalMinKg, unit);
        const maxDisp = weightMod.toDisplayWeight(model.guide.totalMaxKg, unit);
        dom.bmiResultPill.textContent = `BMI ${model.bmiInfo.bmi} · ${model.bmiInfo.categoryLabel}`;
        dom.acogRangeSummary.textContent = `ACOG 40w gain goal: +${minDisp} to +${maxDisp} ${unit}`;
      } else {
        dom.bmiResultPill.textContent = 'BMI: Enter baseline';
        dom.acogRangeSummary.textContent = 'Healthy 40-week gain band updates automatically';
      }
    }

    weightMod.renderWeightChartSvg(dom.weightChartContainer, model);

    if (dom.weightTrajectoryNote) {
      const noLmpHint =
        (!stats || !stats.valid) && model.bmiInfo
          ? ' Save your LMP or Due Date on Progress to map check-ins by week.'
          : '';
      dom.weightTrajectoryNote.textContent = `${model.statusNote}${noLmpHint}`;
    }
  }

  function handleWeightTrackerInput() {
    if (!weightMod || !dom.prePregnancyWeight || !dom.maternalHeight) return;
    const wt = state.weightTracker || (state.weightTracker = { unit: 'kg', preWeightKg: null, heightCm: null });
    const unit = wt.unit === 'lbs' ? 'lbs' : 'kg';

    const rawW = Number.parseFloat(dom.prePregnancyWeight.value);
    const rawH = Number.parseFloat(dom.maternalHeight.value);

    const wKg = Number.isFinite(rawW) && rawW > 0 ? (unit === 'lbs' ? weightMod.lbsToKg(rawW) : rawW) : null;
    const hCm = Number.isFinite(rawH) && rawH > 0 ? (unit === 'lbs' ? weightMod.inToCm(rawH) : rawH) : null;

    wt.preWeightKg = wKg !== null && wKg >= 25 && wKg <= 260 ? Math.round(wKg * 100) / 100 : null;
    wt.heightCm = hCm !== null && hCm >= 90 && hCm <= 250 ? Math.round(hCm * 100) / 100 : null;

    persist();
    renderWeightTracker();
  }

  function handleWeightUnitToggle(nextUnit) {
    if (!weightMod) return;
    const targetUnit = nextUnit === 'lbs' ? 'lbs' : 'kg';
    const wt = state.weightTracker || (state.weightTracker = { unit: 'kg', preWeightKg: null, heightCm: null });
    if (wt.unit === targetUnit) return;
    wt.unit = targetUnit;
    persist();
    if (dom.prePregnancyWeight && document.activeElement === dom.prePregnancyWeight) {
      dom.prePregnancyWeight.blur();
    }
    if (dom.maternalHeight && document.activeElement === dom.maternalHeight) {
      dom.maternalHeight.blur();
    }
    syncWeightInputsFromState();
    renderWeightTracker();
  }

  function initGyroscopicMilestoneTilt() {
    const card = dom.milestoneCard;
    if (!card || gyroTiltController) return null;

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    const MAX_TILT_DEG = 6;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    let baseBeta = null;
    let baseGamma = null;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let targetGlareX = 50;
    let targetGlareY = 32;
    let currentGlareX = 50;
    let currentGlareY = 32;
    let rafId = null;
    let lastGyroMs = 0;
    let orientationAttached = false;

    function applyFrame() {
      currentTiltX += (targetTiltX - currentTiltX) * 0.18;
      currentTiltY += (targetTiltY - currentTiltY) * 0.18;
      currentGlareX += (targetGlareX - currentGlareX) * 0.18;
      currentGlareY += (targetGlareY - currentGlareY) * 0.18;

      card.style.setProperty('--tilt-x', `${currentTiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${currentTiltY.toFixed(2)}deg`);
      card.style.setProperty('--glare-x', `${currentGlareX.toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${currentGlareY.toFixed(1)}%`);

      const moving =
        Math.abs(targetTiltX - currentTiltX) > 0.03 ||
        Math.abs(targetTiltY - currentTiltY) > 0.03 ||
        Math.abs(targetGlareX - currentGlareX) > 0.2;

      if (moving) {
        rafId = requestAnimationFrame(applyFrame);
      } else {
        rafId = null;
      }
    }

    function scheduleFrame() {
      if (rafId === null) {
        rafId = requestAnimationFrame(applyFrame);
      }
    }

    function onDeviceOrientation(event) {
      if (card.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      lastGyroMs = Date.now();

      if (baseBeta === null || baseGamma === null) {
        baseBeta = event.beta;
        baseGamma = event.gamma;
      }

      const deltaBeta = clamp(event.beta - baseBeta, -28, 28);
      const deltaGamma = clamp(event.gamma - baseGamma, -28, 28);

      targetTiltX = clamp((-deltaBeta / 28) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      targetTiltY = clamp((deltaGamma / 28) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      targetGlareX = clamp(50 + (targetTiltY / MAX_TILT_DEG) * 34, 10, 90);
      targetGlareY = clamp(36 - (targetTiltX / MAX_TILT_DEG) * 28, 10, 90);
      scheduleFrame();
    }

    function attachOrientationListener() {
      if (orientationAttached || !('DeviceOrientationEvent' in window)) return;
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
      orientationAttached = true;
    }

    if (
      typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      const requestIosGyro = (evt) => {
        if (evt.target && evt.target.closest('button')) return;
        window.DeviceOrientationEvent.requestPermission()
          .then((res) => {
            if (res === 'granted') attachOrientationListener();
          })
          .catch(() => {});
      };
      card.addEventListener('click', requestIosGyro, { once: true, passive: true });
    } else {
      attachOrientationListener();
    }

    // Subtle pointer tilt & specular highlight on desktop mouse devices
    card.addEventListener(
      'pointermove',
      (evt) => {
        if (evt.pointerType === 'touch' || Date.now() - lastGyroMs < 1500) return;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const normX = clamp((evt.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * 2;
        const normY = clamp((evt.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * 2;
        targetTiltX = clamp(-normY * (MAX_TILT_DEG * 0.75), -MAX_TILT_DEG, MAX_TILT_DEG);
        targetTiltY = clamp(normX * (MAX_TILT_DEG * 0.75), -MAX_TILT_DEG, MAX_TILT_DEG);
        targetGlareX = clamp((normX * 0.5 + 0.5) * 100, 10, 90);
        targetGlareY = clamp((normY * 0.5 + 0.5) * 100, 10, 90);
        scheduleFrame();
      },
      { passive: true }
    );

    card.addEventListener(
      'pointerleave',
      () => {
        if (Date.now() - lastGyroMs < 1500) return;
        targetTiltX = 0;
        targetTiltY = 0;
        targetGlareX = 50;
        targetGlareY = 32;
        scheduleFrame();
      },
      { passive: true }
    );

    gyroTiltController = {
      resetBaseline: () => {
        baseBeta = null;
        baseGamma = null;
      }
    };
    return gyroTiltController;
  }

  /* ---------------- SETTINGS / BACKUP / RESET ---------------- */

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openSettingsModal() {
    dom.resetConfirmBox.hidden = true;
    if (dom.settingsUserName) dom.settingsUserName.value = getSavedUserName();
    dom.settingsDoctorPhone.value = state.profile.emergencyPhone || '';
    renderBlossomUi();
    dom.settingsModal.hidden = false;
  }

  /* ---------------- INTERACTIVE BIRTH PLAN BUILDER ---------------- */

  function renderBirthPlanSummary() {
    if (!birthPlanMod) return;
    const count = birthPlanMod.countSelectedPreferences(birthPlan);
    const label = `${count} selected`;
    if (dom.dashboardBirthPlanPill) dom.dashboardBirthPlanPill.textContent = label;
    if (dom.careBirthPlanPill) dom.careBirthPlanPill.textContent = label;
    if (dom.birthPlanCountPill) dom.birthPlanCountPill.textContent = label;

    const grouped = birthPlanMod.getGroupedSelections(birthPlan)
      .filter((g) => g.selectedOptions.length > 0)
      .map((g) => `${g.title} (${g.selectedOptions.length})`);
    const hasNotes = Boolean((birthPlan.specialNotes || '').trim());

    const summaryText =
      grouped.length > 0
        ? `Selected: ${grouped.join(' · ')}${hasNotes ? ' + Special Notes' : ''}`
        : hasNotes
          ? 'Custom labor notes saved — tap preferences to add checklist choices.'
          : 'Curate your labor atmosphere, pain comfort, delivery room, and newborn preferences — formatted into a clean 1-page hospital printout.';

    if (dom.dashboardBirthPlanSummary) dom.dashboardBirthPlanSummary.textContent = summaryText;
    if (dom.careBirthPlanSummary) dom.careBirthPlanSummary.textContent = summaryText;
  }

  function renderBirthPlanCategories() {
    if (!birthPlanMod || !dom.birthPlanCategories) return;
    const selectedSet = new Set(birthPlan.selected || []);
    dom.birthPlanCategories.innerHTML = '';

    birthPlanMod.BIRTH_PLAN_CATEGORIES.forEach((cat) => {
      const card = createEl('section', 'card care-subcard birth-plan-cat-block');
      card.appendChild(createEl('h3', null, cat.title));
      card.appendChild(createEl('p', 'birth-plan-cat-sub', cat.subtitle));

      const grid = createEl('div', 'birth-plan-chip-grid');
      cat.options.forEach((opt) => {
        const active = selectedSet.has(opt.id);
        const btn = createEl('button', `birth-plan-chip${active ? ' is-selected' : ''}`);
        btn.type = 'button';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.dataset.birthPrefId = opt.id;

        btn.appendChild(createEl('span', 'birth-plan-chip-text', opt.label));
        btn.appendChild(createEl('span', 'birth-plan-chip-check', '✓'));

        btn.addEventListener('click', () => {
          triggerHaptic(15);
          birthPlan = birthPlanMod.saveBirthPlan(birthPlanMod.togglePreference(birthPlan, opt.id));
          if (dom.birthPlanSaveStatus) dom.birthPlanSaveStatus.textContent = 'Saved offline';
          renderBirthPlanCategories();
          renderBirthPlanSummary();
        });

        grid.appendChild(btn);
      });

      card.appendChild(grid);
      dom.birthPlanCategories.appendChild(card);
    });

    if (dom.birthPlanNotes && document.activeElement !== dom.birthPlanNotes) {
      dom.birthPlanNotes.value = birthPlan.specialNotes || '';
    }
  }

  function openBirthPlanModal() {
    if (!dom.birthPlanModal || !birthPlanMod) return;
    if (dom.carePlanModal && !dom.carePlanModal.hidden) {
      closeCarePlanModal();
    }
    birthPlan = birthPlanMod.loadBirthPlan();
    renderBirthPlanCategories();
    renderBirthPlanSummary();
    if (dom.birthPlanNotes) {
      dom.birthPlanNotes.value = birthPlan.specialNotes || '';
    }
    dom.birthPlanModal.hidden = false;
  }

  function closeBirthPlanModal() {
    if (dom.birthPlanModal) {
      dom.birthPlanModal.hidden = true;
    }
  }

  function renderBirthPlanPrintSheet() {
    if (!dom.doctorReport || !birthPlanMod) return;
    dom.doctorReport.innerHTML = '';
    const frag = birthPlanMod.buildBirthPlanPrintFragment({
      birthPlan,
      stats: getCurrentStats(),
      careContacts,
      emergencyPhone: state.profile.emergencyPhone
    });
    if (frag) {
      dom.doctorReport.appendChild(frag);
    }
  }

  function executeBirthPlanPrint() {
    if (!birthPlanMod) return;
    birthPlan = birthPlanMod.loadBirthPlan();
    renderBirthPlanPrintSheet();
    showToast('Prepared 1-page Birth Plan for Print / PDF');
    window.print();
  }

  function handleExportBirthPlanPdf() {
    if (!birthPlanMod) return;
    if (blossomMod && !blossomMod.isBlossomUnlocked()) {
      openBlossomPaywall(
        'Unlock BellyHaven Blossom ✨ to export and print your 1-Page Maternal Birth Plan PDF.',
        () => executeBirthPlanPrint()
      );
      return;
    }
    executeBirthPlanPrint();
  }

  /* ---------------- BELLYHAVEN BLOSSOM PAYWALL & PAYPAL ---------------- */

  function renderBlossomUi() {
    if (!blossomMod) return;
    const unlocked = blossomMod.isBlossomUnlocked();
    const receipt = blossomMod.getReceipt();

    if (dom.settingsBlossomCard) {
      dom.settingsBlossomCard.classList.toggle('is-unlocked', unlocked);
    }
    if (dom.settingsBlossomBadge) {
      dom.settingsBlossomBadge.textContent = unlocked ? 'Blossom Active ✨' : 'PRO';
    }
    if (dom.settingsBlossomDesc) {
      dom.settingsBlossomDesc.textContent = unlocked
        ? `Unlocked${receipt && receipt.planTitle ? ` (${receipt.planTitle})` : ''} — Unlimited Haven AI, PDF doctor reports & 1-page Birth Plan exports.`
        : 'Unlock unlimited 24/7 Haven AI chat, PDF doctor summaries, and 1-page birth plan exports.';
    }
    if (dom.settingsUpgradeBlossomBtn) {
      dom.settingsUpgradeBlossomBtn.textContent = unlocked ? 'Blossom Unlocked ✨' : 'Upgrade to Blossom ✨';
      dom.settingsUpgradeBlossomBtn.disabled = unlocked;
    }
  }

  function selectBlossomPlan(planId) {
    selectedBlossomPlanId = planId === 'monthly' ? 'monthly' : 'onetime';
    const isMonthly = selectedBlossomPlanId === 'monthly';

    if (dom.blossomPlanMonthly) {
      dom.blossomPlanMonthly.classList.toggle('is-selected', isMonthly);
      dom.blossomPlanMonthly.setAttribute('aria-checked', isMonthly ? 'true' : 'false');
    }
    if (dom.blossomPlanOnetime) {
      dom.blossomPlanOnetime.classList.toggle('is-selected', !isMonthly);
      dom.blossomPlanOnetime.setAttribute('aria-checked', !isMonthly ? 'true' : 'false');
    }

    if (blossomMod && dom.blossomCheckoutSummary) {
      const plan = blossomMod.getPlan(selectedBlossomPlanId);
      dom.blossomCheckoutSummary.innerHTML = '';
      dom.blossomCheckoutSummary.appendChild(document.createTextNode('Selected: '));
      dom.blossomCheckoutSummary.appendChild(createEl('strong', null, plan.title));
      dom.blossomCheckoutSummary.appendChild(
        document.createTextNode(
          ` — $${plan.amount} ${plan.currency} ${isMonthly ? '/ Month' : 'One-Time'}`
        )
      );

      if (
        typeof window !== 'undefined' &&
        window.paypal &&
        dom.paypalStatusNote &&
        !dom.paypalStatusNote.classList.contains('is-error')
      ) {
        dom.paypalStatusNote.textContent = `PayPal, Venmo, Apple/Google Pay & Card · $${plan.amount} ${plan.currency}`;
      }
    }
  }

  function handleBlossomPurchaseSuccess(receipt) {
    triggerHaptic([18, 40, 24]);
    closeBlossomPaywall({ keepPendingAction: true });
    renderBlossomUi();
    startPastelConfetti();
    showToast(
      `Welcome to BellyHaven Blossom ✨ (${receipt && receipt.planTitle ? receipt.planTitle : 'Unlocked'})`
    );

    const actionToResume = pendingBlossomAction;
    pendingBlossomAction = null;
    if (typeof actionToResume === 'function') {
      setTimeout(() => actionToResume(), 180);
    }
  }

  function openBlossomPaywall(triggerReasonText, onUnlockAction) {
    if (!dom.blossomPaywallModal || !blossomMod) return;
    if (blossomMod.isBlossomUnlocked()) {
      if (typeof onUnlockAction === 'function') onUnlockAction();
      return;
    }

    pendingBlossomAction = typeof onUnlockAction === 'function' ? onUnlockAction : null;
    if (dom.blossomTriggerNote) {
      if (triggerReasonText) {
        dom.blossomTriggerNote.textContent = triggerReasonText;
        dom.blossomTriggerNote.hidden = false;
      } else {
        dom.blossomTriggerNote.hidden = true;
        dom.blossomTriggerNote.textContent = '';
      }
    }

    if (dom.settingsModal && !dom.settingsModal.hidden) {
      closeSettingsModal();
    }

    selectBlossomPlan('onetime');
    dom.blossomPaywallModal.hidden = false;

    blossomMod.renderPayPalButtons({
      container: dom.paypalButtonContainer,
      statusEl: dom.paypalStatusNote,
      getSelectedPlanId: () => selectedBlossomPlanId,
      onSuccess: (receipt) => handleBlossomPurchaseSuccess(receipt),
      onError: () => {
        showToast('Checkout could not be completed — please verify your connection.');
      }
    });
  }

  function closeBlossomPaywall(options = {}) {
    if (!dom.blossomPaywallModal) return;
    dom.blossomPaywallModal.hidden = true;
    if (!options.keepPendingAction) {
      pendingBlossomAction = null;
    }
  }

  function closeSettingsModal() {
    dom.settingsModal.hidden = true;
    dom.resetConfirmBox.hidden = true;
  }

  /* ---------------- PWA INSTALL PROMPT & SERVICE WORKER ---------------- */

  function isStandaloneMode() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  }

  function setupPwaInstall() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      if (!isStandaloneMode() && dom.installBanner) {
        dom.installBanner.hidden = false;
      }
    });

    dom.installAppBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try {
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('Installing app...');
        }
      } catch (_) {
        // Ignore prompt cancellation errors
      }
      deferredInstallPrompt = null;
      dom.installBanner.hidden = true;
    });

    dom.dismissInstallBtn.addEventListener('click', () => {
      dom.installBanner.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      dom.installBanner.hidden = true;
      showToast('BellyHaven installed');
    });
  }

  function registerServiceWorkerIfSupported() {
    if (
      'serviceWorker' in navigator &&
      (location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1')
    ) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Offline SW optional; ignore registration failure
      });
    }
  }

  /* ---------------- LIVE TICKER ---------------- */

  function ensureLiveTicker() {
    const needsTick =
      Boolean(state.kicks.activeSession) || Number.isFinite(state.contractions.activeStartMs);

    if (needsTick && timerIntervalId === null) {
      timerIntervalId = setInterval(() => {
        if (state.kicks.activeSession) renderKickSession();
        if (Number.isFinite(state.contractions.activeStartMs)) renderContractionTimer();
      }, 1000);
    } else if (!needsTick && timerIntervalId !== null) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }

    const hasContractionLogs = state.contractions.history.length > 0;
    if (hasContractionLogs && fiveOneOneRecheckTimerId === null) {
      fiveOneOneRecheckTimerId = setInterval(() => {
        if (state.contractions.history.length > 0) {
          renderContractionHistory();
        }
      }, 15000);
    } else if (!hasContractionLogs && fiveOneOneRecheckTimerId !== null) {
      clearInterval(fiveOneOneRecheckTimerId);
      fiveOneOneRecheckTimerId = null;
    }
  }

  /* ---------------- WIRE EVENTS & INIT ---------------- */

  function renderAll() {
    updateDateModeUI(state.profile.inputMode);
    renderProgress();
    renderKickSession();
    renderQuickKicks();
    renderKickHistory();
    renderContractionTimer();
    renderContractionHistory();
    renderJournalEntries();
    syncWeightInputsFromState();
    renderWeightTracker();
    renderAppointments();
    renderDoulaChat();
    renderCarePlanAll(true);
    renderBirthPlanSummary();
    renderBlossomUi();
    ensureLiveTicker();
  }

  function focusDateSetupCard() {
    switchTab('progress');
    const card = dom.dateSetupCard || $('date-setup-card');
    if (card) {
      if (typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      card.classList.remove('is-highlighted');
      void card.offsetWidth;
      card.classList.add('is-highlighted');
      if (dateHighlightTimerId) clearTimeout(dateHighlightTimerId);
      dateHighlightTimerId = setTimeout(() => {
        card.classList.remove('is-highlighted');
        dateHighlightTimerId = null;
      }, 1800);
    }
    if (dom.primaryDateInput) {
      try {
        dom.primaryDateInput.focus({ preventScroll: true });
      } catch (_) {
        dom.primaryDateInput.focus();
      }
    }
  }

  function bindEvents() {
    if (dom.headerStageBadge) {
      dom.headerStageBadge.addEventListener('click', focusDateSetupCard);
    }

    dom.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Progress & Milestones
    dom.dateModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => updateDateModeUI(btn.dataset.dateMode));
    });
    dom.dateSetupForm.addEventListener('submit', handleDateSubmit);
    dom.clearDateBtn.addEventListener('click', handleClearDate);
    dom.cycleLengthInput.addEventListener('blur', () => {
      dom.cycleLengthInput.value = getCycleInputOrDefault();
    });

    function stepMilestoneWeek(delta) {
      const stats = getCurrentStats();
      if (!stats || !stats.valid) return;
      const base = previewMilestoneWeek !== null ? previewMilestoneWeek : Math.max(4, Math.min(42, stats.weeks));
      const next = Math.max(4, Math.min(42, base + delta));
      if (next !== base) {
        previewMilestoneWeek = next;
        renderMilestoneCard(stats.weeks);
      }
    }

    dom.milestonePrevWeek.addEventListener('click', () => stepMilestoneWeek(-1));
    dom.milestoneNextWeek.addEventListener('click', () => stepMilestoneWeek(1));

    dom.milestoneResetWeek.addEventListener('click', () => {
      const stats = getCurrentStats();
      if (!stats || !stats.valid) return;
      previewMilestoneWeek = null;
      renderMilestoneCard(stats.weeks);
    });

    if (dom.milestoneImage) {
      dom.milestoneImage.addEventListener('error', () => {
        if (dom.milestoneImage.dataset.fallbackApplied === '1') return;
        dom.milestoneImage.dataset.fallbackApplied = '1';
        dom.milestoneImage.src = getMilestoneSvgDataUri(dom.milestoneImage.dataset.fallbackIcon);
      });
    }

    // Kick Counter
    dom.kickModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => switchKickMode(btn.dataset.kickMode));
    });
    dom.kickSessionTapBtn.addEventListener('click', handleKickSessionTap);
    dom.kickUndoBtn.addEventListener('click', handleKickUndo);
    dom.kickFinishBtn.addEventListener('click', handleKickFinish);
    dom.kickDiscardBtn.addEventListener('click', handleKickDiscard);

    dom.quickKickAdd.addEventListener('click', () => {
      triggerHaptic(15);
      state.kicks.quickCount += 1;
      persist();
      renderQuickKicks();
    });

    dom.quickKickReset.addEventListener('click', () => {
      state.kicks.quickCount = 0;
      persist();
      renderQuickKicks();
    });

    dom.clearKickHistoryBtn.addEventListener('click', () => {
      state.kicks.sessions = [];
      persist();
      renderKickHistory();
      showToast('Kick history cleared');
    });

    // Contraction Timer & 5-1-1 Alert
    dom.contractionIntensityGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-intensity]');
      if (!chip) return;
      const val = chip.dataset.intensity;
      selectedIntensity = selectedIntensity === val ? '' : val;
      dom.contractionIntensityGroup.querySelectorAll('.choice-chip').forEach((btn) => {
        btn.classList.toggle('is-selected', btn.dataset.intensity === selectedIntensity);
      });
    });

    dom.contractionToggleBtn.addEventListener('click', handleContractionToggle);

    dom.clearContractionsBtn.addEventListener('click', () => {
      state.contractions.history = [];
      state.contractions.dismissedAlertClusterMs = null;
      persist();
      ensureLiveTicker();
      renderContractionHistory();
      showToast('Contraction log cleared');
    });

    dom.callDoctorBtn.addEventListener('click', () => {
      const carePhone =
        (careContacts && careContacts.doctorPhone) ||
        state.profile.emergencyPhone ||
        (careContacts && careContacts.partnerPhone) ||
        '';
      if (carePhone && triggerDoctorCall(carePhone)) {
        return;
      }
      dom.emergencyPhoneInline.hidden = false;
      dom.inlineDoctorPhone.focus();
    });

    dom.saveInlinePhoneBtn.addEventListener('click', () => {
      const phone = dom.inlineDoctorPhone.value.trim();
      if (!phone) {
        showToast('Enter a phone number first');
        return;
      }
      state.profile.emergencyPhone = phone.slice(0, 30);
      persist();
      if (carePlan) {
        careContacts.doctorPhone = state.profile.emergencyPhone;
        careContacts = carePlan.saveCareContacts(careContacts);
        renderCareContacts(true);
      }
      dom.emergencyPhoneInline.hidden = true;
      showToast('Emergency contact saved');
      triggerDoctorCall(state.profile.emergencyPhone);
    });

    dom.dismiss511Btn.addEventListener('click', () => {
      state.contractions.dismissedAlertClusterMs = lastFiveOneOneClusterStartMs;
      persist();
      renderContractionHistory();
    });

    dom.reshow511Btn.addEventListener('click', () => {
      state.contractions.dismissedAlertClusterMs = null;
      persist();
      renderContractionHistory();
    });

    // Journal, Report & Appointments
    dom.journalMoodGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-mood]');
      if (!chip) return;
      const val = chip.dataset.mood;
      selectedMood = selectedMood === val ? '' : val;
      dom.journalMoodGroup.querySelectorAll('.choice-chip').forEach((btn) => {
        btn.classList.toggle('is-selected', btn.dataset.mood === selectedMood);
      });
    });

    dom.journalSymptomsGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-symptom]');
      if (!chip) return;
      const val = chip.dataset.symptom;
      if (selectedSymptoms.has(val)) {
        selectedSymptoms.delete(val);
        chip.classList.remove('is-selected');
      } else {
        selectedSymptoms.add(val);
        chip.classList.add('is-selected');
      }
    });

    dom.journalForm.addEventListener('submit', handleJournalSubmit);
    if (dom.babyNoteListenBtn) {
      dom.babyNoteListenBtn.addEventListener('click', handleBabyNoteListenClick);
    }
    if (dom.weightUnitGroup) {
      dom.weightUnitGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-weight-unit]');
        if (!btn) return;
        handleWeightUnitToggle(btn.dataset.weightUnit);
      });
    }
    if (dom.prePregnancyWeight) {
      dom.prePregnancyWeight.addEventListener('input', handleWeightTrackerInput);
    }
    if (dom.maternalHeight) {
      dom.maternalHeight.addEventListener('input', handleWeightTrackerInput);
    }
    dom.generateDoctorQuestionsBtn.addEventListener('click', handleGenerateDoctorQuestions);
    dom.copyDoctorQuestionsBtn.addEventListener('click', async () => {
      if (!lastGeneratedDoctorQuestions) return;
      try {
        await navigator.clipboard.writeText(lastGeneratedDoctorQuestions);
        showToast('Questions copied');
      } catch (_) {
        showToast('Copy not permitted in this browser context');
      }
    });
    dom.openQuestionsInDoulaBtn.addEventListener('click', () => {
      switchTab('doula');
    });
    dom.exportReportBtn.addEventListener('click', handleExportPdfReport);
    dom.appointmentForm.addEventListener('submit', handleAppointmentSubmit);

    // AI Doula Companion
    dom.doulaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = dom.doulaInput.value.trim();
      if (!text || isDoulaBusy) return;
      dom.doulaInput.value = '';
      await sendDoulaMessage(text);
    });

    dom.doulaQuickPrompts.addEventListener('click', async (e) => {
      const chip = e.target.closest('[data-prompt-type]');
      if (!chip || isDoulaBusy) return;
      const type = chip.dataset.promptType;
      const question = getQuickPromptQuestion(type);
      if (!question) return;
      await sendDoulaMessage(question, {
        intent: type === 'ob-questions' ? 'doctor-questions' : 'chat'
      });
    });

    dom.doulaClearBtn.addEventListener('click', () => {
      state.ai.chatHistory = [];
      persist();
      renderDoulaChat();
      showToast('Chat cleared');
    });

    // Settings Modal
    dom.openSettingsBtn.addEventListener('click', openSettingsModal);
    dom.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === dom.settingsModal) closeSettingsModal();
    });

    // Emergency & Care Plan Sheet
    if (dom.openCarePlanBtn) {
      dom.openCarePlanBtn.addEventListener('click', () => openCarePlanModal());
    }
    if (dom.dashboardOpenCarePlanBtn) {
      dom.dashboardOpenCarePlanBtn.addEventListener('click', () => openCarePlanModal());
    }
    if (dom.dashboardRedFlagsBtn) {
      dom.dashboardRedFlagsBtn.addEventListener('click', () => openCarePlanModal('red-flag-guide-card'));
    }
    if (dom.closeCarePlanBtn) {
      dom.closeCarePlanBtn.addEventListener('click', closeCarePlanModal);
    }
    if (dom.carePlanModal) {
      dom.carePlanModal.addEventListener('click', (e) => {
        if (e.target === dom.carePlanModal) closeCarePlanModal();
      });
    }
    if (dom.careJumpNav) {
      dom.careJumpNav.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-care-jump]');
        if (!btn) return;
        scrollToCareSection(btn.dataset.careJump);
      });
    }
    [
      dom.careDoctorName,
      dom.careClinicName,
      dom.careDoctorPhone,
      dom.carePartnerName,
      dom.carePartnerPhone
    ].forEach((inputEl) => {
      if (inputEl) {
        inputEl.addEventListener('input', handleCareContactInput);
      }
    });
    if (dom.dashboardCallDoctorLink) {
      dom.dashboardCallDoctorLink.addEventListener('click', (e) => {
        handleTelLinkClick(
          e,
          dom.careDoctorPhone,
          'care-contacts-card',
          'Add your OB-GYN or clinic phone number first'
        );
      });
    }
    if (dom.careCallDoctorLink) {
      dom.careCallDoctorLink.addEventListener('click', (e) => {
        handleTelLinkClick(
          e,
          dom.careDoctorPhone,
          'care-contacts-card',
          'Enter a direct OB-GYN or clinic phone number above'
        );
      });
    }
    if (dom.careCallEmergencyLink) {
      dom.careCallEmergencyLink.addEventListener('click', (e) => {
        handleTelLinkClick(
          e,
          dom.carePartnerPhone,
          'care-contacts-card',
          'Enter an emergency or partner phone number above'
        );
      });
    }
    if (dom.guideCallCareTeamLink) {
      dom.guideCallCareTeamLink.addEventListener('click', (e) => {
        handleTelLinkClick(
          e,
          dom.careDoctorPhone,
          'care-contacts-card',
          'Save a care team or emergency phone number to call directly'
        );
      });
    }
    if (dom.hospitalBagCustomForm) {
      dom.hospitalBagCustomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!carePlan) return;
        const result = carePlan.addCustomHospitalBagItem(
          hospitalBagItems,
          dom.bagCustomItemInput.value,
          dom.bagCustomCategory ? dom.bagCustomCategory.value : 'mom'
        );
        if (!result.added) {
          showToast(result.error || 'Enter an item name first');
          return;
        }
        hospitalBagItems = carePlan.saveHospitalBag(result.items);
        dom.bagCustomItemInput.value = '';
        renderHospitalBag();
        showToast('Item added to hospital bag');
      });
    }

    if (dom.progressExportReportBtn) {
      dom.progressExportReportBtn.addEventListener('click', handleExportPdfReport);
    }
    if (dom.careExportReportBtn) {
      dom.careExportReportBtn.addEventListener('click', handleExportPdfReport);
    }
    if (dom.closeReportPreviewBtn) {
      dom.closeReportPreviewBtn.addEventListener('click', closeReportPreviewModal);
    }
    if (dom.dismissReportPreviewBtn) {
      dom.dismissReportPreviewBtn.addEventListener('click', closeReportPreviewModal);
    }
    if (dom.printDoctorReportBtn) {
      dom.printDoctorReportBtn.addEventListener('click', () => {
        if (blossomMod && !blossomMod.isBlossomUnlocked()) {
          handleExportPdfReport();
          return;
        }
        renderDoctorReport();
        window.print();
      });
    }
    if (dom.reportPreviewModal) {
      dom.reportPreviewModal.addEventListener('click', (e) => {
        if (e.target === dom.reportPreviewModal) closeReportPreviewModal();
      });
    }

    // Interactive Birth Plan Builder
    if (dom.dashboardOpenBirthPlanBtn) {
      dom.dashboardOpenBirthPlanBtn.addEventListener('click', openBirthPlanModal);
    }
    if (dom.careOpenBirthPlanBtn) {
      dom.careOpenBirthPlanBtn.addEventListener('click', openBirthPlanModal);
    }
    if (dom.dashboardExportBirthPlanBtn) {
      dom.dashboardExportBirthPlanBtn.addEventListener('click', handleExportBirthPlanPdf);
    }
    if (dom.careExportBirthPlanBtn) {
      dom.careExportBirthPlanBtn.addEventListener('click', handleExportBirthPlanPdf);
    }
    if (dom.exportBirthPlanPdfBtn) {
      dom.exportBirthPlanPdfBtn.addEventListener('click', handleExportBirthPlanPdf);
    }
    if (dom.closeBirthPlanBtn) {
      dom.closeBirthPlanBtn.addEventListener('click', closeBirthPlanModal);
    }
    if (dom.birthPlanModal) {
      dom.birthPlanModal.addEventListener('click', (e) => {
        if (e.target === dom.birthPlanModal) closeBirthPlanModal();
      });
    }
    if (dom.birthPlanNotes && birthPlanMod) {
      dom.birthPlanNotes.addEventListener('input', () => {
        birthPlan = birthPlanMod.saveBirthPlan({
          ...birthPlan,
          specialNotes: dom.birthPlanNotes.value
        });
        if (dom.birthPlanSaveStatus) dom.birthPlanSaveStatus.textContent = 'Saved offline';
        renderBirthPlanSummary();
      });
    }
    if (dom.resetBirthPlanBtn && birthPlanMod) {
      dom.resetBirthPlanBtn.addEventListener('click', () => {
        birthPlan = birthPlanMod.clearBirthPlanStorage();
        if (dom.birthPlanNotes) dom.birthPlanNotes.value = '';
        renderBirthPlanCategories();
        renderBirthPlanSummary();
        showToast('Birth plan preferences cleared');
      });
    }

    // BellyHaven Blossom Paywall
    if (dom.settingsUpgradeBlossomBtn) {
      dom.settingsUpgradeBlossomBtn.addEventListener('click', () => {
        openBlossomPaywall('');
      });
    }
    if (dom.closeBlossomBtn) {
      dom.closeBlossomBtn.addEventListener('click', () => closeBlossomPaywall());
    }
    if (dom.blossomMaybeLaterBtn) {
      dom.blossomMaybeLaterBtn.addEventListener('click', () => closeBlossomPaywall());
    }
    if (dom.blossomPaywallModal) {
      dom.blossomPaywallModal.addEventListener('click', (e) => {
        if (e.target === dom.blossomPaywallModal) closeBlossomPaywall();
      });
    }
    if (dom.blossomPlanSelector) {
      dom.blossomPlanSelector.addEventListener('click', (e) => {
        const card = e.target.closest('[data-blossom-plan]');
        if (!card) return;
        triggerHaptic(15);
        selectBlossomPlan(card.dataset.blossomPlan);
      });
    }

    // Haven Sound Machine
    if (dom.openSoundMachineBtn) {
      dom.openSoundMachineBtn.addEventListener('click', openSoundMachineModal);
    }
    if (dom.timerOpenSoundBtn) {
      dom.timerOpenSoundBtn.addEventListener('click', openSoundMachineModal);
    }
    if (dom.soundBarOpenBtn) {
      dom.soundBarOpenBtn.addEventListener('click', openSoundMachineModal);
    }
    if (dom.soundBarPauseBtn && soundEngine) {
      dom.soundBarPauseBtn.addEventListener('click', () => soundEngine.pause());
    }
    if (dom.closeSoundModalBtn) {
      dom.closeSoundModalBtn.addEventListener('click', closeSoundMachineModal);
    }
    if (dom.soundMachineModal) {
      dom.soundMachineModal.addEventListener('click', (e) => {
        if (e.target === dom.soundMachineModal) closeSoundMachineModal();
      });
    }
    if (dom.soundModeGroup && soundEngine) {
      dom.soundModeGroup.addEventListener('click', (e) => {
        const card = e.target.closest('[data-sound-mode]');
        if (!card) return;
        soundEngine.setMode(card.dataset.soundMode);
      });
    }
    if (dom.soundPlayToggleBtn && soundEngine) {
      dom.soundPlayToggleBtn.addEventListener('click', () => {
        soundEngine.toggle();
      });
    }
    if (dom.soundVolumeSlider && soundEngine) {
      dom.soundVolumeSlider.addEventListener('input', () => {
        soundEngine.setVolume((Number(dom.soundVolumeSlider.value) || 0) / 100);
      });
    }
    if (dom.soundTimerGroup && soundEngine) {
      dom.soundTimerGroup.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-sleep-min]');
        if (!chip) return;
        soundEngine.setSleepTimerMinutes(chip.dataset.sleepMin);
      });
    }

    // Partner Share
    if (dom.openPartnerShareBtn) {
      dom.openPartnerShareBtn.addEventListener('click', openPartnerShareModal);
    }
    if (dom.closePartnerShareBtn) {
      dom.closePartnerShareBtn.addEventListener('click', closePartnerShareModal);
    }
    if (dom.partnerShareModal) {
      dom.partnerShareModal.addEventListener('click', (e) => {
        if (e.target === dom.partnerShareModal) closePartnerShareModal();
      });
    }
    if (dom.partnerUpdateText) {
      dom.partnerUpdateText.addEventListener('input', () => {
        updatePartnerWhatsappHref(dom.partnerUpdateText.value);
      });
    }
    if (dom.partnerNativeShareBtn) {
      dom.partnerNativeShareBtn.addEventListener('click', handlePartnerNativeShare);
    }
    if (dom.partnerCopyBtn) {
      dom.partnerCopyBtn.addEventListener('click', async () => {
        const msg = dom.partnerUpdateText ? dom.partnerUpdateText.value : '';
        const ok = await copyTextWithFallback(msg);
        showToast(ok ? 'Partner update copied!' : 'Select and copy the message above');
      });
    }
    if (dom.partnerRefreshDraftBtn) {
      dom.partnerRefreshDraftBtn.addEventListener('click', () => {
        const fresh = buildPartnerUpdateMessage();
        if (dom.partnerUpdateText) dom.partnerUpdateText.value = fresh;
        updatePartnerWhatsappHref(fresh);
        showToast('Draft refreshed with latest metrics');
      });
    }

    // Trimester Milestone Celebration Modal
    if (dom.closeCelebrationBtn) {
      dom.closeCelebrationBtn.addEventListener('click', closeCelebrationModal);
    }
    if (dom.celebrationShareBtn) {
      dom.celebrationShareBtn.addEventListener('click', () => {
        closeCelebrationModal();
        openPartnerShareModal();
      });
    }
    if (dom.celebrationModal) {
      dom.celebrationModal.addEventListener('click', (e) => {
        if (e.target === dom.celebrationModal) closeCelebrationModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.blossomPaywallModal && !dom.blossomPaywallModal.hidden) {
          closeBlossomPaywall();
        } else if (dom.birthPlanModal && !dom.birthPlanModal.hidden) {
          closeBirthPlanModal();
        } else if (dom.celebrationModal && !dom.celebrationModal.hidden) {
          closeCelebrationModal();
        } else if (dom.partnerShareModal && !dom.partnerShareModal.hidden) {
          closePartnerShareModal();
        } else if (dom.reportPreviewModal && !dom.reportPreviewModal.hidden) {
          closeReportPreviewModal();
        } else if (dom.soundMachineModal && !dom.soundMachineModal.hidden) {
          closeSoundMachineModal();
        } else if (dom.carePlanModal && !dom.carePlanModal.hidden) {
          closeCarePlanModal();
        } else if (!dom.settingsModal.hidden) {
          closeSettingsModal();
        }
      }
    });

    function handleSaveSettingsName() {
      if (!dom.settingsUserName) return;
      const saved = saveUserNamePreference(dom.settingsUserName.value);
      syncUserNameInputs(saved);
      if (speechReader && speechReader.isSpeaking()) {
        speechReader.stop();
        setBabyNoteListenState('idle');
      }
      renderGreetingBanner();
      if (activeNoteWeek !== null) {
        renderBabyNoteCard(activeNoteWeek);
      }
      showToast(saved ? `Name updated to ${saved}` : 'Saved name cleared');
    }

    if (dom.saveUserNameBtn) {
      dom.saveUserNameBtn.addEventListener('click', handleSaveSettingsName);
    }
    if (dom.settingsUserName) {
      dom.settingsUserName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveSettingsName();
        }
      });
    }

    dom.saveDoctorPhoneBtn.addEventListener('click', () => {
      state.profile.emergencyPhone = dom.settingsDoctorPhone.value.trim().slice(0, 30);
      persist();
      if (carePlan) {
        careContacts.doctorPhone = state.profile.emergencyPhone;
        careContacts = carePlan.saveCareContacts(careContacts);
        renderCareContacts(true);
      }
      showToast(state.profile.emergencyPhone ? 'Emergency contact saved' : 'Emergency contact cleared');
    });

    dom.exportJsonBtn.addEventListener('click', () => {
      const dateTag = calc.formatLocalDateISO(new Date());
      downloadFile(
        `bellyhaven-backup-${dateTag}.json`,
        store.exportBackupJson(state),
        'application/json'
      );
      showToast('JSON backup downloaded');
    });

    dom.importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = store.parseImportedBackup(String(reader.result || ''));
        if (!result.ok) {
          showToast(result.error);
          return;
        }
        state = result.state;
        if (state.ai && !state.ai.apiKey) {
          state.ai.provider = 'offline';
        }
        previewMilestoneWeek = null;
        lastRenderedMilestoneWeek = null;
        persist();
        renderAll();
        closeSettingsModal();
        showToast('Backup restored');
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    dom.exportCsvBtn.addEventListener('click', () => {
      const dateTag = calc.formatLocalDateISO(new Date());
      const csv = store.buildVisitSummaryCsv(state, getCurrentStats());
      downloadFile(
        `bellyhaven-visit-summary-${dateTag}.csv`,
        csv,
        'text/csv;charset=utf-8'
      );
      showToast('Visit summary CSV downloaded');
    });

    dom.resetAllBtn.addEventListener('click', () => {
      dom.resetConfirmBox.hidden = false;
    });
    dom.confirmResetNo.addEventListener('click', () => {
      dom.resetConfirmBox.hidden = true;
    });
    dom.confirmResetYes.addEventListener('click', () => {
      state = store.clearAllState();
      if (carePlan) {
        carePlan.clearCarePlanStorage();
        careContacts = carePlan.createDefaultContacts();
        hospitalBagItems = carePlan.createDefaultHospitalBag();
      }
      if (birthPlanMod) {
        birthPlan = birthPlanMod.clearBirthPlanStorage();
      }
      if (soundEngine) {
        soundEngine.pause();
      }
      if (speechReader) {
        speechReader.stop();
        setBabyNoteListenState(false);
      }
      try {
        localStorage.removeItem(CELEBRATION_STORAGE_KEY);
      } catch (_) {}
      previewMilestoneWeek = null;
      lastRenderedMilestoneWeek = null;
      selectedMood = '';
      selectedIntensity = '';
      selectedSymptoms.clear();
      dom.journalMoodGroup.querySelectorAll('.choice-chip').forEach((c) => c.classList.remove('is-selected'));
      dom.journalSymptomsGroup.querySelectorAll('.choice-chip').forEach((c) => c.classList.remove('is-selected'));
      dom.contractionIntensityGroup.querySelectorAll('.choice-chip').forEach((c) => c.classList.remove('is-selected'));
      dom.primaryDateInput.value = '';
      dom.cycleLengthInput.value = 28;
      syncUserNameInputs('');
      dom.aiDoctorQuestionsCard.hidden = true;
      lastGeneratedDoctorQuestions = '';
      renderAll();
      closeSettingsModal();
      showToast('All data cleared');
    });
  }

  function init() {
    cacheDom();
    if (state.ai && !state.ai.apiKey) {
      state.ai.provider = 'offline';
    }
    initCarePlanSync();
    if (soundEngine) {
      soundEngine.subscribe(renderSoundMachineUi);
      renderSoundMachineUi(soundEngine.getSnapshot());
    }
    try {
      if (localStorage.getItem('bellyhaven_cycle_length') === '21') {
        localStorage.removeItem('bellyhaven_cycle_length');
      }
      const savedCycle = parseInt(localStorage.getItem('bellyhaven_cycle_length'), 10);
      const initialCycle = (!isNaN(savedCycle) && savedCycle >= 20 && savedCycle <= 45)
        ? savedCycle
        : (state.profile.cycleLength || 28);
      state.profile.cycleLength = initialCycle;
      dom.cycleLengthInput.value = initialCycle;
    } catch (_) {
      dom.cycleLengthInput.value = 28;
    }
    const todayIso = calc.formatLocalDateISO(new Date());
    dom.journalDate.value = todayIso;
    dom.journalDate.max = todayIso;
    setupPwaInstall();
    bindEvents();
    initGyroscopicMilestoneTilt();
    renderAll();
    checkMilestoneCelebration(getCurrentStats());
    registerServiceWorkerIfSupported();
  }

  document.addEventListener('DOMContentLoaded', init);
})(
  window.PregnancyCalc,
  window.PregnancyStorage,
  window.PregnancyDoula,
  window.BellyHavenCarePlan,
  window.BellyHavenSoundMachine,
  window.BellyHavenBabyNotes,
  window.BellyHavenWeightTracker,
  window.BellyHavenBirthPlan,
  window.BellyHavenBlossom
);
