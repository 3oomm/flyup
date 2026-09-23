import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import { usePublicProjectStore } from './usePublicProjectStore';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

describe('public project detail requests', () => {
  beforeEach(() => {
    usePublicProjectStore.setState({ currentPublicProject: null, isDetailLoading: false });
  });

  it('keeps the newest project when an older request finishes last', async () => {
    const oldRequest = deferred<{ data: { data: { id: number; title: string } } }>();
    const newRequest = deferred<{ data: { data: { id: number; title: string } } }>();
    vi.mocked(api.get).mockImplementation(url => {
      if (url === '/projects/1') return oldRequest.promise;
      return newRequest.promise;
    });

    const first = usePublicProjectStore.getState().fetchPublicProjectById(1);
    const second = usePublicProjectStore.getState().fetchPublicProjectBySlug('second-2');
    newRequest.resolve({ data: { data: { id: 2, title: 'Second' } } });
    await second;
    oldRequest.resolve({ data: { data: { id: 1, title: 'First' } } });
    await first;

    expect(usePublicProjectStore.getState().currentPublicProject?.id).toBe(2);
    expect(usePublicProjectStore.getState().isDetailLoading).toBe(false);
  });

  it('does not clear loading while the newest request is pending', async () => {
    const oldRequest = deferred<{ data: { data: { id: number } } }>();
    const newRequest = deferred<{ data: { data: { id: number } } }>();
    vi.mocked(api.get).mockImplementation(url => url === '/projects/1' ? oldRequest.promise : newRequest.promise);

    const first = usePublicProjectStore.getState().fetchPublicProjectById(1);
    const second = usePublicProjectStore.getState().fetchPublicProjectById(2);
    oldRequest.resolve({ data: { data: { id: 1 } } });
    await first;
    expect(usePublicProjectStore.getState().isDetailLoading).toBe(true);
    expect(usePublicProjectStore.getState().currentPublicProject).toBeNull();

    newRequest.resolve({ data: { data: { id: 2 } } });
    await second;
    expect(usePublicProjectStore.getState().currentPublicProject?.id).toBe(2);
  });
});
