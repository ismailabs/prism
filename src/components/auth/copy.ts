import { useTranslation } from 'react-i18next';

const english = {
  captchaLabel: 'Security check', captchaHelp: 'Complete the security check before continuing.',
  captchaFailed: 'The security check expired or could not load. Try again.', captchaRetry: 'Retry security check',
  resend: 'Resend confirmation email', resendNotice: 'If this address needs confirmation, a new link has been requested. Check your inbox and spam folder.',
  invalidLink: 'This account link is invalid or has expired. Request a new confirmation or password recovery email.',
  welcome: 'Your money. A clearer picture.', subtitle: 'Sign in to your personal financial workspace.',
  signIn: 'Sign in', signUp: 'Create account', email: 'Email address', password: 'Password', username: 'Your name',
  google: 'Continue with Google', or: 'or continue with email', emailHint: 'you@example.com', nameHint: 'How should we call you?',
  passwordHint: 'At least 8 characters', waiting: 'Please wait…', createIntro: 'A little clarity goes a long way.',
  createSubtitle: 'Create your account to start tracking what matters.', checkEmail: 'Check your inbox and spam folder to confirm your account, then sign in.',
  privacy: 'Your workspace is protected by account access controls.', invalidEmail: 'Enter a valid email address.',
  invalidPassword: 'Use at least 8 characters, including a letter and a number.', requiredPassword: 'Enter your password.',
  invalidName: 'Enter a name between 1 and 60 characters.', failed: 'Something went wrong. Please try again.',
  verifyTitle: 'One more layer of security.', verifySubtitle: 'Enter the six-digit code from your authenticator app to unlock your workspace.',
  code: 'Authentication code', authenticator: 'Authenticator', verify: 'Verify and continue', signOut: 'Sign out',
  noFactor: 'No verified authenticator was found. Refresh your session or sign in again.', retry: 'Refresh session',
  securityTitle: 'Two-factor authentication', securitySubtitle: 'Protect your account with a code from your authenticator app.',
  manage: 'Manage 2FA', setup: 'Set up authenticator', add: 'Add an authenticator', cancel: 'Cancel', close: 'Close',
  scan: 'Scan this QR code with Google Authenticator, 1Password, or another authenticator app.', manual: 'Or enter this setup key manually',
  secretWarning: 'Keep this key private. Anyone with it can generate your verification codes.', enable: 'Verify and enable',
  enabled: 'Two-factor authentication is enabled.', removed: 'Authenticator removed.', remove: 'Remove',
  removeConfirm: 'Remove this authenticator?', removeDetail: 'Removing your last authenticator turns off two-factor authentication.',
  keep: 'Keep authenticator', configured: 'Your verified authenticators', noConfigured: 'No authenticator is connected yet.',
  tokenError: 'Enter a six-digit code.', qrAlt: 'Authenticator setup QR code', loading: 'Loading authenticators…',
  manageHint: 'Use a second device as a backup before removing your current authenticator.',
} as const;

const malay: Record<keyof typeof english, string> = {
  captchaLabel: 'Semakan keselamatan', captchaHelp: 'Lengkapkan semakan keselamatan sebelum meneruskan.',
  captchaFailed: 'Semakan keselamatan telah tamat tempoh atau tidak dapat dimuatkan. Cuba lagi.', captchaRetry: 'Cuba semula semakan keselamatan',
  resend: 'Hantar semula e-mel pengesahan', resendNotice: 'Jika alamat ini memerlukan pengesahan, pautan baharu telah diminta. Semak peti masuk dan folder spam anda.',
  invalidLink: 'Pautan akaun ini tidak sah atau telah tamat tempoh. Minta e-mel pengesahan atau pemulihan kata laluan baharu.',
  welcome: 'Wang anda. Gambaran lebih jelas.', subtitle: 'Log masuk ke ruang kewangan peribadi anda.',
  signIn: 'Log masuk', signUp: 'Cipta akaun', email: 'Alamat e-mel', password: 'Kata laluan', username: 'Nama anda',
  google: 'Teruskan dengan Google', or: 'atau teruskan dengan e-mel', emailHint: 'anda@contoh.com', nameHint: 'Apakah nama panggilan anda?',
  passwordHint: 'Sekurang-kurangnya 8 aksara', waiting: 'Sila tunggu…', createIntro: 'Kejelasan kecil membawa perubahan besar.',
  createSubtitle: 'Cipta akaun untuk mula menjejak kewangan anda.', checkEmail: 'Semak peti masuk dan folder spam untuk mengesahkan akaun, kemudian log masuk.',
  privacy: 'Ruang kerja anda dilindungi oleh kawalan akses akaun.', invalidEmail: 'Masukkan alamat e-mel yang sah.',
  invalidPassword: 'Gunakan sekurang-kurangnya 8 aksara, termasuk huruf dan nombor.', requiredPassword: 'Masukkan kata laluan anda.',
  invalidName: 'Masukkan nama antara 1 hingga 60 aksara.', failed: 'Ralat berlaku. Sila cuba lagi.',
  verifyTitle: 'Satu lagi lapisan keselamatan.', verifySubtitle: 'Masukkan kod enam digit daripada aplikasi pengesah untuk membuka ruang anda.',
  code: 'Kod pengesahan', authenticator: 'Pengesah', verify: 'Sahkan dan teruskan', signOut: 'Log keluar',
  noFactor: 'Tiada pengesah yang disahkan ditemui. Muat semula sesi atau log masuk semula.', retry: 'Muat semula sesi',
  securityTitle: 'Pengesahan dua faktor', securitySubtitle: 'Lindungi akaun dengan kod daripada aplikasi pengesah anda.',
  manage: 'Urus 2FA', setup: 'Sediakan pengesah', add: 'Tambah pengesah', cancel: 'Batal', close: 'Tutup',
  scan: 'Imbas kod QR ini dengan Google Authenticator, 1Password atau aplikasi pengesah lain.', manual: 'Atau masukkan kunci persediaan ini secara manual',
  secretWarning: 'Rahsiakan kunci ini. Sesiapa yang memilikinya boleh menjana kod pengesahan anda.', enable: 'Sahkan dan aktifkan',
  enabled: 'Pengesahan dua faktor diaktifkan.', removed: 'Pengesah dibuang.', remove: 'Buang',
  removeConfirm: 'Buang pengesah ini?', removeDetail: 'Membuang pengesah terakhir akan mematikan pengesahan dua faktor.',
  keep: 'Kekalkan pengesah', configured: 'Pengesah anda yang disahkan', noConfigured: 'Tiada pengesah disambungkan lagi.',
  tokenError: 'Masukkan kod enam digit.', qrAlt: 'Kod QR persediaan pengesah', loading: 'Memuatkan pengesah…',
  manageHint: 'Gunakan peranti kedua sebagai sandaran sebelum membuang pengesah semasa.',
};

export function useAuthCopy(): Record<keyof typeof english, string> {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage?.startsWith('ms') ? malay : english;
}
