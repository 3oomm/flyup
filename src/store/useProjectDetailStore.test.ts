import { describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import { useProjectDetailStore } from './useProjectDetailStore';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

describe('public project details', () => {
  it('does not request private investor identities for a guest', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    await useProjectDetailStore.getState().fetchAll(7, false);

    expect(vi.mocked(api.get).mock.calls.map(([url]) => url)).toEqual([
      '/projects/7/updates',
      '/projects/7/threads',
      '/projects/7/faqs',
    ]);
    expect(useProjectDetailStore.getState().investorCount).toBeNull();
  });

  it('keeps the newest project details when an older request finishes last', async () => {
    let finishOld!: (value: { data: { data: [] } }) => void;
    const oldUpdates = new Promise<{ data: { data: [] } }>(resolve => { finishOld = resolve; });
    vi.mocked(api.get).mockImplementation(url => {
      if (url === '/projects/1/updates') return oldUpdates;
      if (url === '/projects/2/threads') return Promise.resolve({ data: { data: [{ id: 2, body: 'Second' }] } });
      return Promise.resolve({ data: { data: [] } });
    });

    const first = useProjectDetailStore.getState().fetchAll(1, false);
    const second = useProjectDetailStore.getState().fetchAll(2, false);
    await second;
    finishOld({ data: { data: [] } });
    await first;

    expect(useProjectDetailStore.getState().threads).toEqual([{ id: 2, body: 'Second' }]);
  });
});
