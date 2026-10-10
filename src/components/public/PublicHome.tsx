import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Compass, Layers, Moon, Sun, Target, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { loginPath } from '@/lib/routes';

/** Fixed illustrative text only. This module deliberately has no finance/Auth API imports. */
function SyntheticPreview() {
  const ms = useAppStore(s => s.locale) === 'ms';
  const c = (en: string, my: string) => ms ? my : en;
  const [period, setPeriod] = useState<'past' | 'present' | 'future'>('present');
  return <section className="public-preview" aria-label={c('Synthetic product preview', 'Pratonton produk sintetik')}>
    <div className="preview-top"><span><img src="/prism.svg" width="24" height="24" alt="" />PRISM</span><span className="demo-badge">{c('SYNTHETIC DEMO', 'DEMO SINTETIK')}</span></div>
    <p className="preview-greeting">{c('A little perspective.', 'Sedikit perspektif.')}</p>
    <h2>{c('Your money, in focus.', 'Wang anda, lebih jelas.')}</h2>
    <div className="preview-periods" role="group" aria-label={c('Preview perspective', 'Perspektif pratonton')}>
      {(['past', 'present', 'future'] as const).map((item, i) => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{ms ? ['Lalu', 'Kini', 'Hadapan'][i] : ['Past', 'Present', 'Future'][i]}</button>)}
    </div>
    <div className="preview-body" aria-live="polite" aria-atomic="true">
      {period === 'future' ? <>
        <div className="demo-metric"><p>{c('An illustrative goal', 'Matlamat contoh')}</p><strong>MYR 3,000.00</strong><small>{c('A target, not money in an account.', 'Sasaran, bukan wang dalam akaun.')}</small></div>
        <div className="demo-goal"><Target size={18} /><div><strong>{c('Emergency fund', 'Dana kecemasan')}</strong><span>{c('MYR 750.00 earmarked · 25% of target', 'MYR 750.00 diperuntukkan · 25% sasaran')}</span></div></div>
        <p className="demo-explanation">{c('Plans are separate from recorded activity. PRISM does not automatically move your money.', 'Pelan berasingan daripada aktiviti yang direkodkan. PRISM tidak memindahkan wang anda secara automatik.')}</p>
      </> : <>
        <div className="demo-metric"><p>{period === 'past' ? c('Illustrative period cash flow', 'Aliran tunai tempoh contoh') : c('Illustrative account balance', 'Baki akaun contoh')}</p><strong>{period === 'past' ? 'MYR 850.00' : 'MYR 2,450.00'}</strong><small>{c('Sample values. Not a connected bank account.', 'Nilai contoh. Bukan akaun bank yang disambungkan.')}</small></div>
        <div className="demo-flows"><div><ArrowDownLeft size={16} /><span>{c('Income', 'Pendapatan')}</span><strong>MYR 3,200.00</strong></div><div><ArrowUpRight size={16} /><span>{c('Spending', 'Perbelanjaan')}</span><strong>MYR 2,350.00</strong></div></div>
        <div className="demo-activity"><p>{c('Sample records', 'Rekod contoh')}</p><div><span><Wallet size={16} />{c('Groceries', 'Barangan dapur')}</span><strong>− MYR 85.00</strong></div><div><span><ArrowRight size={16} />{c('Transfer to savings', 'Pindahan ke simpanan')}</span><strong>MYR 200.00</strong></div></div>
        <p className="demo-explanation">{c('Transfers move money between your accounts. They are separate from income and spending.', 'Pindahan menggerakkan wang antara akaun anda. Ia berasingan daripada pendapatan dan perbelanjaan.')}</p>
      </>}
    </div>
    <p className="demo-disclosure">{c('Illustration only. Nothing here is saved to accounts, reports or exports.', 'Ilustrasi sahaja. Tiada nilai di sini disimpan ke akaun, laporan atau eksport.')}</p>
  </section>;
}

export function PublicHome({ demoOnly = false }: { demoOnly?: boolean }) {
  const { locale, theme, setLocale, setTheme } = useAppStore();
  const ms = locale === 'ms';
  const c = (en: string, my: string) => ms ? my : en;
  const signup = loginPath('/dashboard', true);
  const jobs = [
    [c('Record', 'Rekod'), c('Give every ringgit a place.', 'Beri setiap ringgit tempatnya.'), c('Log income and spending, name your accounts, and import a CSV when you have one.', 'Rekod pendapatan dan perbelanjaan, namakan akaun, dan import CSV jika ada.')],
    [c('Understand', 'Fahami'), c('See the shape of your spending.', 'Lihat corak perbelanjaan anda.'), c('Compare periods and explore categories. Open the actual records behind a chart.', 'Bandingkan tempoh dan terokai kategori. Buka rekod sebenar di sebalik carta.')],
    [c('Plan', 'Rancang'), c('Make room for what matters.', 'Sediakan ruang untuk perkara penting.'), c('Set category budgets, earmark savings for goals, and track personal debts separately.', 'Tetapkan bajet kategori, peruntukkan simpanan untuk matlamat, dan jejak hutang peribadi secara berasingan.')],
    [c('Act', 'Bertindak'), c('Take one useful next step.', 'Ambil satu langkah berguna.'), c('Review upcoming commitments and explicitly confirm recurring records when they are due.', 'Semak komitmen akan datang dan sahkan sendiri rekod berulang apabila tiba masanya.')],
  ];
  const layers = [
    [c('Records', 'Rekod'), c('Transactions, accounts and transfers', 'Transaksi, akaun dan pindahan')],
    [c('Accounting', 'Perakaunan'), c('Exact native amounts and derived account balances. The full ledger is in development.', 'Amaun asal tepat dan baki akaun terbitan. Lejar penuh sedang dibangunkan.')],
    [c('Planning', 'Perancangan'), c('Budgets and recurring activity', 'Bajet dan aktiviti berulang')],
    [c('Progress', 'Kemajuan'), c('Goals, savings allocations and repayments', 'Matlamat, peruntukan simpanan dan bayaran balik')],
    [c('Action', 'Tindakan'), c('Useful next steps from your recorded activity', 'Langkah berguna daripada aktiviti yang direkodkan')],
    [c('Intelligence', 'Pemahaman'), c('Period comparisons and rule-based observations today. No AI advice.', 'Perbandingan tempoh dan pemerhatian berasaskan peraturan kini. Tiada nasihat AI.')],
  ];
  const faqs = [
    [c('Does PRISM connect to my bank?', 'Adakah PRISM bersambung ke bank saya?'), c('No. You enter records yourself or import a CSV. PRISM does not move money, make payments or trade investments.', 'Tidak. Anda memasukkan rekod sendiri atau mengimport CSV. PRISM tidak memindahkan wang, membuat pembayaran atau berdagang pelaburan.')],
    [c('Is the preview my real financial data?', 'Adakah pratonton menggunakan data kewangan sebenar saya?'), c('No. Every preview value is a fixed synthetic example. It is never added to your accounts, exports or reports.', 'Tidak. Setiap nilai pratonton ialah contoh sintetik tetap. Ia tidak pernah ditambah ke akaun, eksport atau laporan anda.')],
    [c('What does cash flow mean?', 'Apakah maksud aliran tunai?'), c('Income minus ordinary spending for a period. It is not your account balance, actual savings or net worth. Transfers, goal allocations and debt principal are tracked separately.', 'Pendapatan tolak perbelanjaan biasa bagi satu tempoh. Ia bukan baki akaun, simpanan sebenar atau nilai bersih anda. Pindahan, peruntukan matlamat dan prinsipal hutang dijejak secara berasingan.')],
    [c('Can I use English or Bahasa Melayu?', 'Bolehkah saya menggunakan English atau Bahasa Melayu?'), c('Yes. Choose either language, MYR or another supported currency, and your financial timezone. Saved native amounts keep their original currency.', 'Ya. Pilih salah satu bahasa, MYR atau mata wang lain yang disokong, dan zon waktu kewangan anda. Amaun asal yang disimpan mengekalkan mata wang asalnya.')],
    [c('Can I use PRISM offline?', 'Bolehkah saya menggunakan PRISM tanpa internet?'), c('An internet connection is required to load and save financial records. Offline financial editing is not available.', 'Sambungan internet diperlukan untuk memuatkan dan menyimpan rekod kewangan. Penyuntingan kewangan tanpa internet tidak tersedia.')],
  ];
  return <div className="public-site">
    <a className="public-skip" href="#public-main">{c('Skip to content', 'Langkau ke kandungan')}</a>
    <header className="public-header public-container">
      <a className="brand" href="/" aria-label="PRISM"><img src="/prism.svg" width="34" height="34" alt="" /><span>PRISM<span className="brand-caption">{c('A clearer perspective', 'Perspektif lebih jelas')}</span></span></a>
      <nav className="public-nav" aria-label={c('Public navigation', 'Navigasi awam')}><a href="/#how-it-works">{c('How it works', 'Cara ia berfungsi')}</a><a href="/#questions">FAQ</a></nav>
      <div className="public-controls"><select className="input" aria-label={c('Language', 'Bahasa')} value={locale} onChange={e => setLocale(e.target.value === 'ms' ? 'ms' : 'en')}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select><button className="public-theme" aria-label={c('Switch colour theme', 'Tukar tema warna')} onClick={() => setTheme(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><a className="public-login" href={loginPath('/dashboard')}>{c('Sign in', 'Log masuk')}<ArrowRight size={16} /></a></div>
    </header>
    <main id="public-main" tabIndex={-1}>
      <section className="public-hero public-container">
        <div className="hero-copy"><p className="public-eyebrow"><span />{c('A PERSONAL FINANCE SPACE, MADE FOR MALAYSIA', 'RUANG KEWANGAN PERIBADI, UNTUK MALAYSIA')}</p><h1>{demoOnly ? c('A little look inside.', 'Sekilas pandang di dalam.') : <>{c('Life has many sides.', 'Hidup ada banyak sisi.')}<br /><em>{c('See your money clearly.', 'Lihat wang anda dengan jelas.')}</em></>}</h1><p className="hero-description">{c('Turn scattered records into a clearer view of your past, present and future. Record, understand, plan and act — at your own pace.', 'Jadikan rekod yang berselerak gambaran lebih jelas tentang masa lalu, kini dan hadapan. Rekod, fahami, rancang dan bertindak — mengikut rentak anda.')}</p><div className="hero-actions"><a className="public-cta" href={signup}>{c('Create your space', 'Cipta ruang anda')}<ArrowRight size={18} /></a><a className="public-text-link" href={demoOnly ? '/' : '#preview'}>{demoOnly ? c('Explore PRISM', 'Terokai PRISM') : c('Explore the demo', 'Terokai demo')}<ChevronRight size={17} /></a></div><p className="hero-footnote">{c('English & Bahasa Melayu · MYR first · Your own records', 'English & Bahasa Melayu · Utamakan MYR · Rekod anda sendiri')}</p></div>
        <div id="preview" className="hero-preview"><div className="spectrum-lines" aria-hidden="true"><span /><span /><span /><span /></div><SyntheticPreview /></div>
      </section>
      {!demoOnly && <>
        <section className="public-story public-container" aria-labelledby="story-title"><p className="public-eyebrow">{c('ONE LIFE. A WHOLE SPECTRUM.', 'SATU KEHIDUPAN. PELBAGAI SPEKTRUM.')}</p><h2 id="story-title">{c('A prism reveals what was there all along.', 'Prisma menampakkan apa yang sudah ada.')}</h2><p>{c('PRISM stands for Personal Resource Insight & Spectrum Manager. A place to bring your financial signals together, so small decisions feel easier to understand.', 'PRISM bermaksud Personal Resource Insight & Spectrum Manager. Tempat menyatukan isyarat kewangan anda, supaya keputusan kecil lebih mudah difahami.')}</p><div className="public-audiences">{[c('For students finding their footing', 'Untuk pelajar yang mencari arah'), c('For your first salary and the next', 'Untuk gaji pertama dan seterusnya'), c('For freelancers with changing months', 'Untuk pekerja bebas dengan bulan yang berbeza')].map(text => <span key={text}><Check size={16} />{text}</span>)}</div></section>
        <section id="how-it-works" className="public-section public-container" aria-labelledby="jobs-title"><div className="public-section-heading"><p className="public-eyebrow">{c('FROM SIGNAL TO CLARITY', 'DARIPADA ISYARAT KEPADA KEJELASAN')}</p><h2 id="jobs-title">{c('Four simple jobs. One connected space.', 'Empat tugas ringkas. Satu ruang bersambung.')}</h2></div><div className="public-job-grid">{jobs.map(([name, title, body], i) => <article key={name}><span className="public-step">0{i + 1} / {name}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
        <section className="public-horizons public-container" aria-label={c('Past, present and future', 'Lalu, kini dan hadapan')}>{[[c('Past', 'Lalu'), c('Understand your patterns.', 'Fahami corak anda.'), c('Explore recorded activity and compare calendar periods.', 'Terokai aktiviti yang direkodkan dan bandingkan tempoh kalendar.')], [c('Present', 'Kini'), c('Know where you stand.', 'Ketahui kedudukan anda.'), c('Check account balances and outstanding personal debts in their native currencies.', 'Semak baki akaun dan hutang peribadi tertunggak dalam mata wang asal.')], [c('Future', 'Hadapan'), c('Give your plans direction.', 'Beri arah kepada pelan anda.'), c('Set budgets and goal targets. Plans remain separate from recorded money.', 'Tetapkan bajet dan sasaran matlamat. Pelan kekal berasingan daripada wang yang direkodkan.')]].map(([name, title, body]) => <article key={name}><p className="public-eyebrow">{name}</p><h3>{title}</h3><p>{body}</p></article>)}</section>
        <section className="public-section public-container" aria-labelledby="layers-title"><div className="public-section-heading"><Layers size={25} /><h2 id="layers-title">{c('Clarity is built in layers.', 'Kejelasan terbina dalam lapisan.')}</h2><p>{c('The product direction, grounded in what works today.', 'Arah produk, berpaksikan fungsi yang tersedia kini.')}</p></div><ol className="public-layer-list">{layers.map(([name, body], i) => <li key={name}><span aria-hidden="true">0{i + 1}</span><h3>{name}</h3><p>{body}</p></li>)}</ol></section>
        <section className="public-trust public-container" aria-labelledby="trust-title"><Compass size={28} /><div><p className="public-eyebrow">{c('CLEAR ABOUT THE DETAILS', 'JELAS TENTANG BUTIRANNYA')}</p><h2 id="trust-title">{c('Your records deserve care.', 'Rekod anda wajar dijaga.')}</h2><p>{c('Financial views require sign-in. Two-factor authentication is available. Your native amounts retain exact decimal precision; currency conversions are marked as estimates.', 'Paparan kewangan memerlukan log masuk. Pengesahan dua faktor tersedia. Amaun asal anda mengekalkan ketepatan perpuluhan; penukaran mata wang ditandakan sebagai anggaran.')}</p><p>{c('The public demo uses only synthetic values. Privacy Mode masks displayed amounts for people nearby; it does not encrypt your records. PRISM stores financial records on its server and does not offer end-to-end encryption.', 'Demo awam hanya menggunakan nilai sintetik. Mod Privasi menyembunyikan amaun yang dipaparkan daripada orang berdekatan; ia tidak menyulitkan rekod anda. PRISM menyimpan rekod kewangan pada pelayannya dan tidak menawarkan penyulitan hujung ke hujung.')}</p></div></section>
        <section id="questions" className="public-section public-container" aria-labelledby="faq-title"><div className="public-section-heading"><p className="public-eyebrow">FAQ</p><h2 id="faq-title">{c('A few things to know.', 'Beberapa perkara untuk diketahui.')}</h2></div><div className="public-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
        <section className="public-closing public-container"><p className="public-eyebrow">{c('A LITTLE CLARITY, EVERY DAY', 'SEDIKIT KEJELASAN, SETIAP HARI')}</p><h2>{c('Start with what you know.', 'Mulakan dengan apa yang anda tahu.')}</h2><p>{c('One account. One record. A clearer perspective.', 'Satu akaun. Satu rekod. Perspektif lebih jelas.')}</p><a className="public-cta" href={signup}>{c('Create your space', 'Cipta ruang anda')}<ArrowRight size={18} /></a></section>
      </>}
    </main>
    <footer className="public-footer public-container"><span>PRISM · Personal Resource Insight & Spectrum Manager</span><a href="/demo">{c('Synthetic preview', 'Pratonton sintetik')}</a><span>{c('Built by Ismail', 'Dibina oleh Ismail')}</span></footer>
  </div>;
}
