# Access: Psychiatrist

Psychiatrists access Equi through a separate **web-based portal** (Screen 17 — Psychiatrist Portal). Access is gated by the patient's explicit connection — a psychiatrist can only see a patient's data if the patient has connected with them via Screen 08.

The portal is strictly limited to therapeutic activity data. It is not a clinical record system and does not replace EMR/EHR workflows.

---

## What a Psychiatrist Can Access

### Always on (once patient connects)

| Data Type | Access | Notes |
|---|---|---|
| Prescribed activity names | ✅ Always | Activities they have prescribed to this patient |
| Prescribed dosage & frequency | ✅ Always | Duration and schedule they set |
| Activity compliance rate | ✅ Always | Weekly and 4-week compliance trend |
| Clinical goal per activity | ✅ Always | The goal text they wrote when prescribing |

### Requires patient to share explicitly

| Data Type | Access | Default | How to Enable |
|---|---|---|---|
| AI Wellness Report | 🔓 Patient must share | Off | Patient taps "Share report" before appointment (Screen 08 or Screen 09) |
| Medication adherence | 🔓 Per-patient toggle | Off | Patient enables toggle in Screen 19; or psychiatrist requests via portal |
| Substance use data | 🔓 Per-patient toggle | Off | Patient enables toggle in Screen 16 |

### Never accessible — no override

| Data Type | Status | Reason |
|---|---|---|
| Journal entries | ❌ Never | Too personal — clinical relationship does not require it |
| Raw mood scores | ❌ Never | Mood data is surfaced only through AI Wellness Report (if shared) |
| Cycle state logs | ❌ Never | Only visible via AI report narrative |
| Sleep / wearable data | ❌ Never | Only via AI report narrative |
| Relapse signatures | ❌ Never | Patient-private clinical tool |
| Bipolar Workbook responses | ❌ Never | Patient-private structured reflection |
| Community posts | ❌ Never | Anonymous by design |
| Crisis history | ❌ Never | Not part of the activity compliance scope |
| Social rhythm logs | ❌ Never | Only surfaced via AI report if shared |
| Emergency contacts | ❌ Never | Not relevant to the portal |

---

## What a Psychiatrist Can Do in the Portal

- **Prescribe activities** — choose from the Equi activity library, set dosage (duration) and frequency, write a clinical goal, set phase restrictions (e.g., pause during manic phase)
- **Edit or remove prescribed activities** — update dosage, frequency, or goal at any time
- **View compliance trends** — weekly + 4-week compliance breakdown per activity
- **Request medication tracking** — sends a patient-facing notification: *"Dr. [Name] recommends enabling medication tracking. [Enable] [Not now] [Don't ask again]."* The patient's response is not reported back; the portal only shows whether tracking is currently on or off.

---

## Connection Model

1. Patient searches for the psychiatrist in **Screen 08 — Psychiatrists**
2. Patient taps "Connect" — default share is activity compliance only
3. Psychiatrist sees the patient in their portal under MY PATIENTS
4. All additional data sharing requires the patient to enable it separately

The patient can disconnect from a psychiatrist at any time. Disconnection immediately removes the psychiatrist's access to all data, including previously shared reports.

---

## What "Equi Partner" Means

Equi Partner psychiatrists have agreed to the Equi clinical protocol:
- They understand the monitoring approach and its evidence base
- They can prescribe activities directly from the portal
- Their patients' AI reports are designed to be shared before appointments
- They do not receive any data beyond what any connected psychiatrist receives — "Partner" status does not grant additional data access
