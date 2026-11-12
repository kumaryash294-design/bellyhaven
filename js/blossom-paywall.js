(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.BellyHavenBlossom = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const PRO_KEY = 'bellyhaven_pro';
  const UNLOCK_KEY = 'bellyhaven_blossom_unlocked';
  const RECEIPT_KEY = 'bellyhaven_blossom_receipt';
  const FREE_EXPORT_KEY = 'bellyhaven_free_export_used';
  const FREE_PDF_USED_KEY = 'bellyhaven_free_pdf_used';
  const AI_USAGE_KEY = 'bellyhaven_ai_daily_usage';
  const AI_DAILY_LIMIT = 3;

  // PayPal Standard, Apple Pay, Google Pay, Venmo, Pay Later + Credit/Debit Card guest checkout
  const PAYPAL_CONFIG = {
    clientId: 'ARtJDzAM7oxMhKcZdH3pl3f3Zy6OpKUFG_ZQpIeXGJ19_35ZSyNP-6JR9PTMkNxNLJJTBUP2YEOJwwdq',
    currency: 'USD',
    components: 'buttons,applepay,googlepay',
    enableFunding: 'card,venmo,paylater',
    sdkBaseUrl: 'https://www.paypal.com/sdk/js'
  };

  const PLANS = {
    monthly: {
      id: 'monthly',
      title: 'Monthly Flexibility',
      badge: 'Flexible',
      amount: '4.99',
      currency: 'USD',
      priceDisplay: '$4.99 / month',
      strikeDisplay: '',
      checkoutLabel: 'Monthly Flexibility — $4.99 USD / Month',
      paypalDescription: 'BellyHaven Blossom Monthly Flexibility',
      description: 'Billed monthly. Cancel anytime.',
      anchorNote: '~$47 over a full term.'
    },
    onetime: {
      id: 'onetime',
      title: 'Full Journey Pass',
      badge: 'Save ~58% • Most Popular',
      amount: '19.99',
      currency: 'USD',
      priceDisplay: '$19.99 One-Time',
      strikeDisplay: '$47.99',
      checkoutLabel: 'Full Journey Pass — $19.99 USD One-Time',
      paypalDescription: 'BellyHaven Blossom Full Journey Pass',
      description: 'Pay once. Keep forever. Covers all 40 weeks + postpartum recovery. Zero recurring charges.',
      anchorNote: ''
    }
  };

  let sdkLoadPromise = null;

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

  function isBlossomPro() {
    const proFlag = safeGet(PRO_KEY);
    if (proFlag === 'true') return true;
    if (proFlag === 'false') return false;
    return safeGet(UNLOCK_KEY) === 'true';
  }

  function isBlossomUnlocked() {
    return isBlossomPro();
  }

  function isUnlocked() {
    return isBlossomPro();
  }

  function getPlan(planId) {
    return planId === 'monthly' ? PLANS.monthly : PLANS.onetime;
  }

  function buildOrderPayload(planId) {
    const chosenPlan = getPlan(planId);
    return {
      purchase_units: [
        {
          description: chosenPlan.paypalDescription || `BellyHaven Blossom ${chosenPlan.title}`,
          amount: {
            currency_code: chosenPlan.currency || PAYPAL_CONFIG.currency,
            value: chosenPlan.amount
          }
        }
      ]
    };
  }

  function getReceipt() {
    const raw = safeGet(RECEIPT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function recordPurchaseUnlock(details = {}, planId = 'onetime') {
    const plan = getPlan(planId);
    const receipt = {
      orderId: details.id || details.orderID || `BH-${Date.now()}`,
      planId: plan.id,
      planTitle: plan.title,
      amount: plan.amount,
      currency: plan.currency || PAYPAL_CONFIG.currency,
      payerEmail:
        details.payer && details.payer.email_address ? String(details.payer.email_address) : '',
      unlockedAtIso: new Date().toISOString()
    };
    safeSet(PRO_KEY, 'true');
    safeSet(UNLOCK_KEY, 'true');
    safeSet(RECEIPT_KEY, JSON.stringify(receipt));
    return receipt;
  }

  function hasUsedFreeExport() {
    return safeGet(FREE_EXPORT_KEY) === 'true' || safeGet(FREE_PDF_USED_KEY) === 'true';
  }

  function consumeExportGate() {
    if (isBlossomUnlocked()) {
      return { allowed: true, unlocked: true, usedFreeTrial: false };
    }
    if (!hasUsedFreeExport()) {
      safeSet(FREE_EXPORT_KEY, 'true');
      safeSet(FREE_PDF_USED_KEY, 'true');
      return { allowed: true, unlocked: false, usedFreeTrial: true };
    }
    return { allowed: false, unlocked: false, reason: 'export-limit' };
  }

  function getLocalDateKey(todayIso) {
    if (typeof todayIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayIso)) {
      return todayIso;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function peekAiDailyUsage(todayIso) {
    const dateKey = getLocalDateKey(todayIso);
    const raw = safeGet(AI_USAGE_KEY);
    if (!raw) {
      return { date: dateKey, count: 0, limit: AI_DAILY_LIMIT, remaining: AI_DAILY_LIMIT };
    }
    try {
      const parsed = JSON.parse(raw);
      const count = parsed && parsed.date === dateKey && Number.isFinite(parsed.count)
        ? Math.max(0, Math.floor(parsed.count))
        : 0;
      return {
        date: dateKey,
        count,
        limit: AI_DAILY_LIMIT,
        remaining: Math.max(0, AI_DAILY_LIMIT - count)
      };
    } catch (_) {
      return { date: dateKey, count: 0, limit: AI_DAILY_LIMIT, remaining: AI_DAILY_LIMIT };
    }
  }

  function consumeAiQueryGate(todayIso) {
    if (isUnlocked()) {
      return { allowed: true, unlocked: true, countToday: 0, limit: AI_DAILY_LIMIT };
    }
    const current = peekAiDailyUsage(todayIso);
    if (current.count >= AI_DAILY_LIMIT) {
      return {
        allowed: false,
        unlocked: false,
        countToday: current.count,
        limit: AI_DAILY_LIMIT,
        reason: 'ai-daily-limit'
      };
    }
    const nextCount = current.count + 1;
    safeSet(AI_USAGE_KEY, JSON.stringify({ date: current.date, count: nextCount }));
    return {
      allowed: true,
      unlocked: false,
      countToday: nextCount,
      limit: AI_DAILY_LIMIT,
      remaining: Math.max(0, AI_DAILY_LIMIT - nextCount)
    };
  }

  function clearBlossomTestingState() {
    safeRemove(PRO_KEY);
    safeRemove(UNLOCK_KEY);
    safeRemove(RECEIPT_KEY);
    safeRemove(FREE_EXPORT_KEY);
    safeRemove(FREE_PDF_USED_KEY);
    safeRemove(AI_USAGE_KEY);
    return isBlossomUnlocked();
  }

  function buildPayPalSdkUrl(clientIdOverride) {
    const clientId = String(clientIdOverride || PAYPAL_CONFIG.clientId || '').trim();
    const currency = encodeURIComponent(PAYPAL_CONFIG.currency || 'USD');
    const components = PAYPAL_CONFIG.components || 'buttons,applepay,googlepay';
    const enableFunding = PAYPAL_CONFIG.enableFunding || 'card,venmo,paylater';
    return `${PAYPAL_CONFIG.sdkBaseUrl}?client-id=${encodeURIComponent(clientId)}&currency=${currency}&components=${components}&enable-funding=${enableFunding}`;
  }

  function loadPayPalSdk(clientIdOverride) {
    if (root && root.paypal && typeof root.paypal.Buttons === 'function') {
      return Promise.resolve({ status: 'ready', paypal: root.paypal });
    }

    const clientId = String(clientIdOverride || PAYPAL_CONFIG.clientId || '').trim();
    if (!clientId || clientId === 'YOUR_PAYPAL_CLIENT_ID') {
      return Promise.resolve({
        status: 'placeholder',
        message:
          'Configure your PayPal Client ID in js/blossom-paywall.js (PAYPAL_CONFIG.clientId) to enable live PayPal & Card Smart Buttons.'
      });
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return Promise.resolve({
        status: 'offline',
        message:
          'Offline mode detected. Connect to the internet to complete your BellyHaven Blossom checkout via PayPal or Credit/Debit Card.'
      });
    }

    if (typeof document === 'undefined') {
      return Promise.resolve({
        status: 'unavailable',
        message: 'Document environment unavailable.'
      });
    }

    if (sdkLoadPromise) {
      return sdkLoadPromise;
    }

    sdkLoadPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[data-bellyhaven-paypal-sdk="1"]');
      if (existing) {
        if (root && root.paypal && typeof root.paypal.Buttons === 'function') {
          resolve({ status: 'ready', paypal: root.paypal });
          return;
        }
        existing.addEventListener('load', () => {
          resolve(
            root && root.paypal
              ? { status: 'ready', paypal: root.paypal }
              : { status: 'error', message: 'PayPal SDK loaded without Buttons API.' }
          );
        });
        existing.addEventListener('error', () => {
          sdkLoadPromise = null;
          resolve({
            status: 'error',
            message: 'Unable to reach PayPal checkout right now. Please verify your connection.'
          });
        });
        return;
      }

      const script = document.createElement('script');
      script.src = buildPayPalSdkUrl(clientId);
      script.async = true;
      script.dataset.bellyhavenPaypalSdk = '1';

      script.onload = () => {
        if (root && root.paypal && typeof root.paypal.Buttons === 'function') {
          resolve({ status: 'ready', paypal: root.paypal });
        } else {
          sdkLoadPromise = null;
          resolve({
            status: 'error',
            message: 'PayPal Smart Buttons failed to initialize. Check your PayPal Client ID.'
          });
        }
      };

      script.onerror = () => {
        sdkLoadPromise = null;
        resolve({
          status: 'error',
          message: 'Unable to load PayPal Smart Buttons. Check your connection or Client ID.'
        });
      };

      document.head.appendChild(script);
    });

    return sdkLoadPromise;
  }

  async function renderPayPalButtons(options = {}) {
    const container =
      typeof options.container === 'string' && typeof document !== 'undefined'
        ? document.querySelector(options.container)
        : options.container;
    const statusEl = options.statusEl || null;
    const getSelectedPlanId =
      typeof options.getSelectedPlanId === 'function' ? options.getSelectedPlanId : () => 'onetime';
    const onSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : () => {};
    const onError = typeof options.onError === 'function' ? options.onError : () => {};

    if (!container) {
      return { status: 'missing-container' };
    }

    container.innerHTML = '';
    if (statusEl) {
      statusEl.textContent = 'Preparing encrypted PayPal, Apple/Google Pay, Venmo & Card checkout...';
      statusEl.classList.remove('is-error');
    }

    const sdkResult = await loadPayPalSdk(options.clientId);
    if (sdkResult.status !== 'ready') {
      if (statusEl) {
        statusEl.textContent = sdkResult.message;
        statusEl.classList.add('is-error');
      }
      const fallbackCard = document.createElement('div');
      fallbackCard.className = 'paypal-fallback-card';
      const title = document.createElement('p');
      title.className = 'paypal-fallback-title';
      title.textContent =
        sdkResult.status === 'offline'
          ? 'Checkout Paused Offline'
          : 'PayPal & Card Checkout Ready for Client ID';
      const desc = document.createElement('p');
      desc.className = 'paypal-fallback-desc';
      desc.textContent = sdkResult.message;
      const devHint = document.createElement('p');
      devHint.className = 'paypal-fallback-hint';
      devHint.textContent = 'Sandbox testing shortcut: run window.__unlockBellyHaven() in DevTools Console.';
      fallbackCard.appendChild(title);
      fallbackCard.appendChild(desc);
      fallbackCard.appendChild(devHint);
      container.appendChild(fallbackCard);
      return sdkResult;
    }

    const activePlan = getPlan(getSelectedPlanId());
    if (statusEl) {
      statusEl.textContent = `PayPal, Venmo, Apple/Google Pay & Card · $${activePlan.amount} USD`;
      statusEl.classList.remove('is-error');
    }

    try {
      const buttons = sdkResult.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'pill',
          label: 'paypal',
          height: 44
        },
        createOrder: (_data, actions) => {
          return actions.order.create(buildOrderPayload(getSelectedPlanId()));
        },
        onApprove: async (data, actions) => {
          const captureDetails = await actions.order.capture();
          const chosenPlanId = getSelectedPlanId();
          const receipt = recordPurchaseUnlock(
            { ...(captureDetails || {}), orderID: data && data.orderID },
            chosenPlanId
          );
          onSuccess(receipt, captureDetails);
        },
        onCancel: () => {
          if (statusEl) {
            statusEl.textContent = 'Checkout cancelled — choose a plan anytime to continue.';
          }
        },
        onError: (err) => {
          if (statusEl) {
            statusEl.textContent = 'PayPal encountered an issue processing checkout. Please retry.';
            statusEl.classList.add('is-error');
          }
          onError(err);
        }
      });

      if (buttons && typeof buttons.render === 'function') {
        await buttons.render(container);
      }
      return { status: 'rendered', plan: activePlan };
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Unable to render PayPal Smart Buttons. Please retry.';
        statusEl.classList.add('is-error');
      }
      onError(err);
      return { status: 'render-error', error: err };
    }
  }

  // Expose developer & QA sandbox bypass and reset helpers globally
  if (root) {
    root.isBlossomPro = isBlossomPro;
    root.isBlossomUnlocked = isBlossomUnlocked;

    root.__unlockBellyHaven = function (options = {}) {
      safeSet(PRO_KEY, 'true');
      safeSet(UNLOCK_KEY, 'true');
      safeSet(
        RECEIPT_KEY,
        JSON.stringify({
          orderId: `SANDBOX-${Date.now()}`,
          planId: 'onetime',
          planTitle: PLANS.onetime.title,
          amount: PLANS.onetime.amount,
          currency: PAYPAL_CONFIG.currency,
          unlockedAtIso: new Date().toISOString(),
          sandbox: true
        })
      );
      if (options.reload !== false && root.location && typeof root.location.reload === 'function') {
        root.location.reload();
      }
      return true;
    };

    root.__resetBellyHaven = function (options = {}) {
      clearBlossomTestingState();
      if (options.reload !== false && root.location && typeof root.location.reload === 'function') {
        root.location.reload();
      }
      return !isBlossomUnlocked();
    };
  }

  return {
    PRO_KEY,
    UNLOCK_KEY,
    RECEIPT_KEY,
    FREE_EXPORT_KEY,
    FREE_PDF_USED_KEY,
    AI_USAGE_KEY,
    AI_DAILY_LIMIT,
    PAYPAL_CONFIG,
    PLANS,
    isBlossomPro,
    isBlossomUnlocked,
    isUnlocked,
    getPlan,
    buildOrderPayload,
    getReceipt,
    recordPurchaseUnlock,
    hasUsedFreeExport,
    consumeExportGate,
    peekAiDailyUsage,
    consumeAiQueryGate,
    clearBlossomTestingState,
    buildPayPalSdkUrl,
    loadPayPalSdk,
    renderPayPalButtons
  };
});
