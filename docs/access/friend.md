# Access: Friend

A friend is someone the user wants to stay loosely connected with — aware of how they're doing, without access to clinical or medical detail. Friends receive the lightest-touch view of all non-user roles: simplified mood status and nothing that crosses into medical territory.

Friends are added through the same **Screen 16 — Well-wisher & Guardian Access** flow, but their default permissions are more limited than well-wishers and they cannot be elevated to guardian status.

---

## What a Friend Can Access

All permissions are **off by default**. The user sets each one individually.

| Data Type | Access | Default | What They See |
|---|---|---|---|
| Mood status (simplified) | 🔓 Toggle | Off | A non-clinical summary: "doing well", "having a difficult time", "stable" — no scores, no cycle labels |
| AI Wellness Report | 🔓 Manual share | Off | Read-only PDF if the user manually shares from Screen 09; one-time, not ongoing |
| Selected journal entries | 🔓 User selects | Off | Only entries the user has explicitly marked as shareable |

### Never accessible (regardless of permissions granted)

| Data Type | Status | Reason |
|---|---|---|
| Medication adherence | ❌ Never | Medical data — friends are not part of clinical care |
| Substance use data | ❌ Never | Medical data |
| Raw mood scores (numeric) | ❌ Never | Friends see a simplified mood description, not clinical numbers |
| Cycle state labels (Manic / Depressive) | ❌ Never | Clinical terminology not appropriate for a friend view |
| High-risk alerts / push notifications | ❌ Never | Automated alerts are not available for friend-tier access |
| Sleep / wearable data | ❌ Never |  |
| Relapse signatures | ❌ Never |  |
| Bipolar Workbook | ❌ Never |  |
| Activity compliance | ❌ Never | Psychiatrist-only |
| Prescribed activities | ❌ Never | Psychiatrist-only |
| Community posts | ❌ Never | Anonymous by design |
| Crisis history | ❌ Never |  |
| Account management | ❌ Never | Friends cannot take any action on the account |

---

## Mood Status — What "Simplified" Means

When mood summary sharing is enabled for a friend, they see a plain-language description rather than clinical terminology or numeric scores. The mapping:

| Internal state | What a friend sees |
|---|---|
| Stable, mood 7–10 | "Doing well" |
| Stable, mood 5–7 | "Doing okay" |
| Any state, mood 3–5 | "Having a harder time lately" |
| Any state, mood 1–3 | "Going through a difficult period" |
| Manic / elevated | "Having a busy, high-energy period" |

The purpose is to let a friend know whether to reach out — not to give them a clinical picture of the user's mental state.

---

## No Automated Alerts for Friends

Unlike guardians (and optionally well-wishers), friends do not receive automated push notifications. If the user wants a friend to know they're struggling, they share that directly — Equi does not push that information without the user actively choosing to share it in that moment.

This preserves the user's agency in how they disclose to their social circle.

---

## What a Friend Cannot Do

- They cannot log anything on behalf of the user
- They cannot message the user through Equi
- They cannot request more access
- They cannot see what other people have access to
- They cannot be escalated to guardian status (that designation requires the user to explicitly enable it in a separate step for a specifically trusted person)

---

## The Difference Between a Friend and a Well-wisher

In practice, "friend" and "well-wisher" use the same permission infrastructure. The distinction is in what defaults are appropriate and what clinical detail is surfaced:

| | Well-wisher | Friend |
|---|---|---|
| Mood view | Full mood summary with cycle context | Simplified plain-language description only |
| High-risk alerts | Available (off by default) | Not available |
| Clinical labels in shared content | Yes (cycle state shown in mood summary) | No (plain language only) |
| Can be elevated to guardian | Yes | No |
| Typical relationship | Partner, sibling, therapist, close support | Friend, coworker, acquaintance |

The user decides which tier is appropriate for each person they add.
