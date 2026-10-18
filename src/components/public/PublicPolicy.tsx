import { useAppStore } from '@/store/useAppStore';
import './public.css';

type PolicyKind = 'privacy' | 'terms';
const contact = 'https://www.ismailstudio.my/#contact';
const copy = {
  en: {
    privacy: 'Privacy notice', terms: 'Terms of use', home: 'Back to PRISM', language: 'Language',
    updated: 'Updated 13 October 2026', operator: 'PRISM is operated by Ismail in Malaysia.',
    contactTitle: 'Contact and requests', contactLink: 'Contact Ismail',
    contactBody: 'For support, privacy questions, access or correction requests, use the contact route on Ismail’s existing website. Send a brief request or an opaque incident reference first. Do not send passwords, MFA codes, financial exports or complete financial screenshots. Opening that website or WhatsApp is your choice and uses the other service’s privacy terms.',
    sections: {
      privacy: [
        ['Information you provide', 'PRISM processes your sign-in email, profile and display preferences, authentication sessions and enrolled MFA information. It stores financial records you choose to enter: accounts and opening balances, transaction amounts/currencies/dates/descriptions, category and payment labels, transfers, debts and repayments, budgets and reserves, goals and contributions, notes, reminders and planning records. Do not enter information about another person unless you have authority to do so.'],
        ['Purposes and choices', 'We use this information to authenticate and protect account access and provide your private financial workspace, reports, calendar and planning tools. Email sign-in requires an email account and password. Financial records are optional; tools that depend on a record cannot calculate results without it. You can edit your entries, download the current transaction page or use confirmed account deletion. Contact the operator for other access, correction or privacy requests.'],
        ['Providers and processing', 'Vercel hosts the application. Supabase provides the database and authentication; the production database is hosted in Tokyo, Japan. Resend delivers account confirmation and recovery email. Cloudflare Turnstile provides CAPTCHA. The operator keeps encrypted recovery copies separately in a private Google Drive. Provider processing can occur outside Malaysia. These services process information needed to provide their functions; their own privacy terms also apply.'],
        ['Security, browser storage and exports', 'Account ownership, current-session checks and enrolled MFA restrict application access. PRISM stores financial records on its server and does not offer end-to-end encryption. Privacy Mode masks displayed amounts; it does not encrypt records. Your browser retains session information and preferences. The PWA caches public application assets; financial records require an online connection and financial writes are not queued offline. An export you download is a file on your device; protect it accordingly.'],
        ['Retention and deletion', 'Entered records remain in your active workspace until you edit or delete them or complete confirmed account deletion. Deletion removes the account and its owned records from the active database. Earlier copies can remain in encrypted recovery backups and provider records; active deletion does not promise immediate erasure from every backup or log. Contact the operator about applicable retention, deletion and recovery handling. Restoring an earlier backup must account for subsequent legitimate transactions and deletion requests.'],
        ['Planning and exchange rates', 'Analytics, forecasts and debt plans use the records and assumptions you supply. Exchange-rate conversions are labelled estimates and do not change original currency records. Public rate requests use the existing Frankfurter service. The shadow ledger is separate from ordinary recorded balances and does not automatically translate your historical records.'],
      ],
      terms: [
        ['Personal recordkeeping', 'PRISM helps you record and understand your own finances. It does not connect to banks, move money, make payments, trade investments or hold funds. Supply accurate records and only information you have authority to enter. Use a unique password and keep two approved authenticators independently accessible. Financial access requires an authenticator code for every sign-in method. Losing every authenticator and backup can permanently lock the account. Known breached passwords are not automatically screened.'],
        ['Estimates and financial decisions', 'Forecasts, exchange-rate conversions and debt schedules are estimates based on stated records and assumptions. They are not financial advice, bank balances or a complete valuation of your finances. Check important amounts and assumptions before making your own decisions. Planning values do not create posted transactions.'],
        ['Connection, availability and your copies', 'Loading and saving financial records requires an internet connection. Offline financial editing is unavailable. PRISM currently uses free infrastructure; service capacity and provider availability can limit access or new registrations. Do not assume continuous availability. Keep appropriate copies of important records and protect downloaded exports.'],
        ['Safe use and account control', 'Do not attempt to access another person’s records, bypass authentication or misuse the service. Use your account settings to manage preferences and security. Read the privacy notice before supplying information; confirmed account deletion has permanent consequences for active records, with the backup limitations described there.'],
      ],
    },
  },
  ms: {
    privacy: 'Notis privasi', terms: 'Syarat penggunaan', home: 'Kembali ke PRISM', language: 'Bahasa',
    updated: 'Dikemas kini pada 13 Oktober 2026', operator: 'PRISM dikendalikan oleh Ismail di Malaysia.',
    contactTitle: 'Hubungan dan permintaan', contactLink: 'Hubungi Ismail',
    contactBody: 'Untuk sokongan, soalan privasi, permintaan akses atau pembetulan, gunakan saluran hubungan pada laman web sedia ada Ismail. Hantar permintaan ringkas atau rujukan insiden tanpa maklumat sensitif dahulu. Jangan hantar kata laluan, kod MFA, eksport kewangan atau tangkap layar kewangan yang lengkap. Membuka laman tersebut atau WhatsApp ialah pilihan anda dan tertakluk kepada syarat privasi perkhidmatan berkenaan.',
    sections: {
      privacy: [
        ['Maklumat yang anda berikan', 'PRISM memproses e-mel log masuk, profil dan pilihan paparan, sesi pengesahan serta maklumat MFA yang didaftarkan. PRISM menyimpan rekod kewangan yang anda pilih untuk masukkan: akaun dan baki awal, amaun/mata wang/tarikh/keterangan transaksi, label kategori dan pembayaran, pindahan, hutang dan bayaran balik, belanjawan dan rizab, matlamat dan sumbangan, nota, peringatan serta rekod perancangan. Jangan masukkan maklumat orang lain tanpa kuasa untuk berbuat demikian.'],
        ['Tujuan dan pilihan', 'Maklumat ini digunakan untuk mengesahkan dan melindungi akses akaun serta menyediakan ruang kerja kewangan peribadi, laporan, kalendar dan alat perancangan anda. Log masuk melalui e-mel memerlukan akaun e-mel dan kata laluan. Rekod kewangan adalah pilihan; alat yang bergantung pada sesuatu rekod tidak dapat mengira hasil tanpa rekod tersebut. Anda boleh mengedit rekod, memuat turun halaman transaksi semasa atau menggunakan pemadaman akaun yang disahkan. Hubungi pengendali untuk permintaan akses, pembetulan atau privasi yang lain.'],
        ['Penyedia dan pemprosesan', 'Vercel mengehoskan aplikasi. Supabase menyediakan pangkalan data dan pengesahan; pangkalan data pengeluaran dihoskan di Tokyo, Jepun. Resend menghantar e-mel pengesahan akaun dan pemulihan. Cloudflare Turnstile menyediakan CAPTCHA. Pengendali menyimpan salinan pemulihan yang disulitkan secara berasingan dalam Google Drive peribadi. Pemprosesan penyedia boleh berlaku di luar Malaysia. Perkhidmatan ini memproses maklumat yang diperlukan untuk fungsinya; syarat privasinya sendiri turut terpakai.'],
        ['Keselamatan, storan pelayar dan eksport', 'Pemilikan akaun, semakan sesi semasa dan MFA yang didaftarkan mengehadkan akses aplikasi. PRISM menyimpan rekod kewangan pada pelayannya dan tidak menawarkan penyulitan hujung ke hujung. Mod Privasi menyembunyikan amaun yang dipaparkan; ia tidak menyulitkan rekod. Pelayar anda menyimpan maklumat sesi dan pilihan. PWA menyimpan aset aplikasi awam dalam cache; rekod kewangan memerlukan sambungan dalam talian dan penulisan kewangan tidak dibariskan semasa luar talian. Eksport yang dimuat turun menjadi fail pada peranti anda; lindungi fail tersebut.'],
        ['Penyimpanan dan pemadaman', 'Rekod yang dimasukkan kekal dalam ruang kerja aktif sehingga anda mengedit atau memadamkannya atau melengkapkan pemadaman akaun yang disahkan. Pemadaman menghapuskan akaun dan rekod miliknya daripada pangkalan data aktif. Salinan terdahulu boleh kekal dalam sandaran pemulihan yang disulitkan dan rekod penyedia; pemadaman aktif tidak menjanjikan penghapusan segera daripada setiap sandaran atau log. Hubungi pengendali tentang penyimpanan, pemadaman dan pengendalian pemulihan yang terpakai. Pemulihan sandaran terdahulu mesti mengambil kira transaksi sah dan permintaan pemadaman selepas titik sandaran.'],
        ['Perancangan dan kadar pertukaran', 'Analitik, ramalan dan pelan hutang menggunakan rekod serta andaian yang anda berikan. Penukaran kadar pertukaran dilabelkan sebagai anggaran dan tidak mengubah rekod mata wang asal. Permintaan kadar awam menggunakan perkhidmatan Frankfurter sedia ada. Lejar bayangan berasingan daripada baki rekod biasa dan tidak menterjemahkan rekod sejarah anda secara automatik.'],
      ],
      terms: [
        ['Penyimpanan rekod peribadi', 'PRISM membantu anda merekodkan dan memahami kewangan sendiri. PRISM tidak bersambung ke bank, memindahkan wang, membuat pembayaran, berdagang pelaburan atau memegang dana. Berikan rekod yang tepat dan hanya maklumat yang anda berkuasa untuk masukkan. Gunakan kata laluan unik dan pastikan dua pengesah yang diluluskan boleh dicapai secara berasingan. Akses kewangan memerlukan kod pengesah untuk setiap kaedah log masuk. Kehilangan semua pengesah dan sandaran boleh mengunci akaun secara kekal. Kata laluan yang diketahui terdedah tidak disaring secara automatik.'],
        ['Anggaran dan keputusan kewangan', 'Ramalan, penukaran kadar pertukaran dan jadual hutang ialah anggaran berdasarkan rekod dan andaian yang dinyatakan. Semua ini bukan nasihat kewangan, baki bank atau penilaian lengkap kewangan anda. Semak amaun dan andaian penting sebelum membuat keputusan sendiri. Nilai perancangan tidak mewujudkan transaksi yang direkodkan.'],
        ['Sambungan, ketersediaan dan salinan anda', 'Memuatkan dan menyimpan rekod kewangan memerlukan sambungan internet. Penyuntingan kewangan luar talian tidak tersedia. PRISM kini menggunakan infrastruktur percuma; kapasiti perkhidmatan dan ketersediaan penyedia boleh mengehadkan akses atau pendaftaran baharu. Jangan menganggap perkhidmatan sentiasa tersedia. Simpan salinan rekod penting yang sesuai dan lindungi eksport yang dimuat turun.'],
        ['Penggunaan selamat dan kawalan akaun', 'Jangan cuba mengakses rekod orang lain, memintas pengesahan atau menyalahgunakan perkhidmatan. Gunakan tetapan akaun untuk mengurus pilihan dan keselamatan. Baca notis privasi sebelum memberikan maklumat; pemadaman akaun yang disahkan mempunyai kesan kekal terhadap rekod aktif, dengan had sandaran yang diterangkan dalam notis tersebut.'],
      ],
    },
  },
};

export function PublicPolicy({ kind }: { kind: PolicyKind }) {
  const { locale, setLocale } = useAppStore();
  const text = copy[locale === 'ms' ? 'ms' : 'en'];
  return <div className="public-site">
    <a className="public-skip" href="#policy-main">{locale === 'ms' ? 'Langkau ke kandungan' : 'Skip to content'}</a>
    <header className="public-header public-container">
      <a className="brand" href="/" aria-label="PRISM"><img src="/prism.svg" width="34" height="34" alt="" /><span>PRISM</span></a>
      <nav className="public-nav" aria-label={locale === 'ms' ? 'Navigasi awam' : 'Public navigation'}><a href="/privacy">{text.privacy}</a><a href="/terms">{text.terms}</a></nav>
      <select className="input w-auto" aria-label={text.language} value={locale} onChange={event => setLocale(event.target.value === 'ms' ? 'ms' : 'en')}><option value="en">English</option><option value="ms">Bahasa Melayu</option></select>
    </header>
    <main id="policy-main" className="public-policy public-container" tabIndex={-1}>
      <h1>{text[kind]}</h1><p className="text-subtle">{text.updated}</p><p>{text.operator}</p>
      {text.sections[kind].map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      <section><h2>{text.contactTitle}</h2><p>{text.contactBody}</p><a className="text-link" href={contact} rel="noreferrer">{text.contactLink}</a></section>
    </main>
    <footer className="public-footer public-container"><a href="/">{text.home}</a><a href="/privacy">{text.privacy}</a><a href="/terms">{text.terms}</a></footer>
  </div>;
}
