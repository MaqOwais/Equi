import { useHomeLayoutStore, DEFAULT_ORDER, type SectionId } from '../../stores/homeLayout';

// Mock AsyncStorage — we're testing in-memory state logic, not persistence
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function getStore() {
  return useHomeLayoutStore.getState();
}

function resetStore() {
  useHomeLayoutStore.setState({ order: [...DEFAULT_ORDER], isLoaded: false });
}

beforeEach(resetStore);

// ─── moveUp ───────────────────────────────────────────────────────────────────

describe('moveUp', () => {
  it('moves a section one position earlier', async () => {
    const before = getStore().order;
    const target = before[2]; // e.g. 'journal'
    await getStore().moveUp(target);
    expect(getStore().order[1]).toBe(target);
  });

  it('does nothing when section is already first', async () => {
    const first = getStore().order[0];
    const orderBefore = [...getStore().order];
    await getStore().moveUp(first);
    expect(getStore().order).toEqual(orderBefore);
  });
});

// ─── moveDown ─────────────────────────────────────────────────────────────────

describe('moveDown', () => {
  it('moves a section one position later', async () => {
    const before = getStore().order;
    const target = before[1];
    await getStore().moveDown(target);
    expect(getStore().order[2]).toBe(target);
  });

  it('does nothing when section is already last', async () => {
    const last = getStore().order[getStore().order.length - 1];
    const orderBefore = [...getStore().order];
    await getStore().moveDown(last);
    expect(getStore().order).toEqual(orderBefore);
  });
});

// ─── show ─────────────────────────────────────────────────────────────────────

describe('show', () => {
  it('adds a hidden section to the end', async () => {
    // 'nutrition' is hidden by default (not in DEFAULT_ORDER)
    await getStore().show('nutrition');
    const order = getStore().order;
    expect(order).toContain('nutrition');
    expect(order[order.length - 1]).toBe('nutrition');
  });

  it('is idempotent — does not duplicate an already-visible section', async () => {
    const alreadyVisible = getStore().order[0];
    await getStore().show(alreadyVisible);
    const count = getStore().order.filter((id) => id === alreadyVisible).length;
    expect(count).toBe(1);
  });
});

// ─── hide ─────────────────────────────────────────────────────────────────────

describe('hide', () => {
  it('removes a section from the order', async () => {
    const target = getStore().order[1];
    await getStore().hide(target);
    expect(getStore().order).not.toContain(target);
  });

  it('does not affect other sections', async () => {
    const target = getStore().order[2];
    const others = getStore().order.filter((id) => id !== target);
    await getStore().hide(target);
    others.forEach((id) => expect(getStore().order).toContain(id));
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('restores the default order after customisation', async () => {
    await getStore().moveUp(getStore().order[3]);
    await getStore().hide(getStore().order[0]);
    await getStore().show('nutrition' as SectionId);
    await getStore().reset();
    expect(getStore().order).toEqual(DEFAULT_ORDER);
  });
});
