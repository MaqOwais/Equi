/**
 * test-seed.ts — Inserts pre-accepted test connections for the manage-access feature.
 *
 * Usage: tap the "Seed test data" button on the Manage Access screen (dev only).
 * Cleanup: tap "Clear test data" to remove all seeded records.
 *
 * Test accounts:
 *   test.psychiatrist@equi.dev  → psychiatrist connection (accepted)
 *   test.guardian@equi.dev      → guardian companion (accepted)
 *   test.wellwisher@equi.dev    → well-wisher companion (accepted)
 */

import { supabase } from './supabase';

// Stable valid UUIDs so seeding is idempotent (re-running won't duplicate)
const TEST_PSYCHIATRIST_ID  = '00000000-0000-4000-a000-000000000001';
const TEST_PSYCH_CONN_ID    = '00000000-0000-4000-a000-000000000002';
const TEST_GUARDIAN_ID      = '00000000-0000-4000-a000-000000000003';
const TEST_WELLWISHER_ID    = '00000000-0000-4000-a000-000000000004';
// "You are watching this test patient" — companion_id = currentUser, patient_id = TEST_PATIENT_ID
const TEST_PATIENT_ID       = '00000000-0000-4000-a000-000000000005';
const TEST_WATCHING_CONN_ID = '00000000-0000-4000-a000-000000000006';

export async function seedTestConnections(userId: string): Promise<{ ok: boolean; error?: string }> {
  // 1. Upsert a test psychiatrist record
  const { error: e1 } = await supabase.from('psychiatrists').upsert({
    id:                           TEST_PSYCHIATRIST_ID,
    npi_number:                   'TEST-NPI-001',
    name:                         'Dr. Test Psychiatrist',
    credentials:                  'MD, Test Account',
    bio:                          'This is a test psychiatrist account for development.',
    offers_telehealth:            true,
    offers_in_person:             false,
    is_equi_partner:              true,
    activity_prescribing_enabled: true,
    profile_visible:              false,
    verified_at:                  new Date().toISOString(),
  }, { onConflict: 'id' });
  if (e1) return { ok: false, error: `psychiatrists: ${e1.message}` };

  // 2. Upsert the psychiatrist connection — core fields only
  const { error: e2 } = await supabase.from('psychiatrist_connections').upsert({
    id:              TEST_PSYCH_CONN_ID,
    patient_id:      userId,
    psychiatrist_id: TEST_PSYCHIATRIST_ID,
    status:          'accepted',
    connected_at:    new Date().toISOString(),
  }, { onConflict: 'id' });
  if (e2) return { ok: false, error: `psychiatrist_connections: ${e2.message}` };
  // share_* columns (best-effort — requires migration to be run)
  await supabase.from('psychiatrist_connections').update({
    share_cycle_data: true, share_journal: true, share_activities: true,
    share_ai_report: true, share_medication: true, share_sleep: true,
    share_nutrition: false, share_workbook: false,
  }).eq('id', TEST_PSYCH_CONN_ID);

  // 3. Upsert guardian companion — core fields only
  const { error: e3 } = await supabase.from('companions').upsert({
    id:                   TEST_GUARDIAN_ID,
    patient_id:           userId,
    companion_id:         null,
    role:                 'guardian',
    guardian_level:       'alert_on_risk',
    status:               'accepted',
    invite_email:         'test.guardian@equi.dev',
    share_mood_summaries: true,
    share_cycle_data:     true,
  }, { onConflict: 'id' });
  if (e3) return { ok: false, error: `companions (guardian): ${e3.message}` };
  // share_* columns (best-effort — requires migration)
  await supabase.from('companions').update({
    share_journal: false, share_activities: true, share_ai_report: true,
    share_medication: true, share_sleep: true, share_nutrition: false,
    share_workbook: false, access_expires_at: null,
  }).eq('id', TEST_GUARDIAN_ID);

  // 4. Upsert well-wisher companion — core fields only
  const { error: e4 } = await supabase.from('companions').upsert({
    id:                   TEST_WELLWISHER_ID,
    patient_id:           userId,
    companion_id:         null,
    role:                 'well_wisher',
    guardian_level:       null,
    status:               'accepted',
    invite_email:         'test.wellwisher@equi.dev',
    share_mood_summaries: true,
    share_cycle_data:     true,
  }, { onConflict: 'id' });
  if (e4) return { ok: false, error: `companions (well-wisher): ${e4.message}` };
  // share_* columns (best-effort — requires migration)
  await supabase.from('companions').update({
    share_journal: false, share_activities: false, share_ai_report: false,
    share_medication: false, share_sleep: false, share_nutrition: false,
    share_workbook: false, access_expires_at: null,
  }).eq('id', TEST_WELLWISHER_ID);

  // 5. Seed a "you are watching" companion connection (currentUser is the guardian)
  //    This makes the "Watching over" section visible on the You tab.
  //    We also store state directly so it shows up immediately without a DB profile row.
  const { error: e5 } = await supabase.from('companions').upsert({
    id:                   TEST_WATCHING_CONN_ID,
    patient_id:           TEST_PATIENT_ID,   // fake patient UUID (no auth.users row)
    companion_id:         userId,            // current user IS the companion
    role:                 'guardian',
    guardian_level:       'alert_on_risk',
    status:               'accepted',
    invite_email:         'test.patient@equi.dev',
    share_mood_summaries: true,
    share_cycle_data:     true,
  }, { onConflict: 'id' });
  if (e5) return { ok: false, error: `companions (watching): ${e5.message}` };
  // share_* columns best-effort
  await supabase.from('companions').update({
    share_journal: true, share_activities: true, share_ai_report: false,
    share_medication: true, share_sleep: true, share_nutrition: false,
    share_workbook: false,
  }).eq('id', TEST_WATCHING_CONN_ID);

  return { ok: true };
}

export async function clearTestConnections(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await Promise.all([
      supabase
        .from('psychiatrist_connections')
        .delete()
        .eq('id', TEST_PSYCH_CONN_ID)
        .eq('patient_id', userId),
      supabase
        .from('companions')
        .delete()
        .in('id', [TEST_GUARDIAN_ID, TEST_WELLWISHER_ID])
        .eq('patient_id', userId),
      supabase
        .from('companions')
        .delete()
        .eq('id', TEST_WATCHING_CONN_ID)
        .eq('companion_id', userId),
      supabase
        .from('access_approval_requests')
        .delete()
        .eq('patient_id', userId),
    ]);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
