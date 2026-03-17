/**
 * Tests for the 5 bug fixes:
 *
 * Bug 1 – Activities + button: style no longer uses fullwidth ＋ char
 * Bug 2 – Tracker med skip: logMedication receives skip reason from sheet
 * Bug 3 – Customize modal: backdrop is a non-pressable View (no accidental dismiss)
 * Bug 4 – Home layout order saved: isLoaded guard prevents re-load overwriting order
 * Bug 5 – Crisis modal: loads companions + shows notify action
 */

import { useHomeLayoutStore, DEFAULT_ORDER, type SectionId } from '../../stores/homeLayout';
import { useTodayStore } from '../../stores/today';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [] }),
      upsert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

jest.mock('../../lib/local-day-store', () => ({
  saveLocal: jest.fn().mockResolvedValue(undefined),
  getLocal:  jest.fn().mockResolvedValue(null),
}));

// ─── Bug 1: Activities + button ───────────────────────────────────────────────

describe('Bug 1 — Activities + button rendering', () => {
  it('addBtnText does not use the fullwidth ＋ character that fails on Android fonts', () => {
    // Read the source file text and verify the + char used
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/(tabs)/activities.tsx'),
      'utf8',
    );

    // Should NOT contain the fullwidth plus sign (U+FF0B)
    expect(src).not.toContain('＋');

    // Should contain a regular ASCII + inside addBtnText / the button
    expect(src).toContain('"+"');
  });

  it('addBtnText style does not use lineHeight/marginTop overrides that clip the character', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/(tabs)/activities.tsx'),
      'utf8',
    );

    // The old broken style had: lineHeight: 24, marginTop: -1
    expect(src).not.toMatch(/addBtnText:.*lineHeight: 24/);
    expect(src).not.toMatch(/addBtnText:.*marginTop: -1/);
  });
});

// ─── Bug 2: Tracker med skip sheet ────────────────────────────────────────────

describe('Bug 2 — Tracker medication skip reason', () => {
  beforeEach(() => {
    useTodayStore.setState({
      medicationStatus: null,
      medicationSkipReason: null,
    });
  });

  it('logMedication stores the skip reason in state', async () => {
    const store = useTodayStore.getState();
    await store.logMedication('user-1', 'skipped', 'Forgot');
    expect(useTodayStore.getState().medicationStatus).toBe('skipped');
    expect(useTodayStore.getState().medicationSkipReason).toBe('Forgot');
  });

  it('logMedication stores reason for partial status', async () => {
    const store = useTodayStore.getState();
    await store.logMedication('user-1', 'partial', 'Side effects');
    expect(useTodayStore.getState().medicationStatus).toBe('partial');
    expect(useTodayStore.getState().medicationSkipReason).toBe('Side effects');
  });

  it('logMedication stores null reason when taken (no skip)', async () => {
    const store = useTodayStore.getState();
    await store.logMedication('user-1', 'taken');
    expect(useTodayStore.getState().medicationStatus).toBe('taken');
    expect(useTodayStore.getState().medicationSkipReason).toBeNull();
  });

  it('tracker screen uses a Modal bottom sheet (not inline TextInput) for skip reason', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/(tabs)/tracker.tsx'),
      'utf8',
    );

    // Modal + Pressable sheet should be present
    expect(src).toContain('skipSheetVisible');
    expect(src).toContain('SKIP_REASONS');
    expect(src).toContain('sheetOption');
    expect(src).toContain('confirmSkip');

    // The old inline TextInput approach should be gone
    expect(src).not.toContain('skipInput');
    expect(src).not.toContain('submitMedStatus');
  });
});

// ─── Bug 3: Customize modal accidental dismiss ────────────────────────────────

describe('Bug 3 — Customize modal does not close on backdrop scroll', () => {
  it('customize modal backdrop is a View (not a Pressable), preventing accidental dismiss', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/(tabs)/index.tsx'),
      'utf8',
    );

    // Find the customize modal section
    const customizeSection = src.slice(src.indexOf('Customize Layout Modal'));

    // The outer wrapper should be <View not <Pressable ... onPress={() => setCustomizeVisible(false)}>
    const backdropPressableDismiss = /<Pressable[^>]*onPress[^>]*setCustomizeVisible\(false\)[^>]*>/.test(
      customizeSection.slice(0, 300),
    );
    expect(backdropPressableDismiss).toBe(false);
  });
});

// ─── Bug 4: Home layout order persistence ─────────────────────────────────────

describe('Bug 4 — Home layout order is not re-loaded after mutations', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  function resetStore() {
    useHomeLayoutStore.setState({ order: [...DEFAULT_ORDER], isLoaded: false });
  }

  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  it('load() sets isLoaded to true', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    await useHomeLayoutStore.getState().load();
    expect(useHomeLayoutStore.getState().isLoaded).toBe(true);
  });

  it('load() called twice only reads AsyncStorage once (isLoaded guard)', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    await useHomeLayoutStore.getState().load();
    await useHomeLayoutStore.getState().load();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('order survives a second load() call after moveUp', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    await useHomeLayoutStore.getState().load();

    const target = useHomeLayoutStore.getState().order[2];
    await useHomeLayoutStore.getState().moveUp(target);
    const orderAfterMove = [...useHomeLayoutStore.getState().order];

    // Simulate a second load() being called (e.g. re-mount)
    await useHomeLayoutStore.getState().load();

    // State should NOT be overwritten because isLoaded guard fires
    expect(useHomeLayoutStore.getState().order).toEqual(orderAfterMove);
  });

  it('reset() clears isLoaded so next load() re-reads AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    await useHomeLayoutStore.getState().load();
    expect(useHomeLayoutStore.getState().isLoaded).toBe(true);

    await useHomeLayoutStore.getState().reset();
    expect(useHomeLayoutStore.getState().isLoaded).toBe(false);
  });
});

// ─── Bug 5: Crisis modal shows support network ────────────────────────────────

describe('Bug 5 — Crisis modal loads companions and shows Notify button', () => {
  it('CrisisModal source loads from companions table (not just emergency_contacts)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../components/ui/CrisisModal.tsx'),
      'utf8',
    );

    expect(src).toContain("from('companions')");
    expect(src).toContain("from('emergency_contacts')");
  });

  it('CrisisModal renders a Notify button for guardian contacts', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../components/ui/CrisisModal.tsx'),
      'utf8',
    );

    expect(src).toContain('notifyGuardian');
    expect(src).toContain('Notify');
    expect(src).toContain('YOUR SUPPORT NETWORK');
  });

  it('notifyGuardian opens a mailto link with a pre-composed crisis message', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../components/ui/CrisisModal.tsx'),
      'utf8',
    );

    expect(src).toContain('mailto:');
    expect(src).toContain('Crisis Alert');
  });

  it('CrisisModal resets guardians state on close', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../components/ui/CrisisModal.tsx'),
      'utf8',
    );

    // handleClose should clear guardians
    expect(src).toContain('setGuardians([])');
  });
});

// ─── Bug 6: Cycle entry timestamp missing in day detail fallback ───────────────
//
// Bug: day/[date].tsx showed the timestamp only when cycleStore.dayEntries was
// populated from Supabase. When the fallback (calendar store DayData) was used
// — e.g. offline or before Supabase loaded — no timestamp was shown at all.
// Root cause: DayData had no cycleTimestamp field; logCycle() did not persist
// the logged_at time to local storage.

describe('Bug 6 — Cycle entry timestamp shown in all display paths', () => {
  it('logCycle persists cycleTimestamp to local storage', async () => {
    const { saveLocal } = require('../../lib/local-day-store');
    const { useTodayStore } = require('../../stores/today');

    useTodayStore.setState({ date: '2026-03-16', cycleState: null });

    const before = Date.now();
    await useTodayStore.getState().logCycle('user-1', 'mixed', 5, ['sleep disturbed'], 'Rough morning');
    const after = Date.now();

    expect(saveLocal).toHaveBeenCalled();
    const savedArgs = saveLocal.mock.calls[saveLocal.mock.calls.length - 1];
    const partial = savedArgs[2]; // third arg is the partial LocalDayData

    expect(partial.cycleTimestamp).toBeDefined();
    expect(partial.cycleTimestamp).not.toBeNull();

    // Verify it's a valid ISO 8601 string within our test window
    const ts = new Date(partial.cycleTimestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('DayData interface has cycleTimestamp field', () => {
    // Verify the type exists at runtime via the calendar store skeleton build
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../stores/calendar.ts'),
      'utf8',
    );
    expect(src).toContain('cycleTimestamp');
  });

  it('LocalDayData interface has cycleTimestamp field', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../lib/local-day-store.ts'),
      'utf8',
    );
    expect(src).toContain('cycleTimestamp');
  });

  it('day detail fallback renders cycleTimestamp with identical layout to Supabase path', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/day/[date].tsx'),
      'utf8',
    );
    // The fallback path renders data.cycleTimestamp through fmtTime
    expect(src).toContain('data.cycleTimestamp');
    expect(src).toContain('fmtTime(data.cycleTimestamp)');
    // entryTime must appear BEFORE entryDot in the fallback (same order as Supabase path)
    const fallbackStart = src.indexOf('Fallback to calendar store data');
    const fallbackSection = src.slice(fallbackStart, fallbackStart + 600);
    const timePos = fallbackSection.indexOf('entryTime');
    const dotPos  = fallbackSection.indexOf('entryDot');
    expect(timePos).toBeGreaterThan(-1);
    expect(dotPos).toBeGreaterThan(-1);
    expect(timePos).toBeLessThan(dotPos); // time column must come before dot
  });

  it('calendar store Supabase merge maps logged_at to cycleTimestamp', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../stores/calendar.ts'),
      'utf8',
    );
    // cycleTimestamp should be populated from cycleMap[date]?.logged_at
    expect(src).toContain('cycleMap[date]?.logged_at');
  });
});
