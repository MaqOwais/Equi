# Equi — Access Control Overview

Every piece of data in Equi belongs to the user. Sharing is always opt-in, per-person, and revocable at any time. No role — not a psychiatrist, not a parent — can access anything without the user's explicit, granular consent.

**Everyone downloads the same Equi app.** Friends, well-wishers, and guardians choose "I'm supporting someone" at the role selection screen and get a companion home view. They can see what the patient shares with them and send messages and check-ins back — two-way, within the app.

---

## Role Summary

| Data Type | User | Psychiatrist | Well-wisher | Guardian / Parent | Friend |
|---|:---:|:---:|:---:|:---:|:---:|
| Cycle state (daily) | ✅ Full | ❌ | 🔓 Toggle | 🔓 Toggle | 🔓 Toggle |
| Mood log (daily score) | ✅ Full | ❌ | 🔓 Toggle | 🔓 Toggle | 🔓 Toggle (simplified) |
| Journal entries | ✅ Full | ❌ Never | 🔓 Selected only | 🔓 Selected only | 🔓 Selected only |
| AI Wellness Report | ✅ Full | 🔓 Manual share | 🔓 Manual share | 🔓 Manual share | 🔓 Manual share |
| Medication adherence | ✅ Full | 🔓 Toggle (off by default) | ❌ Never | ❌ Never | ❌ Never |
| Substance use data | ✅ Full | 🔓 Toggle (off by default) | ❌ Never | ❌ Never | ❌ Never |
| Nutrition logs | ✅ Full | ❌ Never | ❌ Never | ❌ Never | ❌ Never |
| Activity completion | ✅ Full | ✅ Always (once connected) | ❌ | ❌ | ❌ |
| Prescribed activities | ✅ Full | ✅ Always (once connected) | ❌ | ❌ | ❌ |
| Relapse signatures | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| Bipolar Workbook | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| Sleep / wearable data | ✅ Full | 🔓 Via AI report only | ❌ | ❌ | ❌ |
| High-risk threshold alerts | — | ❌ | 🔓 Toggle | ✅ Default on (configurable) | ❌ |
| SOS emergency contact | — | ❌ | ❌ | ✅ Called on SOS tap | 🔓 Optional |
| Crisis account management | — | ❌ | ❌ | 🔓 Consent required | ❌ |
| Community posts | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| Crisis history | ✅ Full | ❌ | ❌ | ❌ | ❌ |

**Key:**
- ✅ Always accessible for this role
- ❌ Never accessible — no toggle, no override
- 🔓 Accessible only with explicit user consent (toggle or manual share)

---

## Access Principles

1. **Opt-in only.** No data is shared by default except activity compliance with a connected psychiatrist.
2. **Per-person granularity.** Permissions are set separately for each individual, not by role class.
3. **Always revocable.** Any permission can be turned off at any time from Screen 16 (Well-wisher & Guardian).
4. **Medication and substance data are the most strictly controlled.** Off by default even for psychiatrists — require a separate toggle per person.
5. **Journal is never fully shared.** Only specific entries the user explicitly selects are visible to any non-user role.
6. **Guardian "full control" is always user-revocable when the user is stable.**
7. **The psychiatrist portal is strictly limited.** It never touches mood scores, journal content, crisis history, or any personal data the user hasn't explicitly shared.

---

## Role Files

| File | Role |
|---|---|
| [user.md](user.md) | The patient — full ownership and control |
| [psychiatrist.md](psychiatrist.md) | Licensed psychiatrist (Equi Partner or connected) |
| [well-wisher.md](well-wisher.md) | A supportive person the user has chosen to share with |
| [guardian.md](guardian.md) | Parent or caregiver with elevated access |
| [friend.md](friend.md) | Friend — simplified view, no medical data |

---

## How Permissions Are Set

All sharing is managed from **Support Network** (Profile → My Support Network). The user adds a person by name and relationship, then toggles each data type on or off for that person individually. Changes take effect immediately and can be undone at any time.

For psychiatrists, sharing is initiated through the **Psychiatrists screen** (Explore tab) when the user connects with a provider. The default share is activity compliance only. All other data types require separate opt-in.

## Two-Way Interaction

The companion app is not read-only. Friends, well-wishers, and guardians can:
- **Send messages** — private direct messages to the patient, visible only to both parties
- **Send check-ins** — one-tap quick templates ("Thinking of you", "How are you?", "Proud of you")
- **React to shared journal entries** — 💜 or 🙏 (same reactions as the community, no free-text to avoid pressure)

The patient receives these in their Equi app. They can mute or remove any companion at any time.
