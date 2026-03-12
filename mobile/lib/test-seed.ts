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
const TEST_PSYCHIATRIST_ID = '00000000-0000-4000-a000-000000000001';
const TEST_PSYCH_CONN_ID   = '00000000-0000-4000-a000-000000000002';
const TEST_GUARDIAN_ID     = '00000000-0000-4000-a000-000000000003';
const TEST_WELLWISHER_ID   = '00000000-0000-4000-a000-000000000004';

export async function seedTestConnections(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Upsert a test psychiatrist record
    await supabase.from('psychiatrists').upsert({
      id:                          TEST_PSYCHIATRIST_ID,
      npi_number:                  'TEST-NPI-001',
      name:                        'Dr. Test Psychiatrist',
      credentials:                 'MD, Test Account',
      bio:                         'This is a test psychiatrist account for development.',
      offers_telehealth:           true,
      offers_in_person:            false,
      is_equi_partner:             true,
      activity_prescribing_enabled:true,
      profile_visible:             false,   // hidden from real directory
      verified_at:                 new Date().toISOString(),
    }, { onConflict: 'id' });

    // 2. Upsert the psychiatrist connection (pre-accepted)
    await supabase.from('psychiatrist_connections').upsert({
      id:                TEST_PSYCH_CONN_ID,
      patient_id:        userId,
      psychiatrist_id:   TEST_PSYCHIATRIST_ID,
      status:            'accepted',
      share_cycle_data:  true,
      share_journal:     true,
      share_activities:  true,
      share_ai_report:   true,
      share_medication:  true,
      share_sleep:       true,
      share_nutrition:   false,
      share_workbook:    false,
      connected_at:      new Date().toISOString(),
    }, { onConflict: 'id' });

    // 3. Upsert guardian companion (pre-accepted)
    await supabase.from('companions').upsert({
      id:                   TEST_GUARDIAN_ID,
      patient_id:           userId,
      companion_id:         null,
      role:                 'guardian',
      guardian_level:       'alert_on_risk',
      status:               'accepted',
      invite_email:         'test.guardian@equi.dev',
      share_mood_summaries: true,
      share_cycle_data:     true,
      share_journal:        false,
      share_activities:     true,
      share_ai_report:      true,
      share_medication:     true,
      share_sleep:          true,
      share_nutrition:      false,
      share_workbook:       false,
      access_expires_at:    null,
    }, { onConflict: 'id' });

    // 4. Upsert well-wisher companion (pre-accepted)
    await supabase.from('companions').upsert({
      id:                   TEST_WELLWISHER_ID,
      patient_id:           userId,
      companion_id:         null,
      role:                 'well_wisher',
      guardian_level:       null,
      status:               'accepted',
      invite_email:         'test.wellwisher@equi.dev',
      share_mood_summaries: true,
      share_cycle_data:     true,
      share_journal:        false,
      share_activities:     false,
      share_ai_report:      false,
      share_medication:     false,
      share_sleep:          false,
      share_nutrition:      false,
      share_workbook:       false,
      access_expires_at:    null,
    }, { onConflict: 'id' });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
        .from('access_approval_requests')
        .delete()
        .eq('patient_id', userId),
    ]);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
