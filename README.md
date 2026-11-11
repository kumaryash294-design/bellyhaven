# BellyHaven

A private, offline-first BellyHaven Progressive Web App (PWA) built with zero external dependencies.

## Features

- **Visual Progress Dashboard & Baby Size Milestones (`Progress`)**
  - Displays a prominent dashboard card above gestational details once LMP or EDD is saved.
  - Circular SVG progress ring showing progress out of 40 weeks (e.g., `Week 24 (60%)`, `112 days remaining`) and trimester indicator badge (`1st`, `2nd`, or `3rd Trimester`).
  - Dynamic **Baby Size Milestone** card with custom vector artwork, fruit/veggie analogies (Weeks 4–42, including Week 24: Ear of Corn), dual metric/imperial length (`cm / in`) and weight (`g / oz`), and an interactive week stepper.
- **Fetal Kick Counter (`Kicks`)**
  - **Timed Session** mode ("Count to 10") with live elapsed timer, undo, per-tap timestamps, and saved history.
  - **Quick Counter** mode for a simple running total.
- **Contraction Timer & Clinical 5-1-1 Alert Engine (`Timer`)**
  - Start/stop stopwatch with optional intensity tags (`Mild`, `Moderate`, `Strong`), last-hour frequency/duration averages, and start-to-start intervals.
  - **5-1-1 Rule Monitor**: Displays a prominent accessible alert banner when active contractions occur roughly 5 minutes apart or less, lasting >= 1 minute each, sustained consistently for >= 1 full hour—with **Call Doctor / Emergency Contact** (`tel:` integration) and **Dismiss Alert** actions.
- **Prenatal Journal & Printable Doctor's Report (`Journal`)**
  - Daily check-ins for date, weight, mood, symptoms, and notes, plus an appointment checklist.
  - **Export to PDF / Share with Doctor**: Dedicated `@media print` one-page clinical summary stripping navigation bars and presenting gestational summary, recent vitals/symptoms table, and kick/contraction summaries.
- **Haven AI — 24/7 Maternity Companion (`Haven AI`)**
  - Conversational pregnancy companion with quick-prompt chips (dynamic baby size check, food safety checker, trimester sleep positions, and OB-GYN visit questions).
  - Automatically injects saved gestational stage, trimester, and last 14 days of journal symptoms into the system prompt.
  - Clinical safety guardrails: deterministic red-flag detection for urgent warning signs (bleeding, severe pain, sudden facial swelling, reduced fetal movement, high fever, fluid leakage) and mandatory closing disclaimer on every response.
  - Powered by a built-in 100% offline clinical guidance system by default, with locally persisted chat history and red-flag triage.
  - **One-Tap Doctor Questions** in the Journal tab generates 3 concise appointment questions based on the last 14 days of symptoms.
- **Emergency & Care Plan (Offline Sheet & Dashboard Card)**
  - **My Care Team & Emergency Contacts** persisted immediately to `bellyhaven_care_contacts` with one-tap `tel:` dialing for OB-GYN and emergency/partner contacts.
  - **Hospital Bag Essentials** categorized checklist (`Documents`, `For Mom`, `For Baby`, `For Partner`) with custom item support, completion progress pill, and instant persistence to `bellyhaven_hospital_bag`.
  - **Red-Flag Symptoms Clinical Guide** featuring ACOG/NHS warning sign badges, non-diagnostic disclaimer, and direct `Tap to Call Care Team` shortcut.
- **Boutique & Luxury Maternity Edition Features**
  - **Intelligent 5-1-1 Rule Labor Analyzer**: Continuously evaluates the last 60 minutes of contractions (roughly every 4–5 min, lasting 45–60s+ for >= 1 hour) and raises a high-contrast Labor Alert Banner with a one-tap **Call Care Team** shortcut.
  - **A Note from Baby (Weeks 4–40)**: Soft ivory parchment letter synced with every weekly milestone, paired with a native `window.speechSynthesis` **Listen** button calibrated for a calm pitch and rate.
  - **ACOG-Standard Maternal Weight Trajectory**: Auto-calculates baseline BMI category (`Underweight`, `Normal`, `Overweight`, `Obese`) and renders an inline SVG trajectory band plotting logged weights smoothly across 40 weeks.
  - **Gyroscopic 3D Milestone Card**: Uses passive `deviceorientation` (`<= 6deg` tilt) with a moving `radial-gradient` specular highlight for subtle glassmorphism depth.
  - **Organic Breathing Ring, Haptics & Confetti Celebrations**: Rhythmic `@keyframes maternalBreath` progress halo (`#E8B4B8`), native `navigator.vibrate(15)` haptics on kick taps/contractions/bag checks, and pastel canvas confetti celebrations at Weeks 13, 28, and 40.
  - **Haven Sound Machine (Web Audio API)**: Offline synthetic **Womb Heartbeat** (65 BPM dual-thud), filtered **Pink / White Noise**, and visual **Guided 4-7-8 Breathing Pacer** with harmonic chimes, volume slider, and 15/30 min auto-off sleep timer.
  - **Doctor Report Preview & PDF Print**: Compiles gestational stage, EDD, Care Team contacts, last-7-sessions kicks/hour, contraction logs, blood pressure/weight/symptom vitals into a preview modal and clean `@media print` report.
  - **One-Tap Partner Update Generator**: Auto-formats baby's week/size/kicks/mood into an editable card shared via Web Share API, WhatsApp URI, or clipboard.
  - **Interactive Visual Birth Plan Builder (`bellyhaven_birth_plan`)**: 16 toggle preferences across 4 categories (`Labor Atmosphere`, `Pain Management`, `Delivery Room Preferences`, `Newborn Interventions`), auto-saved labor team notes, and a 1-page `@media print` `"BellyHaven Maternal Birth Preferences"` printout with attending clinician signature line.
  - **BellyHaven Blossom ✨ Paywall & PayPal Smart Buttons**: Frosted-glass upgrade modal with dual pricing tiers (`$4.99 / month` vs `~~$47.99~~ $19.99 One-Time`), automatic gating after 1 complimentary PDF export preview or 3 daily Haven AI queries, dynamic PayPal SDK & guest Credit/Debit card checkout (`PAYPAL_CONFIG.clientId`), and `window.__unlockBellyHaven()` sandbox helper.
- **Full PWA & Offline Support**
  - `manifest.json` with `192x192` and `512x512` PNG icons plus SVG icon (`standalone` display).
  - `sw.js` Service Worker caching core assets for 100% offline use.
  - In-app **Install App** banner capturing `beforeinstallprompt`.

## How to Run

1. **Local Server (recommended for PWA & Service Worker):**
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080
   ```
   Then open http://localhost:8080/ in your browser.
2. **Direct File:** Open `index.html` directly in any modern browser.
3. **Unit Tests:** Open http://localhost:8080/tests/test-runner.html (or `tests/test-runner.html`) in your browser.

## Project Structure

```text
pregnancy-tracker/
├── index.html
├── manifest.json
├── sw.js
├── serve.ps1
├── README.md
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   └── styles.css
├── js/
│   ├── ai-doula.js
│   ├── app.js
│   ├── baby-notes.js
│   ├── birth-plan.js
│   ├── blossom-paywall.js
│   ├── calculations.js
│   ├── care-plan.js
│   ├── sound-machine.js
│   ├── storage.js
│   └── weight-tracker.js
└── tests/
    └── test-runner.html
```
