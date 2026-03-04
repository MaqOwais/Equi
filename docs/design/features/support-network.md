# Feature: Support Network

Everything related to the people around the patient — how they're invited, what they can see, how they interact. Covers well-wisher and guardian access controls (patient side) and the companion app experience (supporter side).

← [Design index](../wireframes.md)

See [docs/access/](../../access/README.md) for the full permission tables by role.

---

## Well-wisher & Guardian Access (Patient's View)

The patient manages all support connections from this screen. Two tabs: Well-wishers for friends and support people, Guardians for parents and caregivers.

<details>
<summary>View wireframes (2 tabs)</summary>

**Tab 1 — Well-wishers**
```
┌─────────────────────────────┐
│  ← My Support Network       │
│                             │
│  [Well-wishers] [Guardians] │  ← tab toggle
│                             │
│  WELL-WISHERS               │
│  People you choose to share │
│  your journey with          │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Alex (Friend)     │  │
│  │  Can see:             │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Selected journal  │  │
│  │     entries           │  │
│  │  ☐  Full journal      │  │
│  │  ☐  Cycle data        │  │
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Dr. Moore         │  │
│  │  (Therapist)          │  │
│  │  Can see:             │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Cycle data        │  │
│  │  ✅ AI Report PDF     │  │
│  │  ☐  Full journal      │  │
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  [ + Add well-wisher ]      │
│                             │
│  SHARE A MOMENT             │
│  Send a specific entry or   │
│  feeling right now          │
│                             │
│  ┌───────────────────────┐  │
│  │  📤 Share today's     │  │
│  │     mood with…        │  │
│  │  ○ Alex               │  │
│  │  ○ Dr. Moore          │  │
│  │  [ Send ]             │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

**Tab 2 — Guardians**
```
┌─────────────────────────────┐
│  ← My Support Network       │
│                             │
│  [Well-wishers] [Guardians] │
│                             │
│  GUARDIAN ACCESS            │
│  For parents or caregivers  │
│  managing high-risk states  │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Mom (Guardian)    │  │
│  │                       │  │
│  │  VIEW PERMISSIONS     │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Cycle state       │  │
│  │  ✅ AI weekly report  │  │
│  │  ✅ Activity log      │  │
│  │  ☐  Journal entries   │  │
│  │                       │  │
│  │  MANAGEMENT LEVEL     │  │
│  │  ○ View only          │  │
│  │  ● Alert if high risk │  │  ← auto-notifies guardian
│  │  ○ Full account ctrl  │  │  ← guardian can act on account
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  HIGH RISK AUTO-ALERT       │
│  ┌───────────────────────┐  │
│  │  Notify guardian when:│  │
│  │  ☑ Mood < 2/10 for    │  │
│  │    2+ consecutive days│  │
│  │  ☑ SOS button tapped  │  │
│  │  ☑ No journal entry   │  │
│  │    for 3+ days        │  │
│  │  ☑ Manic symptoms     │  │
│  │    logged for 2+ days │  │
│  └───────────────────────┘  │
│                             │
│  FULL ACCOUNT CONTROL       │
│  ┌───────────────────────┐  │
│  │  ⚠️  When enabled,    │  │
│  │  guardian can:        │  │
│  │  · Book appointments  │  │
│  │  · Contact your doctor│  │
│  │  · Pause community    │  │
│  │    access             │  │
│  │  · Add crisis contacts│  │
│  │                       │  │
│  │  You can revoke this  │  │
│  │  access at any time   │  │
│  │  when you're stable.  │  │
│  └───────────────────────┘  │
│                             │
│  [ + Add guardian ]         │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```
> Guardian "Full account control" is always revocable by the user and requires the user's initial consent to enable.

</details>

---

## Companion App (Supporter's View)

Everyone in the support network uses the same Equi app — they choose "I'm supporting someone" at role selection and get a companion home view.

### Friend / Well-wisher Home

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Hi, Ahmed              🔔  │
│  Supporting: Owais          │
│                             │
│  ┌───────────────────────┐  │
│  │  OWAIS TODAY          │  │
│  │                       │  │
│  │  Having a good day    │  │  ← simplified mood (no clinical labels)
│  │  Updated 1h ago       │  │
│  └───────────────────────┘  │
│                             │
│  SHARED WITH YOU            │
│  ┌───────────────────────┐  │
│  │  📓 Journal entry     │  │  ← entry Owais shared
│  │  Mar 1 · "Today I     │  │
│  │  actually got outside │  │
│  │  for the first time…" │  │
│  │                       │  │
│  │  💜  🙏               │  │  ← react only (no free text)
│  └───────────────────────┘  │
│                             │
│  SEND A CHECK-IN            │
│  ┌───────────────────────┐  │
│  │  💬 "Thinking of you" │  │  ← quick-send templates
│  │  💬 "How are you?"    │  │
│  │  💬 "Proud of you"    │  │
│  └───────────────────────┘  │
│  [ Write a message… ]       │
│                             │
│  🏠    💬    👤             │
│ Home  Msgs  Profile         │
└─────────────────────────────┘
```
> Friends see plain-language mood status ("Having a good day"), not clinical labels or numeric scores.

</details>

### Guardian / Parent Home

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Hi, Sarah              🔔  │
│  Supporting: Owais          │
│                             │
│  ┌───────────────────────┐  │
│  │  ⚠️ CHECK IN           │  │  ← alert banner (when triggered)
│  │  Owais has been having│  │
│  │  a difficult few days.│  │
│  │  [Call] [Message]     │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  OWAIS TODAY          │  │
│  │                       │  │
│  │  ● Stable · Day 4     │  │  ← guardians see cycle state
│  │  Mood: okay           │  │
│  │  Meds: ✅ Taken       │  │  ← if medication sharing is on
│  └───────────────────────┘  │
│                             │
│  SHARED WITH YOU            │
│  ┌───────────────────────┐  │
│  │  📄 AI Report — Feb   │  │  ← if Owais shared
│  │  Shared 3 days ago    │  │
│  │  [ View Report ]      │  │
│  └───────────────────────┘  │
│                             │
│  SEND A CHECK-IN            │
│  ┌───────────────────────┐  │
│  │  💬 "Thinking of you" │  │
│  │  💬 "How are you?"    │  │
│  └───────────────────────┘  │
│  [ Write a message… ]       │
│                             │
│  🏠    💬    👤             │
│ Home  Msgs  Profile         │
└─────────────────────────────┘
```
> Guardians see cycle state labels and medication status (if sharing is enabled). The alert banner only appears when the patient's high-risk threshold is triggered.

</details>

### Companion Messaging

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Messages        Owais   │
│                             │
│  ─── Today ───              │
│                             │
│             ┌─────────────┐ │
│             │ Thinking of │ │  ← sent by Ahmed
│             │ you today 💜│ │
│             │ 9:14 AM     │ │
│             └─────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │ Thanks, that means    │  │  ← replied by Owais
│  │ a lot                 │  │
│  │ 9:32 AM               │  │
│  └───────────────────────┘  │
│                             │
│  ┌─────────────────────────┐│
│  │  Write a message…     ↑ ││
│  └─────────────────────────┘│
│                             │
│  Quick:                     │
│  [Thinking of you] [💜]     │
│  [How are you?] [Proud 🌟]  │
│                             │
└─────────────────────────────┘
```
> Messages are private — only visible to the sender and the patient. Not moderated. The patient can mute or remove any companion at any time from the Well-wishers tab.

</details>
