/**
 * bipolar-flag.test.ts
 *
 * Comprehensive tests for all content that branches on the bipolar flag.
 *
 * Sections:
 *  1.  isBipolar()              — all Diagnosis values + edge cases
 *  2.  diagnosisLabel()         — all values including null / undefined
 *  3.  useBipolarFlag() hook    — profile states via mocked auth store
 *  4.  CATEGORY_WHY             — bipolar blurbs contain clinical terminology
 *  5.  CATEGORY_WHY_GENERAL     — no bipolar / lithium language
 *  6.  getCategoryWhy()         — picks correct map per flag
 *  7.  getActivityRef()         — bipolar vs general for all 8 categories
 *  8.  ACTIVITY_REFS _general   — no bipolar-specific language
 *  9.  buildReportMessages()    — correct system prompt per flag
 *  10. buildMonthlyReportMessages() — correct system prompt per flag
 *  11. SECTIONS_BIPOLAR         — structure + bipolar content contracts
 *  12. SECTIONS_GENERAL         — structure + no bipolar language
 *  13. SYMPTOMS_BIPOLAR         — contains clinical bipolar symptoms
 *  14. SYMPTOMS_GENERAL         — no clinical bipolar terms
 *  15. EXPLORE_LINKS            — bipolar vs general label contracts
 */

// ─── Mocks (must be declared before imports) ──────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      upsert:      jest.fn().mockReturnThis(),
      order:       jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      single:      jest.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

jest.mock('../../lib/local-day-store', () => ({
  saveLocal: jest.fn().mockResolvedValue(undefined),
  getLocal:  jest.fn().mockResolvedValue(null),
}));

jest.mock('../../lib/sentry', () => ({ captureException: jest.fn() }));

jest.mock('expo-router', () => ({
  useRouter:            jest.fn(() => ({ back: jest.fn(), push: jest.fn() })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('expo-constants', () => ({
  default: { executionEnvironment: 'storeClient', appOwnership: 'standalone' },
}));

jest.mock('react-native-svg', () => ({ default: jest.fn(), Line: jest.fn(), Rect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0 })),
}));

// Auth store mock — profile is controlled per-test via setMockProfile
const mockUseAuthStore = jest.fn();
jest.mock('../../stores/auth', () => ({
  useAuthStore: (...args: unknown[]) => mockUseAuthStore(...args),
}));

/** Selector-aware helper — routes useAuthStore((s) => s.profile) calls correctly. */
function setMockProfile(profile: any) {
  mockUseAuthStore.mockImplementation((sel: unknown) => {
    const state = { profile };
    return typeof sel === 'function' ? (sel as (s: any) => any)(state) : state;
  });
}

// Lightweight store mocks (tracker / index imports these)
jest.mock('../../stores/today',          () => ({ useTodayStore:         jest.fn(() => ({})) }));
jest.mock('../../stores/cycle',          () => ({ useCycleStore:          jest.fn(() => ({})), buildDailyDominant: jest.fn(() => ({})) }));
jest.mock('../../stores/sleep',          () => ({ useSleepStore:          jest.fn(() => ({})) }));
jest.mock('../../stores/medications',    () => ({ useMedicationsStore:    jest.fn(() => ({})) }));
jest.mock('../../stores/substanceLogs',  () => ({ useSubstanceLogsStore:  jest.fn(() => ({})) }));
jest.mock('../../stores/ambient',        () => ({ useAmbientTheme:        jest.fn(() => ({ cardSurface: {}, textPrimary: '#000', textSecondary: '#666', sectionLabelStyle: {} })) }));
jest.mock('../../stores/notifications',  () => ({ useNotificationsStore:  jest.fn(() => ({})) }));
jest.mock('../../stores/journal',        () => ({ useJournalStore:        jest.fn(() => ({})) }));
jest.mock('../../stores/ai',             () => ({ useAIStore:             jest.fn(() => ({})) }));
jest.mock('../../stores/crisis',         () => ({ useCrisisStore:         jest.fn(() => ({})) }));
jest.mock('../../stores/tasks',          () => ({ useTasksStore:          jest.fn(() => ({})) }));
jest.mock('../../stores/homeLayout',     () => ({
  useHomeLayoutStore: jest.fn(() => ({ order: [], isLoaded: true })),
  SECTION_META:       {},
  ALL_SECTIONS:       [],
}));
jest.mock('../../stores/pins',           () => ({ usePinsStore: jest.fn(() => ({ items: [], load: jest.fn(), pin: jest.fn(), unpin: jest.fn(), isPinned: jest.fn(() => false) })) }));
jest.mock('../../stores/companion',      () => ({ useCompanionStore: jest.fn(() => ({})), abstractCycleLabel: jest.fn(() => ''), abstractCycleColor: jest.fn(() => '') }));
jest.mock('../../stores/socialRhythm',   () => ({ useSocialRhythmStore: jest.fn(() => ({})) }));
jest.mock('../../stores/activities',     () => ({ useActivitiesStore:   jest.fn(() => ({})) }));
jest.mock('../../stores/access',         () => ({ useAccessStore:       jest.fn(() => ({ guardians: [], load: jest.fn() })) }));

jest.mock('../../app/(tabs)/you/nutrition', () => {
  const actual = jest.requireActual('../../app/(tabs)/you/nutrition');
  return actual;
});

// ─── Imports ──────────────────────────────────────────────────────────────────

import { isBipolar, useBipolarFlag, diagnosisLabel } from '../../lib/bipolar-flag';
import {
  CATEGORY_WHY,
  CATEGORY_WHY_GENERAL,
  getCategoryWhy,
} from '../../app/(tabs)/you/nutrition';
import {
  ACTIVITY_REFS,
  getActivityRef,
} from '../../lib/evidence-refs';
import {
  buildReportMessages,
  buildMonthlyReportMessages,
} from '../../lib/groq';
import {
  SECTIONS_BIPOLAR,
  SECTIONS_GENERAL,
} from '../../app/workbook';
import {
  SYMPTOMS_BIPOLAR,
  SYMPTOMS_GENERAL,
} from '../../app/(tabs)/tracker';
import {
  EXPLORE_LINKS_BIPOLAR,
  EXPLORE_LINKS_GENERAL,
} from '../../app/(tabs)/index';
import type { Diagnosis } from '../../types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lower-cases every string in an array for case-insensitive contains checks. */
const lower = (arr: string[]) => arr.map((s) => s.toLowerCase());

// ─── 1. isBipolar() ───────────────────────────────────────────────────────────

describe('isBipolar()', () => {
  describe('returns true for bipolar spectrum diagnoses', () => {
    it.each<Diagnosis>(['bipolar_1', 'bipolar_2', 'cyclothymia'])(
      '%s → true',
      (d) => expect(isBipolar(d)).toBe(true),
    );
  });

  describe('returns false for general mental health diagnoses', () => {
    it.each<Diagnosis>(['depression', 'anxiety', 'general', 'other', 'unsure'])(
      '%s → false',
      (d) => expect(isBipolar(d)).toBe(false),
    );
  });

  it('returns false for null',      () => expect(isBipolar(null)).toBe(false));
  it('returns false for undefined', () => expect(isBipolar(undefined)).toBe(false));
});

// ─── 2. diagnosisLabel() ──────────────────────────────────────────────────────

describe('diagnosisLabel()', () => {
  it('returns "Not set" for null',      () => expect(diagnosisLabel(null)).toBe('Not set'));
  it('returns "Not set" for undefined', () => expect(diagnosisLabel(undefined)).toBe('Not set'));

  it.each<[Diagnosis, string]>([
    ['bipolar_1',   'Bipolar I'],
    ['bipolar_2',   'Bipolar II'],
    ['cyclothymia', 'Cyclothymia'],
    ['depression',  'Depression / Low mood'],
    ['anxiety',     'Anxiety'],
    ['general',     'General wellness'],
    ['other',       'Other'],
    ['unsure',      'Still figuring it out'],
  ])('%s → "%s"', (diagnosis, expected) => {
    expect(diagnosisLabel(diagnosis)).toBe(expected);
  });

  it('bipolar variants all contain "Bipolar" or "Cyclothymia"', () => {
    const bipolarLabels = ['bipolar_1', 'bipolar_2', 'cyclothymia'].map((d) =>
      diagnosisLabel(d as Diagnosis),
    );
    bipolarLabels.forEach((label) => {
      expect(label.match(/Bipolar|Cyclothymia/)).not.toBeNull();
    });
  });

  it('returns non-empty string for every Diagnosis value', () => {
    const all: Diagnosis[] = ['bipolar_1', 'bipolar_2', 'cyclothymia', 'depression', 'anxiety', 'general', 'other', 'unsure'];
    all.forEach((d) => expect(diagnosisLabel(d).length).toBeGreaterThan(0));
  });
});

// ─── 3. useBipolarFlag() hook ─────────────────────────────────────────────────

describe('useBipolarFlag()', () => {
  it('returns true when profile.diagnosis is bipolar_1', () => {
    setMockProfile({ diagnosis: 'bipolar_1' });
    expect(useBipolarFlag()).toBe(true);
  });

  it('returns true when profile.diagnosis is bipolar_2', () => {
    setMockProfile({ diagnosis: 'bipolar_2' });
    expect(useBipolarFlag()).toBe(true);
  });

  it('returns true when profile.diagnosis is cyclothymia', () => {
    setMockProfile({ diagnosis: 'cyclothymia' });
    expect(useBipolarFlag()).toBe(true);
  });

  it('returns false when profile.diagnosis is depression', () => {
    setMockProfile({ diagnosis: 'depression' });
    expect(useBipolarFlag()).toBe(false);
  });

  it('returns false when profile.diagnosis is anxiety', () => {
    setMockProfile({ diagnosis: 'anxiety' });
    expect(useBipolarFlag()).toBe(false);
  });

  it('returns false when profile.diagnosis is general', () => {
    setMockProfile({ diagnosis: 'general' });
    expect(useBipolarFlag()).toBe(false);
  });

  it('returns false when profile.diagnosis is unsure', () => {
    setMockProfile({ diagnosis: 'unsure' });
    expect(useBipolarFlag()).toBe(false);
  });

  it('returns false when profile is null', () => {
    setMockProfile(null);
    expect(useBipolarFlag()).toBe(false);
  });

  it('returns false when profile has no diagnosis field', () => {
    setMockProfile({});
    expect(useBipolarFlag()).toBe(false);
  });
});

// ─── 4. CATEGORY_WHY — bipolar blurbs contain clinical terms ─────────────────

describe('CATEGORY_WHY (bipolar)', () => {
  const ALL_KEYS = [
    'anti_inflammatory', 'whole_grains', 'lean_protein', 'healthy_fats',
    'fermented', 'caffeine', 'ultra_processed', 'sugar_heavy',
    'alcohol', 'hydration', 'lithium_interaction',
  ];

  it('has a blurb for every expected key', () => {
    ALL_KEYS.forEach((k) => {
      expect(CATEGORY_WHY[k]).toBeDefined();
      expect(typeof CATEGORY_WHY[k]).toBe('string');
      expect(CATEGORY_WHY[k].length).toBeGreaterThan(20);
    });
  });

  it('caffeine blurb mentions lithium (bipolar-specific)', () => {
    expect(CATEGORY_WHY['caffeine'].toLowerCase()).toContain('lithium');
  });

  it('alcohol blurb mentions bipolar disorder', () => {
    expect(CATEGORY_WHY['alcohol'].toLowerCase()).toContain('bipolar');
  });

  it('ultra_processed blurb mentions bipolar depression', () => {
    expect(CATEGORY_WHY['ultra_processed'].toLowerCase()).toContain('bipolar');
  });

  it('lithium_interaction blurb exists and mentions doctor', () => {
    expect(CATEGORY_WHY['lithium_interaction'].toLowerCase()).toContain('doctor');
  });

  it('hydration blurb mentions lithium users', () => {
    expect(CATEGORY_WHY['hydration'].toLowerCase()).toContain('lithium');
  });
});

// ─── 5. CATEGORY_WHY_GENERAL — no bipolar / lithium language ─────────────────

describe('CATEGORY_WHY_GENERAL', () => {
  const ALL_KEYS = [
    'anti_inflammatory', 'whole_grains', 'lean_protein', 'healthy_fats',
    'fermented', 'caffeine', 'ultra_processed', 'sugar_heavy',
    'alcohol', 'hydration', 'lithium_interaction',
  ];

  it('has a blurb for every key present in CATEGORY_WHY', () => {
    ALL_KEYS.forEach((k) => {
      expect(CATEGORY_WHY_GENERAL[k]).toBeDefined();
      expect(typeof CATEGORY_WHY_GENERAL[k]).toBe('string');
      expect(CATEGORY_WHY_GENERAL[k].length).toBeGreaterThan(20);
    });
  });

  it('no blurb contains the word "bipolar"', () => {
    Object.values(CATEGORY_WHY_GENERAL).forEach((blurb) => {
      expect(blurb.toLowerCase()).not.toContain('bipolar');
    });
  });

  it('caffeine blurb does NOT mention lithium', () => {
    expect(CATEGORY_WHY_GENERAL['caffeine'].toLowerCase()).not.toContain('lithium');
  });

  it('alcohol blurb does NOT mention lithium or bipolar', () => {
    const blurb = CATEGORY_WHY_GENERAL['alcohol'].toLowerCase();
    expect(blurb).not.toContain('lithium');
    expect(blurb).not.toContain('bipolar');
  });

  it('hydration blurb does NOT mention lithium', () => {
    expect(CATEGORY_WHY_GENERAL['hydration'].toLowerCase()).not.toContain('lithium');
  });

  it('lithium_interaction blurb does NOT say "lithium" directly (uses generic "medication")', () => {
    const blurb = CATEGORY_WHY_GENERAL['lithium_interaction'].toLowerCase();
    expect(blurb).not.toContain('lithium');
    expect(blurb).toContain('medication');
  });

  it('ultra_processed blurb does NOT mention bipolar', () => {
    expect(CATEGORY_WHY_GENERAL['ultra_processed'].toLowerCase()).not.toContain('bipolar');
  });

  it('each blurb is different from its bipolar counterpart', () => {
    ALL_KEYS.forEach((k) => {
      expect(CATEGORY_WHY_GENERAL[k]).not.toBe(CATEGORY_WHY[k]);
    });
  });
});

// ─── 6. getCategoryWhy() ──────────────────────────────────────────────────────

describe('getCategoryWhy()', () => {
  const KEYS = ['anti_inflammatory', 'caffeine', 'alcohol', 'hydration', 'lithium_interaction'];

  it('returns CATEGORY_WHY blurb when bipolar=true', () => {
    KEYS.forEach((k) => {
      expect(getCategoryWhy(k, true)).toBe(CATEGORY_WHY[k]);
    });
  });

  it('returns CATEGORY_WHY_GENERAL blurb when bipolar=false', () => {
    KEYS.forEach((k) => {
      expect(getCategoryWhy(k, false)).toBe(CATEGORY_WHY_GENERAL[k]);
    });
  });

  it('returns empty string for unknown key (bipolar=true)', () => {
    expect(getCategoryWhy('unknown_key', true)).toBe('');
  });

  it('returns empty string for unknown key (bipolar=false)', () => {
    expect(getCategoryWhy('unknown_key', false)).toBe('');
  });

  it('bipolar and general blurbs differ for caffeine', () => {
    expect(getCategoryWhy('caffeine', true)).not.toBe(getCategoryWhy('caffeine', false));
  });

  it('bipolar and general blurbs differ for alcohol', () => {
    expect(getCategoryWhy('alcohol', true)).not.toBe(getCategoryWhy('alcohol', false));
  });
});

// ─── 7. getActivityRef() ──────────────────────────────────────────────────────

describe('getActivityRef()', () => {
  const CATEGORIES = ['grounding', 'sleep', 'self_esteem', 'forgiveness', 'reflection', 'custom', 'other', 'workbook', 'routine'];

  it('returns a ref for every category when bipolar=true', () => {
    CATEGORIES.forEach((cat) => {
      const ref = getActivityRef(cat, true);
      expect(ref).not.toBeNull();
      expect(ref!.why).toBeTruthy();
      expect(ref!.ref.citation).toBeTruthy();
      expect(ref!.ref.url).toMatch(/^https?:\/\//);
    });
  });

  it('returns a ref for every category when bipolar=false', () => {
    CATEGORIES.forEach((cat) => {
      const ref = getActivityRef(cat, false);
      expect(ref).not.toBeNull();
      expect(ref!.why).toBeTruthy();
      expect(ref!.ref.citation).toBeTruthy();
      expect(ref!.ref.url).toMatch(/^https?:\/\//);
    });
  });

  it('returns undefined for unknown category regardless of flag', () => {
    expect(getActivityRef('nonexistent', true)).toBeUndefined();
    expect(getActivityRef('nonexistent', false)).toBeUndefined();
  });

  it('bipolar and general refs differ for grounding', () => {
    const b = getActivityRef('grounding', true);
    const g = getActivityRef('grounding', false);
    expect(b!.why).not.toBe(g!.why);
  });

  it('bipolar ref for grounding mentions bipolar disorder', () => {
    expect(getActivityRef('grounding', true)!.why.toLowerCase()).toContain('bipolar');
  });

  it('general ref for grounding does NOT mention bipolar disorder', () => {
    expect(getActivityRef('grounding', false)!.why.toLowerCase()).not.toContain('bipolar');
  });

  it('bipolar ref for routine mentions IPSRT', () => {
    const why = getActivityRef('routine', true)!.why;
    expect(why.toUpperCase()).toContain('IPSRT');
  });

  it('general ref for routine does NOT mention IPSRT', () => {
    const why = getActivityRef('routine', false)!.why;
    expect(why.toUpperCase()).not.toContain('IPSRT');
  });
});

// ─── 8. ACTIVITY_REFS _general variants — no bipolar language ────────────────

describe('ACTIVITY_REFS _general variants', () => {
  const GENERAL_KEYS = [
    'grounding_general', 'sleep_general', 'self_esteem_general',
    'forgiveness_general', 'reflection_general', 'custom_general',
    'other_general', 'workbook_general', 'routine_general',
  ];

  it('each _general key exists in ACTIVITY_REFS', () => {
    GENERAL_KEYS.forEach((k) => {
      expect(ACTIVITY_REFS[k]).toBeDefined();
    });
  });

  it('no _general why blurb contains the word "bipolar"', () => {
    GENERAL_KEYS.forEach((k) => {
      expect(ACTIVITY_REFS[k].why.toLowerCase()).not.toContain('bipolar');
    });
  });

  it('no _general why blurb contains "manic" or "depressive episode"', () => {
    GENERAL_KEYS.forEach((k) => {
      const why = ACTIVITY_REFS[k].why.toLowerCase();
      expect(why).not.toContain('manic episode');
      expect(why).not.toContain('depressive episode');
    });
  });

  it('each _general ref has a valid HTTPS citation URL', () => {
    GENERAL_KEYS.forEach((k) => {
      expect(ACTIVITY_REFS[k].ref.url).toMatch(/^https?:\/\//);
    });
  });

  it('each _general ref has a non-empty citation string', () => {
    GENERAL_KEYS.forEach((k) => {
      expect(ACTIVITY_REFS[k].ref.citation.length).toBeGreaterThan(10);
    });
  });
});

// ─── 9. buildReportMessages() ────────────────────────────────────────────────

describe('buildReportMessages()', () => {
  const sampleData = { userId: 'u1', weekStart: '2025-01-01', weekEnd: '2025-01-07' };

  it('bipolar prompt references bipolar disorder', () => {
    const messages = buildReportMessages(sampleData as any, true);
    const systemPrompt = messages[0].content.toLowerCase();
    expect(systemPrompt).toContain('bipolar');
  });

  it('general prompt does NOT reference bipolar disorder', () => {
    const messages = buildReportMessages(sampleData as any, false);
    const systemPrompt = messages[0].content.toLowerCase();
    expect(systemPrompt).not.toContain('bipolar');
  });

  it('general prompt contains neutral wellbeing language', () => {
    const messages = buildReportMessages(sampleData as any, false);
    const systemPrompt = messages[0].content.toLowerCase();
    expect(systemPrompt).toContain('wellbeing');
  });

  it('bipolar prompt references spectrum diagnosis', () => {
    const messages = buildReportMessages(sampleData as any, true);
    expect(messages[0].content).toContain('spectrum diagnosis');
  });

  it('general prompt references wellbeing (not bipolar framing)', () => {
    const messages = buildReportMessages(sampleData as any, false);
    expect(messages[0].content.toLowerCase()).toContain('wellbeing');
  });

  it('defaults to bipolar=true if flag omitted', () => {
    const withFlag    = buildReportMessages(sampleData as any, true);
    const withDefault = buildReportMessages(sampleData as any);
    expect(withDefault[0].content).toBe(withFlag[0].content);
  });

  it('returns exactly 2 messages [system, user]', () => {
    const messages = buildReportMessages(sampleData as any, false);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });
});

// ─── 10. buildMonthlyReportMessages() ────────────────────────────────────────

describe('buildMonthlyReportMessages()', () => {
  const sampleData = { userId: 'u1', weekStart: '2025-01-01', weekEnd: '2025-01-31' };

  it('bipolar prompt references bipolar disorder', () => {
    const messages = buildMonthlyReportMessages(sampleData as any, true);
    expect(messages[0].content.toLowerCase()).toContain('bipolar');
  });

  it('general prompt does NOT reference bipolar disorder', () => {
    const messages = buildMonthlyReportMessages(sampleData as any, false);
    expect(messages[0].content.toLowerCase()).not.toContain('bipolar');
  });

  it('defaults to bipolar=true if flag omitted', () => {
    const withFlag    = buildMonthlyReportMessages(sampleData as any, true);
    const withDefault = buildMonthlyReportMessages(sampleData as any);
    expect(withDefault[0].content).toBe(withFlag[0].content);
  });

  it('returns exactly 2 messages [system, user]', () => {
    const messages = buildMonthlyReportMessages(sampleData as any, false);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });
});

// ─── 11. SECTIONS_BIPOLAR — structure + content contracts ────────────────────

describe('SECTIONS_BIPOLAR', () => {
  it('has exactly 7 sections', () => {
    expect(SECTIONS_BIPOLAR).toHaveLength(7);
  });

  it('each section has exactly 7 prompts', () => {
    SECTIONS_BIPOLAR.forEach((sec) => {
      expect(sec.prompts).toHaveLength(7);
    });
  });

  it('each section has a non-empty title and icon', () => {
    SECTIONS_BIPOLAR.forEach((sec) => {
      expect(sec.title.length).toBeGreaterThan(0);
      expect(sec.icon.length).toBeGreaterThan(0);
    });
  });

  it('each prompt has non-empty q, sub, and help fields', () => {
    SECTIONS_BIPOLAR.forEach((sec) => {
      sec.prompts.forEach((p) => {
        expect(p.q.length).toBeGreaterThan(0);
        expect(p.sub.length).toBeGreaterThan(0);
        expect(p.help.length).toBeGreaterThan(0);
      });
    });
  });

  it('first section title references bipolar', () => {
    expect(SECTIONS_BIPOLAR[0].title.toLowerCase()).toContain('bipolar');
  });

  it('contains at least one section mentioning relapse or episode', () => {
    const allTitles = SECTIONS_BIPOLAR.map((s) => s.title.toLowerCase()).join(' ');
    const allHelp   = SECTIONS_BIPOLAR.flatMap((s) => s.prompts.map((p) => p.help.toLowerCase())).join(' ');
    expect(allTitles + allHelp).toMatch(/relapse|episode/);
  });

  it('total prompt count is 49', () => {
    const total = SECTIONS_BIPOLAR.reduce((sum, sec) => sum + sec.prompts.length, 0);
    expect(total).toBe(49);
  });
});

// ─── 12. SECTIONS_GENERAL — structure + no bipolar language ──────────────────

describe('SECTIONS_GENERAL', () => {
  it('has exactly 7 sections', () => {
    expect(SECTIONS_GENERAL).toHaveLength(7);
  });

  it('each section has exactly 7 prompts', () => {
    SECTIONS_GENERAL.forEach((sec) => {
      expect(sec.prompts).toHaveLength(7);
    });
  });

  it('no section title contains "Bipolar"', () => {
    SECTIONS_GENERAL.forEach((sec) => {
      expect(sec.title.toLowerCase()).not.toContain('bipolar');
    });
  });

  it('no prompt q or sub contains "bipolar"', () => {
    SECTIONS_GENERAL.forEach((sec) => {
      sec.prompts.forEach((p) => {
        expect(p.q.toLowerCase()).not.toContain('bipolar');
        expect(p.sub.toLowerCase()).not.toContain('bipolar');
      });
    });
  });

  it('no prompt q mentions "manic episode" or "depressive episode"', () => {
    SECTIONS_GENERAL.forEach((sec) => {
      sec.prompts.forEach((p) => {
        expect(p.q.toLowerCase()).not.toContain('manic episode');
        expect(p.q.toLowerCase()).not.toContain('depressive episode');
      });
    });
  });

  it('no section title or prompt uses "lithium"', () => {
    const allText = SECTIONS_GENERAL.flatMap((s) => [
      s.title,
      ...s.prompts.map((p) => p.q + ' ' + p.sub),
    ]).join(' ').toLowerCase();
    expect(allText).not.toContain('lithium');
  });

  it('total prompt count is 49', () => {
    const total = SECTIONS_GENERAL.reduce((sum, sec) => sum + sec.prompts.length, 0);
    expect(total).toBe(49);
  });

  it('same number of sections as SECTIONS_BIPOLAR', () => {
    expect(SECTIONS_GENERAL).toHaveLength(SECTIONS_BIPOLAR.length);
  });

  it('section titles differ from SECTIONS_BIPOLAR (adapted, not copied)', () => {
    const differentCount = SECTIONS_BIPOLAR.filter(
      (sec, i) => sec.title !== SECTIONS_GENERAL[i].title,
    ).length;
    expect(differentCount).toBeGreaterThan(0);
  });
});

// ─── 13. SYMPTOMS_BIPOLAR — contains clinical bipolar terms ──────────────────

describe('SYMPTOMS_BIPOLAR', () => {
  it('covers all 4 cycle states', () => {
    expect(SYMPTOMS_BIPOLAR.stable).toBeDefined();
    expect(SYMPTOMS_BIPOLAR.manic).toBeDefined();
    expect(SYMPTOMS_BIPOLAR.depressive).toBeDefined();
    expect(SYMPTOMS_BIPOLAR.mixed).toBeDefined();
  });

  it('manic symptoms include "Grandiosity"', () => {
    expect(lower(SYMPTOMS_BIPOLAR.manic)).toContain('grandiosity');
  });

  it('manic symptoms include "Overspending"', () => {
    expect(lower(SYMPTOMS_BIPOLAR.manic)).toContain('overspending');
  });

  it('depressive symptoms include "Hopelessness"', () => {
    expect(lower(SYMPTOMS_BIPOLAR.depressive)).toContain('hopelessness');
  });

  it('each state has at least 2 symptoms', () => {
    (['stable', 'manic', 'depressive', 'mixed'] as const).forEach((state) => {
      expect(SYMPTOMS_BIPOLAR[state].length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── 14. SYMPTOMS_GENERAL — no clinical bipolar terms ────────────────────────

describe('SYMPTOMS_GENERAL', () => {
  it('covers all 4 cycle states', () => {
    expect(SYMPTOMS_GENERAL.stable).toBeDefined();
    expect(SYMPTOMS_GENERAL.manic).toBeDefined();
    expect(SYMPTOMS_GENERAL.depressive).toBeDefined();
    expect(SYMPTOMS_GENERAL.mixed).toBeDefined();
  });

  it('manic symptoms do NOT include "Grandiosity"', () => {
    expect(lower(SYMPTOMS_GENERAL.manic)).not.toContain('grandiosity');
  });

  it('manic symptoms do NOT include "Overspending"', () => {
    expect(lower(SYMPTOMS_GENERAL.manic)).not.toContain('overspending');
  });

  it('depressive symptoms do NOT include "Hopelessness"', () => {
    expect(lower(SYMPTOMS_GENERAL.depressive)).not.toContain('hopelessness');
  });

  it('manic symptoms include accessible alternative: "Busy / fast mind"', () => {
    const joined = SYMPTOMS_GENERAL.manic.join(' ').toLowerCase();
    expect(joined).toContain('busy');
  });

  it('depressive symptoms include accessible alternative: "Low mood"', () => {
    const joined = SYMPTOMS_GENERAL.depressive.join(' ').toLowerCase();
    expect(joined).toContain('low mood');
  });

  it('no symptom in any state contains the word "bipolar"', () => {
    (['stable', 'manic', 'depressive', 'mixed'] as const).forEach((state) => {
      SYMPTOMS_GENERAL[state].forEach((sym) => {
        expect(sym.toLowerCase()).not.toContain('bipolar');
      });
    });
  });

  it('stable symptoms are identical between bipolar and general', () => {
    expect(SYMPTOMS_GENERAL.stable).toEqual(SYMPTOMS_BIPOLAR.stable);
  });

  it('each state has at least 2 symptoms', () => {
    (['stable', 'manic', 'depressive', 'mixed'] as const).forEach((state) => {
      expect(SYMPTOMS_GENERAL[state].length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── 15. EXPLORE_LINKS — bipolar vs general contracts ────────────────────────

describe('EXPLORE_LINKS', () => {
  it('both lists have the same number of links', () => {
    expect(EXPLORE_LINKS_BIPOLAR).toHaveLength(EXPLORE_LINKS_GENERAL.length);
  });

  it('both lists have 6 links', () => {
    expect(EXPLORE_LINKS_BIPOLAR).toHaveLength(6);
  });

  it('every link has icon, label, sub, and route fields', () => {
    [...EXPLORE_LINKS_BIPOLAR, ...EXPLORE_LINKS_GENERAL].forEach((link) => {
      expect(link.icon.length).toBeGreaterThan(0);
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.sub.length).toBeGreaterThan(0);
      expect(link.route.length).toBeGreaterThan(0);
    });
  });

  it('bipolar workbook link sub is "Bipolar exercises"', () => {
    const wb = EXPLORE_LINKS_BIPOLAR.find((l) => l.route === '/workbook');
    expect(wb?.sub).toBe('Bipolar exercises');
  });

  it('general workbook link sub is "Wellness exercises"', () => {
    const wb = EXPLORE_LINKS_GENERAL.find((l) => l.route === '/workbook');
    expect(wb?.sub).toBe('Wellness exercises');
  });

  it('general workbook sub does NOT contain "Bipolar"', () => {
    const wb = EXPLORE_LINKS_GENERAL.find((l) => l.route === '/workbook');
    expect(wb?.sub.toLowerCase()).not.toContain('bipolar');
  });

  it('general tracker label is "90-Day Mood Chart" (not "Cycle")', () => {
    const tracker = EXPLORE_LINKS_GENERAL.find((l) => l.route === '/(tabs)/tracker');
    expect(tracker?.label).toBe('90-Day Mood Chart');
  });

  it('both lists contain links to workbook, tracker, and psychiatrists', () => {
    const requiredRoutes = ['/workbook', '/(tabs)/tracker', '/psychiatrists'];
    requiredRoutes.forEach((route) => {
      expect(EXPLORE_LINKS_BIPOLAR.some((l) => l.route === route)).toBe(true);
      expect(EXPLORE_LINKS_GENERAL.some((l) => l.route === route)).toBe(true);
    });
  });

  it('no general link sub or label contains the word "Bipolar"', () => {
    EXPLORE_LINKS_GENERAL.forEach((link) => {
      expect(link.sub.toLowerCase()).not.toContain('bipolar');
      expect(link.label.toLowerCase()).not.toContain('bipolar');
    });
  });
});
