export interface InstallRequest extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const initial = { waiting: null as ServiceWorker | null, install: null as InstallRequest | null, unavailable: false };
let state = initial;
const listeners = new Set<() => void>();
export const pwaSnapshot = () => state;
export const pwaServerSnapshot = () => initial;
export const subscribePwa = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const publish = (change: Partial<typeof initial>) => { state = { ...state, ...change }; listeners.forEach(listener => listener()); };
let reloadRequested = false;
export function startPwa() {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); publish({ install: event as InstallRequest }); });
  window.addEventListener('appinstalled', () => publish({ install: null }));
  if (!import.meta.env.PROD || import.meta.env.MODE === 'test' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadRequested) window.location.reload(); });
  void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
    const check = () => publish({ waiting: registration.waiting });
    check();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', check));
    const update = () => { if (navigator.onLine) void registration.update().catch(() => publish({ unavailable: true })); };
    window.addEventListener('online', update);
    window.addEventListener('focus', update);
  }).catch(() => publish({ unavailable: true }));
}
export async function installPwa() {
  const request = state.install;
  if (!request) return;
  await request.prompt(); await request.userChoice;
  publish({ install: null });
}
export function activateUpdate() {
  if (!state.waiting || !navigator.onLine) return;
  reloadRequested = true;
  state.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
}
