# Feature: Onboarding

First-run flow handling role selection, diagnosis, mood introduction, medication setup, and safety network. Both patient and companion paths start here from the same Equi app.

← [Design index](../wireframes.md)

---

## Patient Path

<details>
<summary>View wireframes (Splash + 5 slides)</summary>

**Splash**
```
┌─────────────────────────────┐
│                             │
│        🌊 (ocean wave)      │
│        gentle animation     │
│                             │
│           E Q U I           │
│    ─────────────────────    │
│    Finding your equilibrium │
│                             │
│    ┌─────────────────────┐  │
│    │     Get Started     │  │  ← Sage Green
│    └─────────────────────┘  │
│                             │
│     Already have account?   │
│           Sign in           │
│                             │
└─────────────────────────────┘
```

**Role selection — Who is this account for?** *(no progress dots)*
```
┌─────────────────────────────┐
│                             │
│           E Q U I           │
│    Finding your equilibrium │
│                             │
│    Who is this account for? │
│                             │
│  ┌─────────────────────────┐│
│  │  🧠 I live with bipolar ││  ← patient path → Slides 1–5
│  │     disorder            ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  💜 I'm supporting      ││  ← companion path → see below
│  │     someone who does    ││
│  └─────────────────────────┘│
│                             │
│  Not sure yet? You can      │
│  switch in Settings later   │
│                             │
└─────────────────────────────┘
```
> Both paths use the same Equi app. Selection determines which onboarding flow and home view is shown. Companion users get a read/write companion experience — they see what the patient shares and can send messages and check-ins from within the app.

**Slide 1 — Your diagnosis**
```
┌─────────────────────────────┐
│  ●  ○  ○  ○  ○              │
│                             │
│    What's your diagnosis?   │
│                             │
│  ┌─────────────────────────┐│
│  │  Bipolar I              ││  ← selectable chips
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Bipolar II             ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Cyclothymia            ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Not sure / exploring   ││
│  └─────────────────────────┘│
│                             │
│  This helps personalize     │
│  your experience            │
└─────────────────────────────┘
```

**Slide 2 — How are you feeling right now?**
```
┌─────────────────────────────┐
│  ○  ●  ○  ○  ○              │
│                             │
│  How are you feeling        │
│  right now?                 │
│                             │
│  Tap the one that fits      │
│                             │
│   😔    😐    🙂    😊    ⚡ │
│  1–2   3–4   5–6   7–8  9–10│
│                             │
│  This is how you'll log     │
│  your mood every day —      │
│  quick, no judgment.        │
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```
> First use of the standardized 10-point scale. The emoji row is identical to what appears on the Home screen daily — users learn it once here.

**Slide 4 — Medication**
```
┌─────────────────────────────┐
│  ○  ○  ○  ●  ○              │
│                             │
│  Are you currently taking   │
│  medication for bipolar     │
│  disorder?                  │
│                             │
│  ┌─────────────────────────┐│
│  │  Yes, I'm on medication ││  ← selectable
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  No, not currently      ││
│  └─────────────────────────┘│
│                             │
│  ── if "Yes" selected ──    │
│                             │
│  Track your medication      │
│  adherence in Equi?         │
│  ┌─────────────────────────┐│
│  │  Yes, track my meds     ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Not now                ││
│  └─────────────────────────┘│
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```
> **No** → medication section hidden entirely (toggle available in Settings anytime). **Yes + track** → medication check-in appears in DAILY CHECK-INS on Home; Medication Adherence accessible from Profile. **Yes + not now** → section hidden; one-tap toggle in Settings to enable later.

**Slide 5 — Safety setup**
```
┌─────────────────────────────┐
│  ○  ○  ○  ○  ●              │
│                             │
│  Your support network       │
│  (all optional)             │
│                             │
│  ── EMERGENCY CONTACTS ──   │
│  Called when you tap SOS    │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Name               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📞  Phone number       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Relationship         ▼ ││  ← Parent / Guardian /
│  └─────────────────────────┘│     Spouse / Sibling
│   [ + Add emergency contact]│
│                             │
│  ── SOCIAL CONTACTS ──      │
│  Reach out when you feel    │
│  lonely or stuck            │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Name               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📞  Phone number       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Who are they?        ▼ ││  ← Friend / Coworker /
│  └─────────────────────────┘│     Support group /
│   [ + Add social contact ]  │     Therapist / Other
│                             │
│   ┌─────────────────────┐   │
│   │     Enter Equi      │   │
│   └─────────────────────┘   │
│         Skip for now        │
└─────────────────────────────┘
```

</details>

---

## Companion Path

Triggered when user selects "I'm supporting someone" on the role selection screen. 3-slide flow then lands on the companion home view.

<details>
<summary>View wireframes (3 slides)</summary>

**Companion Slide 1 — Who are you supporting?**
```
┌─────────────────────────────┐
│  ●  ○  ○                    │
│                             │
│        💜  illustration     │
│                             │
│    Who are you supporting?  │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Their name         ││
│  └─────────────────────────┘│
│                             │
│  Your relationship          │
│  ┌─────────────────────────┐│
│  │  Partner              ▼ ││  ← Partner / Parent /
│  └─────────────────────────┘│     Sibling / Friend /
│                             │     Therapist / Other
│  You'll send them a         │
│  connection request.        │
│  They must accept in        │
│  their Equi app.            │
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```

**Companion Slide 2 — What you'll see**
```
┌─────────────────────────────┐
│  ○  ●  ○                    │
│                             │
│  Here's how Equi works      │
│  for supporters             │
│                             │
│  ✅ See what they share     │
│  with you — mood updates,   │
│  journal entries, reports   │
│                             │
│  ✅ Send messages and       │
│  check-ins directly from    │
│  the app                    │
│                             │
│  ✅ Get notified if they    │
│  need extra support         │
│  (if they enable this)      │
│                             │
│  ❌ You only ever see       │
│  what they choose to        │
│  share — nothing more       │
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```

**Companion Slide 3 — Send a connection request**
```
┌─────────────────────────────┐
│  ○  ○  ●                    │
│                             │
│  Send a connection          │
│  request to Owais           │
│                             │
│  How would you like to      │
│  invite them?               │
│                             │
│  ┌─────────────────────────┐│
│  │  📱  Send via text      ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📧  Send via email     ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  🔗  Copy invite link   ││
│  └─────────────────────────┘│
│                             │
│  They'll get a notification │
│  in their Equi app to       │
│  accept or decline.         │
│                             │
│   ┌─────────────────────┐   │
│   │  Send & Enter Equi  │   │
│   └─────────────────────┘   │
│       Skip for now          │
└─────────────────────────────┘
```
> Connection requests must be accepted by the patient. Until accepted, the companion home shows a "Pending connection" state. The patient controls all data sharing from the Support Network screen after accepting.

</details>
