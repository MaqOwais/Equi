import { useCrisisStore } from '../../stores/crisis';

// schedulePostCrisisCheckin touches Expo notifications — mock it
jest.mock('../../lib/notifications', () => ({
  schedulePostCrisisCheckin: jest.fn().mockResolvedValue(undefined),
}));

import { schedulePostCrisisCheckin } from '../../lib/notifications';

function getStore() {
  return useCrisisStore.getState();
}

beforeEach(() => {
  useCrisisStore.setState({ visible: false, lastOpenedAt: null });
  jest.clearAllMocks();
});

describe('crisis store', () => {
  it('starts hidden', () => {
    expect(getStore().visible).toBe(false);
    expect(getStore().lastOpenedAt).toBeNull();
  });

  it('open() makes the modal visible', () => {
    getStore().open();
    expect(getStore().visible).toBe(true);
  });

  it('open() records the timestamp', () => {
    const before = Date.now();
    getStore().open();
    const after = Date.now();
    expect(getStore().lastOpenedAt).toBeGreaterThanOrEqual(before);
    expect(getStore().lastOpenedAt).toBeLessThanOrEqual(after);
  });

  it('close() hides the modal', () => {
    getStore().open();
    getStore().close();
    expect(getStore().visible).toBe(false);
  });

  it('close() does not clear lastOpenedAt — timestamp is preserved for check-in scheduling', () => {
    getStore().open();
    const ts = getStore().lastOpenedAt;
    getStore().close();
    expect(getStore().lastOpenedAt).toBe(ts);
  });

  it('does NOT schedule post-crisis check-in when postCrisisEnabled is false (default)', () => {
    getStore().open();
    expect(schedulePostCrisisCheckin).not.toHaveBeenCalled();
  });

  it('schedules post-crisis check-in when postCrisisEnabled is true', () => {
    getStore().open(true);
    expect(schedulePostCrisisCheckin).toHaveBeenCalledTimes(1);
  });
});
