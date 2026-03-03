# Access: Guardian / Parent

A guardian is a parent, caregiver, or trusted person who takes on a more active role in the user's safety — not just receiving updates but being contactable in a crisis and, when the user has consented, able to manage the account on their behalf during an episode.

Guardian access is a superset of well-wisher access. Every permission a well-wisher can have, a guardian can also have — plus the elevated capabilities listed below.

Managed from **Screen 16 — Well-wisher & Guardian Access**.

---

## What a Guardian Can Access

### Shared with well-wisher tier (all toggleable, off by default)

| Data Type | Access | Default | What They See |
|---|---|---|---|
| Mood summaries | 🔓 Toggle | Off | Simplified daily summary — cycle state and mood level |
| Selected journal entries | 🔓 User selects | Off | Only entries the user has explicitly marked as shareable |
| AI Wellness Report | 🔓 Manual share | Off | Read-only PDF when user shares from Screen 09 |
| High-risk threshold alerts | 🔓 Toggle | **On by default** | Push notification when mood drops below threshold for 2+ days |

### Guardian-only capabilities

| Capability | Access | Default | Notes |
|---|---|---|---|
| SOS emergency contact | ✅ If added as emergency contact | Depends on onboarding setup | Called/texted automatically when user taps SOS on Home |
| Automatic high-risk alerts | 🔓 Toggle | On by default for guardians | Same alert as well-wisher but defaults to on; threshold is user-configured |
| Crisis account management | 🔓 Explicit consent required | Off | See below |

---

## Crisis Account Management

When the user has enabled "Guardian access" for a specific person, that guardian can — **only during a declared crisis state** — take limited actions on the user's account:

- Log the user's daily cycle state and mood on their behalf
- Mark medication as taken on the user's behalf
- Contact the user's connected psychiatrist to flag the crisis (sends a system alert, not journal/mood data)

**What the guardian cannot do even in full control:**
- Read journal entries beyond what the user has already shared
- Access medication or substance use data unless the user has enabled sharing
- Change the user's sharing permissions
- Access community posts
- Export or delete the user's data

**Critical safeguard:** Guardian "full control" is **always revocable by the user when they are stable**. The user re-asserts control by confirming in Screen 16 that they are well enough to manage their own account. The guardian is notified when control is returned.

---

## High-Risk Alert Defaults

Unlike well-wishers (where alerts are off by default), guardian alerts **default to on** when a person is designated as a guardian. The rationale: guardians have accepted a caregiving responsibility. The user can lower or remove the threshold, or turn alerts off entirely, at any time.

Alert message:
> *"[User] has been having a difficult few days and their Equi data suggests they may need extra support. You might want to reach out or check in."*

No clinical data, scores, or journal content is included in the alert.

---

## What a Guardian Can Never Access

| Data Type | Status |
|---|---|
| Medication adherence | ❌ Never (too sensitive — strictly user + psychiatrist only) |
| Substance use data | ❌ Never |
| Raw mood scores (numeric) | ❌ Never — summaries only |
| Full journal | ❌ Never — only entries user has selected to share |
| Relapse signatures | ❌ Never |
| Bipolar Workbook | ❌ Never |
| Community posts | ❌ Never |
| Crisis history details | ❌ Never |
| Activity compliance | ❌ Never — psychiatrist only |

---

## Designating a Guardian

When adding a person in Screen 16, the user can toggle **"Guardian access"** to elevate them from well-wisher to guardian. A secondary confirmation is shown:

> *"Guardian access means [Name] will be listed as your emergency SOS contact and can help manage your account during a crisis if you choose. You can remove this at any time."*

The user must confirm this step separately from setting the initial permissions.
