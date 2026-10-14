import { useRef, useState, type FormEvent } from 'react';
import { usePlatformMutation, usePlatformTable } from '@/hooks/usePlatformData';
import { useCategories, useCategoryMutations, useUpdateProfile } from '@/hooks/useFinanceData';
import { validTimezone } from '@/domain/dates';
import { decimalMoney, parseMoney } from '@/domain/money';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/utils';
import type { Currency, Locale, Profile } from '@/types';
import { Button } from '../ui/button';
import { currencies, useFinancialCopy } from './shared';

export function Onboarding({ profile }: { profile: Profile }) {
  const c = useFinancialCopy();
  const { user } = useAuth();
  const initialSetup: unknown = user?.user_metadata?.prism_setup_preferences;
  const malaysiaFirstRun = !!initialSetup && typeof initialSetup === 'object' && 'currency' in initialSetup && initialSetup.currency === 'MYR';
  const setupLanguage = initialSetup && typeof initialSetup === 'object' && 'language' in initialSetup && (initialSetup.language === 'en' || initialSetup.language === 'ms') ? initialSetup.language : profile.language;
  const accounts = usePlatformTable('accounts');
  const mutations = usePlatformMutation('accounts');
  const update = useUpdateProfile();
  const categories = useCategoryMutations();
  const existingCategories = useCategories();
  const [skipped, setSkipped] = useState(() => {
    try { return localStorage.getItem(`prism-setup:${profile.id}`) === 'done'; } catch { return false; }
  });
  // Existing profile choices remain visible. Malaysia defaults are explicit and reversible.
  const [currency, setCurrency] = useState<Currency>(malaysiaFirstRun ? 'MYR' : profile.currency);
  const [timezone, setTimezone] = useState(malaysiaFirstRun ? 'Asia/Kuala_Lumpur' : profile.financial_timezone ?? 'Asia/Kuala_Lumpur');
  const [language, setLanguage] = useState<Locale>(setupLanguage);
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('0');
  const [defaults, setDefaults] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSteps, setSavedSteps] = useState({ preferences: false, categories: 'pending' as 'pending' | 'skipped' | 'complete' });
  const savingLock = useRef(false);
  const createdCategories = useRef(new Set<string>());
  function finish() {
    try { localStorage.setItem(`prism-setup:${profile.id}`, 'done'); } catch { /* Dismissal still works in this session. */ }
    setSkipped(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (savingLock.current) return;
    setError('');
    setSavedSteps({ preferences: false, categories: 'pending' });
    savingLock.current = true;
    setSaving(true);
    try {
      if (!navigator.onLine) throw new Error(c('Reconnect before saving setup.', 'Sambung semula sebelum menyimpan persediaan.'));
      if (!name.trim()) throw new Error(c('Enter a name for your first account.', 'Masukkan nama untuk akaun pertama anda.'));
      if (!validTimezone(timezone)) throw new Error(c('Choose a valid IANA timezone.', 'Pilih zon waktu IANA yang sah.'));
      const openingBalance = decimalMoney(parseMoney(opening, currency), currency);
      // These existing mutations are separate operations; partial saves are disclosed on failure.
      await update.mutateAsync({ currency, financial_timezone: timezone, language });
      setSavedSteps(previous => ({ ...previous, preferences: true }));
      if (defaults) {
        const ms = language === 'ms';
        for (const category of [
          { name: ms ? 'Makanan' : 'Food', type: 'expense' as const, color: '#b45309' },
          { name: ms ? 'Pengangkutan' : 'Transport', type: 'expense' as const, color: '#4265ee' },
          { name: ms ? 'Gaji' : 'Salary', type: 'income' as const, color: '#047857' },
        ]) {
          const key = `${category.type}:${category.name}`;
          if (!createdCategories.current.has(key) && !existingCategories.data?.some(row => row.type === category.type && row.name === category.name)) {
            await categories.create.mutateAsync(category);
            createdCategories.current.add(key);
          }
        }
      }
      setSavedSteps(previous => ({ ...previous, categories: defaults ? 'complete' : 'skipped' }));
      await mutations.create.mutateAsync({ name: name.trim(), currency, opening_balance: openingBalance, archived: false });
      finish();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally { savingLock.current = false; setSaving(false); }
  }
  // An optimistic account is not confirmation that the server saved setup.
  // Keep the progress/error surface mounted until the complete save settles.
  if (skipped || accounts.isPending || (!saving && accounts.data?.length)) return null;
  return <section className="card onboarding p-5 space-y-4 mb-5" aria-label={c('Quick setup', 'Persediaan ringkas')}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{c('YOUR FIRST STEP', 'LANGKAH PERTAMA ANDA')}</p><h2 className="font-semibold">{c('Start with your financial foundations', 'Mulakan asas kewangan anda')}</h2></div><Button variant="ghost" type="button" disabled={saving} onClick={finish}>{c('Skip setup', 'Langkau persediaan')}</Button></div>
    <p className="onboarding-note">{c('Start with one real account. Setup is optional, and you can change these choices in Settings. No sample transactions will be added.', 'Mulakan dengan satu akaun sebenar. Persediaan adalah pilihan, dan anda boleh mengubah pilihan ini dalam Tetapan. Tiada transaksi contoh akan ditambah.')}</p>
    {(saving || !!error || savedSteps.preferences || savedSteps.categories !== 'pending') && <div aria-live="polite"><p className="onboarding-note">{c('Confirmed during the last save attempt:', 'Disahkan semasa percubaan simpan terakhir:')}</p><ol className="setup-progress"><li>{c('Preferences', 'Pilihan')}: {savedSteps.preferences ? c('Saved', 'Disimpan') : c('Not yet confirmed', 'Belum disahkan')}</li><li>{c('Optional categories', 'Kategori pilihan')}: {savedSteps.categories === 'complete' ? c('Complete', 'Selesai') : savedSteps.categories === 'skipped' ? c('Skipped', 'Dilangkau') : c('Not yet complete', 'Belum selesai')}</li><li>{c('Account', 'Akaun')}: {saving ? c('Not yet confirmed', 'Belum disahkan') : c('Review before retrying', 'Semak sebelum mencuba semula')}</li></ol></div>}
    {accounts.error || existingCategories.error ? <><p role="alert" className="error-message">{errorMessage(accounts.error ?? existingCategories.error)}</p><Button onClick={() => void Promise.all([accounts.refetch(), existingCategories.refetch()])}>{c('Retry', 'Cuba lagi')}</Button></> : <form onSubmit={e => void save(e)}>
      <fieldset disabled={saving || existingCategories.isPending} className="grid sm:grid-cols-2 gap-3">
        <legend>{c('1. Your preferences', '1. Pilihan anda')}</legend>
        <label className="form-field">{c('Primary currency', 'Mata wang utama')}<select className="input" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="form-field">{c('Setup language', 'Bahasa persediaan')}<select className="input" value={language} onChange={e => setLanguage(e.target.value === 'ms' ? 'ms' : 'en')}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select></label>
        <label className="form-field">{c('Financial timezone', 'Zon waktu kewangan')}<input className="input" required value={timezone} onChange={e => setTimezone(e.target.value)} aria-describedby="setup-timezone-note" /></label>
        <div className="flex items-center"><Button variant="outline" type="button" onClick={() => { setCurrency('MYR'); setTimezone('Asia/Kuala_Lumpur'); }}>{c('Use Malaysia defaults', 'Guna pilihan lalai Malaysia')}</Button></div>
        <p id="setup-timezone-note" className="onboarding-note sm:col-span-2">{c('Asia/Kuala_Lumpur is the Malaysian default. Your existing timezone is preserved until you choose and save a change.', 'Asia/Kuala_Lumpur ialah zon waktu lalai Malaysia. Zon waktu sedia ada dikekalkan sehingga anda memilih dan menyimpan perubahan.')}</p>
      </fieldset>
      <fieldset disabled={saving || existingCategories.isPending} className="grid sm:grid-cols-2 gap-3">
        <legend>{c('2. Your first account', '2. Akaun pertama anda')}</legend>
        <label className="form-field">{c('First account', 'Akaun pertama')}<input className="input" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={c('Everyday account', 'Akaun harian')} /></label>
        <label className="form-field">{c('Opening balance', 'Baki permulaan')}<input className="input" required inputMode="decimal" value={opening} onChange={e => setOpening(e.target.value)} aria-describedby="setup-opening-note" /></label>
        <p id="setup-opening-note" className="onboarding-note sm:col-span-2">{c('Enter the actual starting amount in the selected currency, or leave zero. It is a starting balance, not income.', 'Masukkan amaun permulaan sebenar dalam mata wang dipilih, atau biarkan sifar. Ia baki permulaan, bukan pendapatan.')}</p>
        <label className="flex gap-2 items-center text-sm sm:col-span-2"><input type="checkbox" checked={defaults} onChange={e => setDefaults(e.target.checked)} />{c('Add starter categories', 'Tambah kategori permulaan')}</label>
        <p className="onboarding-note sm:col-span-2">{c('Setup saves preferences, categories and the account separately. If a step fails, earlier successful steps remain saved. Review them before retrying an uncertain request.', 'Persediaan menyimpan pilihan, kategori dan akaun secara berasingan. Jika satu langkah gagal, langkah terdahulu yang berjaya kekal disimpan. Semak sebelum mencuba semula permintaan yang tidak pasti.')}</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={!navigator.onLine || saving || existingCategories.isPending}>{saving ? c('Saving setup…', 'Menyimpan persediaan…') : c('Save setup', 'Simpan persediaan')}</Button><Button type="button" variant="outline" onClick={() => useAppStore.getState().setActiveTab('transactions')}>{c('Optional CSV import', 'Import CSV pilihan')}</Button><a className="text-link" href="/demo" aria-disabled={saving} tabIndex={saving ? -1 : undefined} onClick={event => { if (saving) event.preventDefault(); }}>{c('See a synthetic demo', 'Lihat demo sintetik')}</a></div>
      </fieldset>
    </form>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </section>;
}
