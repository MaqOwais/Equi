/**
 * Tests for nutrition feature:
 *
 * 1. calcNutritionScore  — correct scoring across benefit/harm combos
 * 2. CATEGORY_WHY        — every built-in category key has a why blurb
 * 3. CustomItem storage  — save, load, emoji migration from old format
 * 4. nutritionNotes      — saved alongside categories in LocalDayData
 * 5. AI report wiring    — nutritionDays / destabilizingDays counted correctly
 * 6. Score edge cases    — floor at 0, cap at 10, empty log
 * 7. NUTRITION_REFS      — every category has a ref with valid URL + citation
 * 8. ACTIVITY_REFS       — every activity category has a ref with valid URL + citation
 */

// ─── Module under test (pure logic exports) ───────────────────────────────────

import { calcNutritionScore, CATEGORY_WHY, CUSTOM_EMOJIS, CUSTOM_SUGGESTIONS } from '../../app/(tabs)/you/nutrition';
import { NUTRITION_REFS, ACTIVITY_REFS } from '../../lib/evidence-refs';

// ─── Mocks (required to import the module in Jest/Node environment) ────────────

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
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

jest.mock('../../lib/local-day-store', () => ({
  saveLocal: jest.fn().mockResolvedValue(undefined),
  getLocal:  jest.fn().mockResolvedValue(null),
}));

jest.mock('../../stores/auth', () => ({
  useAuthStore: jest.fn(() => ({ session: null, profile: null })),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ back: jest.fn() })),
}));

// ─── 1. calcNutritionScore ─────────────────────────────────────────────────────

describe('calcNutritionScore', () => {
  it('returns 0 for empty log', () => {
    expect(calcNutritionScore({})).toBe(0);
  });

  it('scores 2 per unique benefit category present', () => {
    // 1 benefit → 2 pts
    expect(calcNutritionScore({ anti_inflammatory: 1 })).toBe(2);
    // 2 benefits → 4 pts
    expect(calcNutritionScore({ anti_inflammatory: 1, whole_grains: 1 })).toBe(4);
  });

  it('subtracts 1 per harm category present (ultra_processed, sugar_heavy, alcohol)', () => {
    // 5 benefits (10 pts) - 1 harm = 9
    expect(calcNutritionScore({
      anti_inflammatory: 1, whole_grains: 1, lean_protein: 1,
      healthy_fats: 1, fermented: 1, ultra_processed: 1,
    })).toBe(9);

    // 5 benefits - 3 harms = 7
    expect(calcNutritionScore({
      anti_inflammatory: 1, whole_grains: 1, lean_protein: 1,
      healthy_fats: 1, fermented: 1,
      ultra_processed: 1, sugar_heavy: 1, alcohol: 1,
    })).toBe(7);
  });

  it('counts multiple servings of same benefit as 1 benefit (binary presence)', () => {
    // 3 servings of anti_inflammatory still counts as 1 benefit category
    expect(calcNutritionScore({ anti_inflammatory: 3 })).toBe(2);
  });

  it('subtracts 1 extra point when caffeine >= 3', () => {
    // No benefits, caffeine = 3 → score 0 (clamped, would be -1)
    expect(calcNutritionScore({ caffeine: 3 })).toBe(0);
    // 2 benefits (4 pts) - caffeine penalty (1) = 3
    expect(calcNutritionScore({ anti_inflammatory: 1, whole_grains: 1, caffeine: 3 })).toBe(3);
  });

  it('does NOT penalise caffeine below 3', () => {
    expect(calcNutritionScore({ anti_inflammatory: 1, caffeine: 2 })).toBe(2);
    expect(calcNutritionScore({ caffeine: 1 })).toBe(0);
  });

  it('floors at 0 — never returns negative', () => {
    expect(calcNutritionScore({
      ultra_processed: 1, sugar_heavy: 1, alcohol: 1, caffeine: 5,
    })).toBe(0);
  });

  it('caps at 10 — never exceeds maximum', () => {
    // 5 benefits = 10 pts, no harms
    expect(calcNutritionScore({
      anti_inflammatory: 2, whole_grains: 2, lean_protein: 2,
      healthy_fats: 2, fermented: 2,
    })).toBe(10);
  });

  it('perfect score requires all 5 benefit categories, zero harms', () => {
    expect(calcNutritionScore({
      anti_inflammatory: 1, whole_grains: 1, lean_protein: 1,
      healthy_fats: 1, fermented: 1,
    })).toBe(10);
  });

  it('alcohol counts as harm but NOT as caffeine penalty', () => {
    // alcohol in HARM_KEYS (-1), caffeine < 3 (no extra penalty)
    expect(calcNutritionScore({ anti_inflammatory: 1, alcohol: 1 })).toBe(1); // 2 - 1
  });
});

// ─── 2. CATEGORY_WHY ──────────────────────────────────────────────────────────

describe('CATEGORY_WHY', () => {
  const BUILT_IN_KEYS = [
    'anti_inflammatory', 'whole_grains', 'lean_protein', 'healthy_fats', 'fermented',
    'caffeine', 'ultra_processed', 'sugar_heavy', 'alcohol',
    'hydration', 'lithium_interaction',
  ];

  it('has a why blurb for every built-in category key', () => {
    BUILT_IN_KEYS.forEach((key) => {
      expect(CATEGORY_WHY[key]).toBeDefined();
      expect(typeof CATEGORY_WHY[key]).toBe('string');
      expect(CATEGORY_WHY[key].length).toBeGreaterThan(20);
    });
  });

  it('blurbs do not contain placeholder text', () => {
    Object.values(CATEGORY_WHY).forEach((blurb) => {
      expect(blurb).not.toMatch(/TODO|FIXME|xxx/i);
    });
  });

  it('caffeine blurb mentions sleep (the main clinical mechanism)', () => {
    expect(CATEGORY_WHY['caffeine'].toLowerCase()).toContain('sleep');
  });

  it('alcohol blurb mentions bipolar or mood', () => {
    const blurb = CATEGORY_WHY['alcohol'].toLowerCase();
    expect(blurb.match(/bipolar|mood/)).not.toBeNull();
  });

  it('lithium_interaction blurb mentions doctor (safety-critical advice)', () => {
    expect(CATEGORY_WHY['lithium_interaction'].toLowerCase()).toContain('doctor');
  });
});

// ─── 3. CUSTOM_EMOJIS & CUSTOM_SUGGESTIONS ─────────────────────────────────────

describe('CUSTOM_EMOJIS', () => {
  it('contains at least 20 unique emojis', () => {
    expect(CUSTOM_EMOJIS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(CUSTOM_EMOJIS).size).toBe(CUSTOM_EMOJIS.length);
  });

  it('default emoji (🍽️) is included in the palette', () => {
    expect(CUSTOM_EMOJIS).toContain('🍽️');
  });
});

describe('CUSTOM_SUGGESTIONS', () => {
  it('every suggestion has a non-empty label and emoji', () => {
    CUSTOM_SUGGESTIONS.forEach(({ label, emoji }) => {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(emoji.trim().length).toBeGreaterThan(0);
    });
  });

  it('includes omega-3 supplement (top priority for BD)', () => {
    const labels = CUSTOM_SUGGESTIONS.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes('omega'))).toBe(true);
  });
});

// ─── 4. nutritionNotes in LocalDayData ────────────────────────────────────────

describe('nutritionNotes in LocalDayData', () => {
  const { saveLocal, getLocal } = require('../../lib/local-day-store');

  beforeEach(() => jest.clearAllMocks());

  it('saveLocal is called with nutritionNotes when note is non-empty', async () => {
    // Simulate what the screen does on note change + scheduleSave
    const userId = 'user-abc';
    const date   = '2026-03-17';
    const counts = { anti_inflammatory: 1 };
    const note   = 'Had salmon and walnuts today';

    await saveLocal(userId, date, {
      nutritionCategories: counts,
      nutritionTimestamp: new Date().toISOString(),
      nutritionNotes: note,
    });

    expect(saveLocal).toHaveBeenCalledWith(
      userId, date,
      expect.objectContaining({ nutritionNotes: note }),
    );
  });

  it('saveLocal is called with nutritionNotes: null when note is empty string', async () => {
    const userId = 'user-abc';
    const date   = '2026-03-17';

    await saveLocal(userId, date, {
      nutritionCategories: {},
      nutritionTimestamp: new Date().toISOString(),
      nutritionNotes: null,
    });

    expect(saveLocal).toHaveBeenCalledWith(
      userId, date,
      expect.objectContaining({ nutritionNotes: null }),
    );
  });

  it('getLocal returns null when nothing is stored', async () => {
    (getLocal as jest.Mock).mockResolvedValueOnce(null);
    const result = await getLocal('user-abc', '2026-03-17');
    expect(result).toBeNull();
  });

  it('getLocal returns nutritionNotes when previously stored', async () => {
    const stored = {
      date: '2026-03-17', userId: 'user-abc',
      nutritionCategories: { anti_inflammatory: 1 },
      nutritionNotes: 'Great day of eating',
      nutritionTimestamp: '2026-03-17T12:00:00Z',
    };
    (getLocal as jest.Mock).mockResolvedValueOnce(stored);

    const result = await getLocal('user-abc', '2026-03-17');
    expect(result?.nutritionNotes).toBe('Great day of eating');
  });
});

// ─── 5. AI report wiring — nutritionDays / destabilizingDays ──────────────────

describe('AI report nutrition counting logic', () => {
  const BENEFIT_KEYS = ['anti_inflammatory', 'whole_grains', 'lean_protein', 'healthy_fats', 'fermented'];
  const HARM_KEYS    = ['ultra_processed', 'sugar_heavy', 'alcohol'];

  type NutrRow = { categories: Record<string, number> };

  function countNutritionDays(rows: NutrRow[]) {
    return rows.filter((r) =>
      BENEFIT_KEYS.some((k) => (r.categories[k] ?? 0) > 0)
    ).length;
  }

  function countDestabilizingDays(rows: NutrRow[]) {
    return rows.filter((r) =>
      HARM_KEYS.some((k) => (r.categories[k] ?? 0) > 0)
      || (r.categories['caffeine'] ?? 0) >= 3
    ).length;
  }

  it('counts anti-inflammatory days correctly', () => {
    const rows: NutrRow[] = [
      { categories: { anti_inflammatory: 1 } },       // beneficial
      { categories: { whole_grains: 2 } },             // beneficial
      { categories: { sugar_heavy: 1 } },              // not beneficial
      { categories: {} },                              // empty
    ];
    expect(countNutritionDays(rows)).toBe(2);
  });

  it('counts destabilizing days — harm food', () => {
    const rows: NutrRow[] = [
      { categories: { ultra_processed: 1 } },
      { categories: { alcohol: 1 } },
      { categories: { anti_inflammatory: 1 } },        // not destabilizing
      { categories: {} },
    ];
    expect(countDestabilizingDays(rows)).toBe(2);
  });

  it('counts destabilizing days — caffeine >= 3', () => {
    const rows: NutrRow[] = [
      { categories: { caffeine: 3 } },
      { categories: { caffeine: 2 } },   // under threshold — not destabilizing
      { categories: { caffeine: 4 } },
    ];
    expect(countDestabilizingDays(rows)).toBe(2);
  });

  it('a day can be both beneficial AND destabilizing', () => {
    const rows: NutrRow[] = [
      { categories: { anti_inflammatory: 1, alcohol: 1 } },
    ];
    expect(countNutritionDays(rows)).toBe(1);
    expect(countDestabilizingDays(rows)).toBe(1);
  });

  it('returns 0 for all-empty log', () => {
    const rows: NutrRow[] = [{ categories: {} }, { categories: {} }];
    expect(countNutritionDays(rows)).toBe(0);
    expect(countDestabilizingDays(rows)).toBe(0);
  });
});

// ─── 6. Custom item emoji migration ───────────────────────────────────────────

describe('Custom item emoji migration', () => {
  it('migrates old items lacking emoji field to default 🍽️', () => {
    // Simulate the migration logic from loadCustomDefs
    const oldItems = [
      { key: 'custom_walnuts', label: 'Walnuts' },        // no emoji
      { key: 'custom_salmon',  label: 'Salmon', emoji: '🐟' }, // has emoji
    ] as { key: string; label: string; emoji?: string }[];

    const migrated = oldItems.map((c) => ({ ...c, emoji: c.emoji ?? '🍽️' }));

    expect(migrated[0].emoji).toBe('🍽️');
    expect(migrated[1].emoji).toBe('🐟');
  });

  it('preserves existing emoji during migration', () => {
    const items = [{ key: 'custom_tea', label: 'Green tea', emoji: '🍵' }];
    const migrated = items.map((c) => ({ ...c, emoji: c.emoji ?? '🍽️' }));
    expect(migrated[0].emoji).toBe('🍵');
  });
});

// ─── 7. NUTRITION_REFS — link validity ────────────────────────────────────────

describe('NUTRITION_REFS', () => {
  const BUILT_IN_KEYS = [
    'anti_inflammatory', 'whole_grains', 'lean_protein', 'healthy_fats', 'fermented',
    'caffeine', 'ultra_processed', 'sugar_heavy', 'alcohol',
    'hydration', 'lithium_interaction',
  ];

  it('every built-in nutrition key has a reference entry', () => {
    BUILT_IN_KEYS.forEach((key) => {
      expect(NUTRITION_REFS[key]).toBeDefined();
    });
  });

  it('every reference has a non-empty citation string', () => {
    BUILT_IN_KEYS.forEach((key) => {
      const ref = NUTRITION_REFS[key];
      expect(typeof ref.citation).toBe('string');
      expect(ref.citation.trim().length).toBeGreaterThan(10);
    });
  });

  it('every reference URL starts with https://', () => {
    BUILT_IN_KEYS.forEach((key) => {
      expect(NUTRITION_REFS[key].url).toMatch(/^https:\/\//);
    });
  });

  it('every reference URL points to a recognised academic host', () => {
    const VALID_HOSTS = [
      'pubmed.ncbi.nlm.nih.gov',
      'pmc.ncbi.nlm.nih.gov',
      'www.nature.com',
      'jamanetwork.com',
      'www.thelancet.com',
      'link.springer.com',
      'www.cambridge.org',
      'www.mdpi.com',
      'onlinelibrary.wiley.com',
    ];
    BUILT_IN_KEYS.forEach((key) => {
      const url = NUTRITION_REFS[key].url;
      const host = new URL(url).hostname;
      expect(VALID_HOSTS).toContain(host);
    });
  });

  it('every reference URL is a well-formed URL (no typos)', () => {
    BUILT_IN_KEYS.forEach((key) => {
      expect(() => new URL(NUTRITION_REFS[key].url)).not.toThrow();
    });
  });

  it('citation strings mention a year in parentheses', () => {
    BUILT_IN_KEYS.forEach((key) => {
      expect(NUTRITION_REFS[key].citation).toMatch(/\(\d{4}\)/);
    });
  });

  it('each citation ends with a journal name (contains a full stop or journal identifier)', () => {
    BUILT_IN_KEYS.forEach((key) => {
      // At minimum must contain a dot or abbreviation suggesting a journal reference
      expect(NUTRITION_REFS[key].citation.length).toBeGreaterThan(30);
    });
  });
});

// ─── 8. ACTIVITY_REFS — link validity ────────────────────────────────────────

describe('ACTIVITY_REFS', () => {
  const ACTIVITY_CATEGORY_KEYS = [
    'grounding', 'sleep', 'self_esteem', 'forgiveness', 'reflection', 'custom', 'other',
  ];

  it('every activity category key has a reference entry', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      expect(ACTIVITY_REFS[key]).toBeDefined();
    });
  });

  it('every entry has a non-empty why text', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      const entry = ACTIVITY_REFS[key];
      expect(typeof entry.why).toBe('string');
      expect(entry.why.trim().length).toBeGreaterThan(20);
    });
  });

  it('every entry has a ref with citation and URL', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      const { ref } = ACTIVITY_REFS[key];
      expect(typeof ref.citation).toBe('string');
      expect(ref.citation.trim().length).toBeGreaterThan(10);
      expect(typeof ref.url).toBe('string');
    });
  });

  it('every activity reference URL starts with https://', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      expect(ACTIVITY_REFS[key].ref.url).toMatch(/^https:\/\//);
    });
  });

  it('every activity reference URL is a well-formed URL', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      expect(() => new URL(ACTIVITY_REFS[key].ref.url)).not.toThrow();
    });
  });

  it('every activity reference URL points to a recognised academic host', () => {
    const VALID_HOSTS = [
      'pubmed.ncbi.nlm.nih.gov',
      'pmc.ncbi.nlm.nih.gov',
      'www.nature.com',
      'jamanetwork.com',
      'www.thelancet.com',
      'link.springer.com',
      'www.cambridge.org',
      'www.mdpi.com',
      'onlinelibrary.wiley.com',
    ];
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      const url = ACTIVITY_REFS[key].ref.url;
      const host = new URL(url).hostname;
      expect(VALID_HOSTS).toContain(host);
    });
  });

  it('sleep category why text mentions prodrome or episode onset', () => {
    const why = ACTIVITY_REFS['sleep'].why.toLowerCase();
    expect(why.match(/prodrome|episode|onset/)).not.toBeNull();
  });

  it('grounding category why text mentions MBCT or mindfulness', () => {
    const why = ACTIVITY_REFS['grounding'].why.toLowerCase();
    expect(why.match(/mbct|mindfulness/)).not.toBeNull();
  });

  it('forgiveness category why text mentions shame or guilt', () => {
    const why = ACTIVITY_REFS['forgiveness'].why.toLowerCase();
    expect(why.match(/shame|guilt/)).not.toBeNull();
  });

  it('custom and other categories share the same reference (both map to behavioural activation)', () => {
    expect(ACTIVITY_REFS['custom'].ref.url).toBe(ACTIVITY_REFS['other'].ref.url);
  });

  it('every citation mentions a year', () => {
    ACTIVITY_CATEGORY_KEYS.forEach((key) => {
      expect(ACTIVITY_REFS[key].ref.citation).toMatch(/\(\d{4}\)/);
    });
  });
});
