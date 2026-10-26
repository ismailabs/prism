import type { Tab } from '@/types';

export const pageDescriptions: Record<Tab, readonly [string, string]> = {
  dashboard: ['Recorded money, clear context, and your next step.', 'Wang direkodkan, konteks jelas dan langkah seterusnya.'],
  transactions: ['Find and review the money you have recorded.', 'Cari dan semak wang yang telah direkodkan.'],
  accounts: ['Your recorded balances, in each account’s native currency.', 'Baki direkodkan dalam mata wang asal setiap akaun.'],
  plans: ['Make room for your goals and upcoming commitments.', 'Sediakan ruang untuk matlamat dan komitmen akan datang.'],
  goals: ['See what you have allocated and what remains to reach your target.', 'Lihat peruntukan anda dan baki untuk mencapai sasaran.'],
  savings: ['Earmark money for what matters. Allocations do not move cash.', 'Peruntukkan wang untuk perkara penting. Peruntukan tidak memindahkan tunai.'],
  debts: ['Keep principal, repayments, and account cash effects clear.', 'Bezakan prinsipal, bayaran balik dan kesan tunai akaun.'],
  analytics: ['Understand the patterns behind your recorded income and spending.', 'Fahami corak pendapatan dan perbelanjaan direkodkan.'],
  accounting: ['Inspect your partial shadow ledger, with native currencies kept separate.', 'Semak lejar bayangan separa dengan mata wang asal berasingan.'],
  notes: ['Keep useful context connected to your financial records.', 'Simpan konteks berguna bersama rekod kewangan anda.'],
  reminders: ['Choose your next action. Recording money always needs your confirmation.', 'Pilih tindakan seterusnya. Rekod wang sentiasa memerlukan pengesahan anda.'],
  notifications: ['Review updates from your own records and plans.', 'Semak kemas kini daripada rekod dan pelan anda.'],
  calendar: ['See dated commitments in your financial timezone.', 'Lihat komitmen bertarikh dalam zon waktu kewangan anda.'],
  categories: ['Organize income and spending without changing their financial meaning.', 'Susun pendapatan dan perbelanjaan tanpa mengubah makna kewangannya.'],
  payments: ['Name the methods you use to record payments.', 'Namakan kaedah yang digunakan untuk merekod pembayaran.'],
  settings: ['Your preferences, privacy, and account security in one place.', 'Pilihan, privasi dan keselamatan akaun anda di satu tempat.'],
};
