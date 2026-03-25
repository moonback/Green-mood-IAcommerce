import { describe, it, expect, beforeEach, vi } from 'vitest';

const selectMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: selectMock,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

const { useSettingsStore, DEFAULT_SETTINGS, __resetSettingsStoreCacheForTests } = await import('../settingsStore');

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSettingsStoreCacheForTests();
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS, isLoading: true });
  });

  it('loads and merges settings from Supabase on success', async () => {
    selectMock.mockResolvedValueOnce({
      data: [
        { key: 'store_name', value: 'Eco CBD Lille' },
        { key: 'delivery_fee', value: 7.5 },
      ],
      error: null,
    });

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(fromMock).toHaveBeenCalledWith('store_settings');
    expect(state.settings.store_name).toBe('Eco CBD Lille');
    expect(state.settings.delivery_fee).toBe(7.5);
    expect(state.settings.store_email).toBe(DEFAULT_SETTINGS.store_email);
    expect(state.isLoading).toBe(false);
  });

  it('migrates legacy budtender_enabled to chat/voice flags', async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ key: 'budtender_enabled', value: false }],
      error: null,
    });

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.settings.budtender_chat_enabled).toBe(false);
    expect(state.settings.budtender_voice_enabled).toBe(false);
  });

  it('keeps loading false and defaults when Supabase returns empty payload', async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null });

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('handles Supabase error response and keeps defaults', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    selectMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    });

    await useSettingsStore.getState().fetchSettings();

    expect(consoleSpy).toHaveBeenCalled();
    expect(useSettingsStore.getState().isLoading).toBe(false);
    expect(useSettingsStore.getState().settings.store_name).toBe(DEFAULT_SETTINGS.store_name);

    consoleSpy.mockRestore();
  });

  it('synchronizes in-memory settings with updateSettingsInStore', () => {
    useSettingsStore.getState().updateSettingsInStore({
      store_phone: '09 99 99 99 99',
      banner_enabled: false,
    });

    const state = useSettingsStore.getState();
    expect(state.settings.store_phone).toBe('09 99 99 99 99');
    expect(state.settings.banner_enabled).toBe(false);
    expect(state.settings.store_name).toBe(DEFAULT_SETTINGS.store_name);
  });
});
