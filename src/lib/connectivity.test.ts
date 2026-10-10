import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { connectedFetch, queryDefaults } from './connectivity';
afterEach(() => { vi.unstubAllGlobals(); onlineManager.setOnline(true); });
describe('financial connectivity boundary', () => {
  it('rejects an offline financial write without sending or queuing it on reconnect', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request); vi.stubGlobal('navigator', { onLine: false });
    onlineManager.setOnline(false);
    const client = new QueryClient({ defaultOptions: queryDefaults });
    const mutation = client.getMutationCache().build(client, { mutationFn: () => connectedFetch('https://fixture.supabase.co/rest/v1/transactions', { method: 'POST' }) });
    await expect(mutation.execute(undefined)).rejects.toThrow('PRISM_OFFLINE');
    expect(mutation.state.status).toBe('error'); expect(mutation.state.isPaused).toBe(false);
    vi.stubGlobal('navigator', { onLine: true }); onlineManager.setOnline(true);
    await client.resumePausedMutations(); expect(request).not.toHaveBeenCalled(); client.clear();
  });
  it('uses network-only HTTP requests for both reads and writes', async () => {
    vi.stubGlobal('navigator', { onLine: true }); const request = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', request);
    for (const method of ['GET', 'POST']) await connectedFetch('https://fixture.supabase.co/rest/v1/transactions', { method, cache: 'force-cache' });
    expect(request.mock.calls.map(call => call[1].cache)).toEqual(['no-store', 'no-store']);
  });
});
