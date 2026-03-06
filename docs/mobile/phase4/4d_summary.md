# 4D Implementation Summary — PDF Export & Data Sharing

**Status:** ✅ Implemented
**Design doc:** [4d-pdf-export.md](./4d-pdf-export.md)

---

## What Was Built

Phase 4D adds clinical PDF export, companion sharing, and full GDPR/CCPA data portability. Users can export their AI Wellness Report as a PDF (save to device or share with companions), and export/delete all their personal data from the Privacy & data screen.

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/4d_pdf_sharing.sql` | `report_shares` table + `deletion_scheduled_at` + `last_data_export_at` on profiles |
| `supabase/functions/generate-report-pdf/index.ts` | Edge Function: builds HTML → Puppeteer PDF → Supabase Storage → signed URL |
| `supabase/functions/export-user-data/index.ts` | Edge Function: fetches all user data → JSON package → Storage → 24h signed URL |
| `components/ui/ExportSheet.tsx` | Bottom sheet modal: save to device / share with companion / copy link |
| `app/(tabs)/you/privacy.tsx` | Privacy screen: export data + 30-day soft-delete account deletion |

## Files Modified

| File | Change |
|---|---|
| `types/database.ts` | Added `ReportShare` interface |
| `stores/ai.ts` | Added `isExporting`, `exportPdf(userId, reportId)`, `shareWithCompanion(userId, reportId, companionId)` |
| `app/(tabs)/you/ai-report.tsx` | "Export PDF" button opens `ExportSheet`; `ExportSheet` rendered at screen root |
| `app/(tabs)/you/index.tsx` | "Privacy & data" menu item routes to `/(tabs)/you/privacy` |

---

## Architecture

### PDF generation flow

```
Mobile (tap Export PDF)
  → ExportSheet opens
  → tap "Save to device"
    → stores/ai.ts exportPdf()
      → POST /generate-report-pdf { report_id }
        → Edge Function verifies auth.uid() owns report
        → builds HTML (inline CSS, no external assets)
        → Puppeteer/Chromium renders A4 PDF
        → uploads to Storage: reports/{user_id}/{report_id}.pdf
        → updates ai_reports.pdf_url
        → returns signed URL (1h TTL)
      → FileSystem.downloadAsync(url, cacheDir)
      → Sharing.shareAsync(localPath) — native share sheet
```

### Companion sharing flow

```
ExportSheet → tap companion row
  → stores/ai.ts shareWithCompanion()
    → POST /generate-report-pdf { report_id, share_ttl_seconds: 604800 }
    → insert report_shares { report_id, user_id, companion_id, share_url, expires_at }
    → (companion receives 7-day read-only link — no Equi account required)
```

### Data export flow

```
Privacy screen → tap "Export my data"
  → POST /export-user-data (auth header only)
    → fetches all user rows in parallel (11 tables)
    → builds DataPackage JSON { files: { "README.txt", "mood_logs.csv", ... } }
    → uploads to Storage: reports/{user_id}/export-{date}.json
    → stamps profiles.last_data_export_at
    → returns signed URL (24h TTL)
  → Linking.openURL(url) — opens in browser / Files app
```

---

## Key design decisions

| Decision | Rationale |
|---|---|
| Puppeteer server-side (not client PDF lib) | Full HTML/CSS control; no native PDF library in the RN bundle |
| JSON data package (not ZIP) | Deno has no built-in zip; JSON envelope with CSV sub-files is simpler and equally readable |
| `report_shares` table | Audit trail — user can see who viewed their report; TTL enforced at Storage level |
| 30-day grace period for deletion | GDPR standard; user can cancel by signing back in; `deletion_scheduled_at` on profile drives a future cron job |
| `expo-sharing` + `FileSystem.downloadAsync` | Downloads PDF to device cache first so native share sheet can access the file path |

---

## What the PDF contains / never contains

**Contains:**
- Cover (name, period, generated date)
- Summary, cycle overview table, early warning flags (gold, with disclaimer)
- Mood patterns, activities, sleep, substances, medication, nutrition, social rhythm score
- Privacy footer

**Never contains:**
- Raw journal text
- Community posts
- Psychiatrist contact details
- Data from other users

---

## Supabase Storage bucket

Bucket: `reports` (must be created manually in Supabase dashboard)
- Public: false (all access via signed URLs)
- File size limit: 10 MB
- Allowed MIME types: `application/pdf`, `application/json`
- Path structure: `{user_id}/{report_id}.pdf` and `{user_id}/export-{date}.json`

---

## Notes for deployment

1. Create Supabase Storage bucket `reports` with settings above.
2. Deploy both Edge Functions:
   ```bash
   supabase functions deploy generate-report-pdf
   supabase functions deploy export-user-data
   ```
3. The `generate-report-pdf` function fetches Chromium on first run (~50 MB); subsequent runs use the cached binary. Cold starts may be slow (10–20s) — acceptable for a PDF generation flow.
4. Run the `4d_pdf_sharing.sql` migration in the Supabase SQL editor.
