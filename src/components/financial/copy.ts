import { useAppStore } from "@/store/useAppStore";
const ms: Record<string, string> = {
  "Account saved": "Akaun disimpan",
  "Account deleted": "Akaun dipadam",
  "Add account": "Tambah akaun",
  "Loading accounts…": "Memuatkan akaun…",
  "No accounts yet": "Belum ada akaun",
  Archived: "Diarkibkan",
  Active: "Aktif",
  Edit: "Sunting",
  Opening: "Baki awal",
  "linked transactions": "transaksi berpaut",
  "Account restored": "Akaun dipulihkan",
  "Account archived": "Akaun diarkibkan",
  Restore: "Pulihkan",
  Archive: "Arkibkan",
  "Edit account": "Sunting akaun",
  "New account": "Akaun baharu",
  "Account name": "Nama akaun",
  Currency: "Mata wang",
  "Opening balance": "Baki awal",
  Cancel: "Batal",
  "Saving…": "Menyimpan…",
  "Save account": "Simpan akaun",
  "Delete financial account": "Padam akaun kewangan",
  Delete: "Padam",
  "This account has": "Akaun ini mempunyai",
  "Deleting…": "Memadam…",
  "Delete account": "Padam akaun",
  Accounts: "Akaun",
  "Manage accounts": "Urus akaun",
  "No active accounts": "Tiada akaun aktif",
  "linked transactions ·": "transaksi berpaut ·",
  General: "Umum",
  Goal: "Matlamat",
  "Savings target": "Sasaran simpanan",
  "Progress updated": "Kemajuan dikemas kini",
  "Milestone added": "Pencapaian ditambah",
  "New goal": "Matlamat baharu",
  "New savings target": "Sasaran simpanan baharu",
  "Loading progress…": "Memuatkan kemajuan…",
  "No goals yet": "Belum ada matlamat",
  "No savings targets yet": "Belum ada sasaran simpanan",
  Completed: "Selesai",
  Paused: "Dijeda",
  "High priority": "Keutamaan tinggi",
  of: "daripada",
  "Target date": "Tarikh sasaran",
  "GOAL DETAIL": "BUTIRAN MATLAMAT",
  "SAVINGS DETAIL": "BUTIRAN SIMPANAN",
  "No notes added.": "Tiada nota ditambah.",
  "Target reached": "Sasaran dicapai",
  "Add contribution": "Tambah sumbangan",
  "Add milestone": "Tambah pencapaian",
  Resume: "Sambung",
  Pause: "Jeda",
  Milestones: "Pencapaian",
  "No milestones yet.": "Belum ada pencapaian.",
  "Contribution history": "Sejarah sumbangan",
  "Linked transaction": "Pautan transaksi lama",
  Manual: "Manual",
  Remove: "Buang",
  "Select a target": "Pilih sasaran",
  "Edit target": "Sunting sasaran",
  Name: "Nama",
  "Target amount": "Amaun sasaran",
  "Target date (optional)": "Tarikh sasaran (pilihan)",
  Category: "Kategori",
  Priority: "Keutamaan",
  Normal: "Biasa",
  High: "Tinggi",
  Low: "Rendah",
  Notes: "Nota",
  "Save target": "Simpan sasaran",
  "Earmark account (optional)": "Akaun peruntukan (pilihan)",
  "Unassigned allocation": "Peruntukan tidak ditetapkan",
  "Link a transfer (optional)": "Pautkan pindahan (pilihan)",
  "Savings allocation": "Peruntukan simpanan",
  Transfer: "Pindahan",
  "Amount (": "Amaun (",
  "Note (optional)": "Nota (pilihan)",
  "Record contribution": "Rekod sumbangan",
  "New milestone": "Pencapaian baharu",
  "Milestone name": "Nama pencapaian",
  "Amount reached (": "Amaun dicapai (",
  "Save milestone": "Simpan pencapaian",
  "savings target": "sasaran simpanan",
  "Delete permanently": "Padam kekal",
  "Debt saved": "Hutang disimpan",
  "Repayment recorded": "Bayaran balik direkodkan",
  "Personal debt deleted": "Hutang peribadi dipadam",
  "New debt": "Hutang baharu",
  "Loading debts…": "Memuatkan hutang…",
  "No personal debts recorded": "Tiada hutang peribadi direkodkan",
  "I owe": "Hutang saya",
  "Owed to me": "Hutang kepada saya",
  Settled: "Selesai",
  Overdue: "Tertunggak",
  "% repaid": "% dibayar balik",
  "MONEY I OWE": "HUTANG SAYA",
  "MONEY OWED TO ME": "HUTANG KEPADA SAYA",
  Outstanding: "Baki hutang",
  Original: "Asal",
  "· Repaid": "· Dibayar balik",
  "Record repayment": "Rekod bayaran balik",
  "Repayment history": "Sejarah bayaran balik",
  "No repayments recorded.": "Tiada bayaran balik direkodkan.",
  "Select a debt": "Pilih hutang",
  "Edit personal debt": "Sunting hutang peribadi",
  "New personal debt": "Hutang peribadi baharu",
  Direction: "Arah",
  "I owe someone": "Saya berhutang kepada seseorang",
  "Someone owes me": "Seseorang berhutang kepada saya",
  Person: "Individu",
  "Original amount": "Amaun asal",
  "Due date (optional)": "Tarikh akhir (pilihan)",
  "Save debt": "Simpan hutang",
  "Cash account (optional)": "Akaun tunai (pilihan)",
  "Historical repayment without cash movement":
    "Bayaran balik sejarah tanpa pergerakan tunai",
  "Repayment amount (": "Amaun bayaran balik (",
  "Maximum outstanding:": "Baki hutang maksimum:",
  "Delete personal debt": "Padam hutang peribadi",
  "Only debts with no repayment history can be deleted.": "Hanya hutang tanpa sejarah bayaran balik boleh dipadam.",
  "This debt has repayments. Keep its history and cash effects until reversal support is available.": "Hutang ini mempunyai bayaran balik. Kekalkan sejarah dan kesan tunainya sehingga pembalikan disokong.",
  "No repayments are recorded for this debt. Deleting the empty record cannot be undone.": "Tiada bayaran balik direkodkan bagi hutang ini. Pemadaman rekod kosong tidak boleh dibatalkan.",
  "Delete the": "Padam",
  "record for": "rekod untuk",
  "Loading financial progress…": "Memuatkan kemajuan kewangan…",
  Contribution: "Sumbangan",
  Debt: "Hutang",
  Repayment: "Bayaran balik",
  "Financial summary": "Ringkasan kewangan",
  "Linked account position": "Kedudukan akaun berpaut",
  accounts: "akaun",
  "Add an account to track balances": "Tambah akaun untuk menjejak baki",
  "Money I owe": "Hutang saya",
  active: "aktif",
  "No active debts": "Tiada hutang aktif",
  "Goals & savings": "Matlamat dan simpanan",
  "in progress": "sedang berjalan",
  "Set a meaningful target": "Tetapkan sasaran yang bermakna",
  "Overdue debt": "Hutang tertunggak",
  "Next financial action": "Tindakan kewangan seterusnya",
  "Record progress on": "Rekod kemajuan bagi",
  "owed to": "terhutang kepada",
  "Recent progress": "Kemajuan terkini",
  "Move or unlink this account’s transactions before changing its currency. Their original amounts and currencies will not be rewritten.":
    "Pindahkan atau nyahpaut transaksi akaun sebelum menukar mata wangnya. Amaun dan mata wang asal dikekalkan.",
  "Balances use the opening amount plus transactions assigned to each account. Older transactions remain unassigned until you link them.":
    "Baki merangkumi baki awal, transaksi, pindahan dan prinsipal hutang. Transaksi lama kekal tidak ditetapkan sehingga dipautkan.",
  "Add a bank, cash, or wallet account to see a reliable position from linked transactions.":
    "Tambah akaun bank, tunai atau dompet untuk melihat kedudukan kewangan daripada aktiviti berpaut.",
  "Opening balance can be updated. To change currency, first move or unlink this account’s transactions so their native amounts remain intact.":
    "Baki awal boleh dikemas kini. Sebelum menukar mata wang, pindahkan atau nyahpaut aktiviti akaun untuk mengekalkan amaun asal.",
  "This permanently removes the account. Transactions are preserved.":
    "Akaun dipadam secara kekal. Sejarah kewangan dilindungi.",
  "linked transaction(s). Move or unlink them before deleting the account. You can archive the account in the meantime.":
    "transaksi berpaut. Pindahkan atau nyahpaut sebelum memadam akaun. Akaun boleh diarkibkan sementara.",
  "No transactions are linked. This action cannot be undone.":
    "Tiada transaksi berpaut. Tindakan ini tidak boleh dibatalkan.",
  "Balances from real accounts and their linked transactions.":
    "Baki akaun sebenar dan aktiviti kewangannya.",
  "Add an account or restore an archived one to connect transactions.":
    "Tambah akaun atau pulihkan akaun diarkibkan untuk memautkan transaksi.",
  "Enter a positive target amount.": "Masukkan amaun sasaran positif.",
  "Enter a positive contribution.": "Masukkan sumbangan positif.",
  "Enter a positive milestone amount.": "Masukkan amaun pencapaian positif.",
  "Build toward meaningful financial objectives.":
    "Usahakan matlamat kewangan yang bermakna.",
  "Set money aside for a named purpose; contributions are earmarks, not extra account cash.":
    "Peruntukkan wang untuk tujuan tertentu; sumbangan tidak menambah wang tunai akaun.",
  "Set a target amount and record progress as it happens.":
    "Tetapkan amaun sasaran dan rekod kemajuan.",
  "Progress starts with a contribution.": "Kemajuan bermula dengan sumbangan.",
  "View milestones and contribution history.":
    "Lihat pencapaian dan sejarah sumbangan.",
  "An allocation reserves money already in your accounts; it does not reduce cash or increase expenses.":
    "Peruntukan menetapkan wang yang sudah dalam akaun; baki tunai dan perbelanjaan tidak berubah.",
  "The allocation uses the exact transfer destination amount. Editing or deleting that transaction updates this progress.":
    "Peruntukan menggunakan amaun tepat destinasi pindahan. Buang peruntukan dahulu sebelum menukar destinasi pindahan.",
  "This permanently removes this target and its progress history.":
    "Sasaran dan sejarah kemajuannya dipadam secara kekal.",
  "Its contributions and milestones will be removed. Any linked transactions remain in your transaction history.":
    "Sumbangan dan pencapaian dibuang. Transaksi dan pindahan berpaut kekal dalam sejarah anda.",
  "Enter a positive original amount.": "Masukkan amaun asal positif.",
  "Enter a positive repayment.": "Masukkan bayaran balik positif.",
  "Track money between people in both directions. Amounts owed to you are receivables, not available cash.":
    "Jejak hutang dalam kedua-dua arah. Wang terhutang kepada anda ialah belum terima dan bukan tunai tersedia.",
  "Record what you owe or what someone owes you, then log repayments.":
    "Rekod hutang anda atau hutang kepada anda, kemudian rekod bayaran balik.",
  "See the balance and payment history.": "Lihat baki dan sejarah pembayaran.",
  "Principal changes cash and outstanding debt, never ordinary income or spending.":
    "Prinsipal mengubah tunai dan baki hutang, bukan pendapatan atau perbelanjaan biasa.",
  "This permanently removes the debt record and its repayment history.":
    "Rekod hutang dan sejarah bayaran balik dipadam secara kekal.",
  "Recorded repayments and their account cash effects will be removed. Legacy linked transactions remain in your transaction history.":
    "Bayaran balik dan kesan tunai akaunnya dibuang. Transaksi lama berpaut kekal dalam sejarah transaksi.",
  "Receivables are separate from available cash.":
    "Wang belum terima diasingkan daripada tunai tersedia.",
  "Balances use opening amounts, assigned cash transactions, transfers, and account-funded debt principal. Earmarks do not move cash.":
    "Baki merangkumi amaun pembukaan, transaksi tunai, pindahan dan prinsipal hutang yang menggunakan akaun. Peruntukan tidak memindahkan tunai.",
  "linked financial record(s). Preserve history by archiving this account, or explicitly remove its references before deletion.":
    "rekod kewangan berpaut. Arkibkan akaun untuk mengekalkan sejarah, atau buang pautannya secara jelas sebelum memadam.",
  "No financial records are linked. This action cannot be undone.":
    "Tiada rekod kewangan berpaut. Tindakan ini tidak boleh dibatalkan.",
};
export function usePlatformText() {
  const locale = useAppStore((s) => s.locale);
  return (text: string) => {
    if (locale !== "ms") return text;
    return (
      ms[text] ??
      text
        .replace(/^Delete /, "Padam ")
        .replace(/^Contribute to /, "Sumbang kepada ")
        .replace(/ remaining$/, " baki")
        .replace(/ · due /, " · akhir ")
        .replace(/ saved$/, " disimpan")
        .replace(/ deleted$/, " dipadam")
    );
  };
}
export const platformMalayCopy = ms;
