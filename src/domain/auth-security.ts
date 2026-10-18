export interface FinancialAccessStatus {
  allowed: boolean;
  reason: 'ready' | 'needs_mfa' | 'needs_approval' | 'needs_backup' | 'session_invalid' | 'session_expired';
  approvedFactorIds: string[];
  currentFactorId?: string | null;
  mailboxVerified: boolean;
  activated?: boolean;
  managementAuthorized?: boolean;
  recentVerification?: boolean;
  sessionExpiresAt?: string;
}

export function financialAccessStatus(value: unknown): FinancialAccessStatus {
  if (!value || typeof value !== 'object') throw new Error('Financial security status is unavailable.');
  const status = value as FinancialAccessStatus;
  if (typeof status.allowed !== 'boolean' || typeof status.mailboxVerified !== 'boolean' ||
      !['ready', 'needs_mfa', 'needs_approval', 'needs_backup', 'session_invalid', 'session_expired'].includes(status.reason) ||
      !Array.isArray(status.approvedFactorIds) || status.approvedFactorIds.some(id => typeof id !== 'string') ||
      (status.allowed && (status.reason !== 'ready' || new Set(status.approvedFactorIds).size < 2 || !status.currentFactorId || !status.approvedFactorIds.includes(status.currentFactorId) || !status.sessionExpiresAt || !Number.isFinite(Date.parse(status.sessionExpiresAt)) || Date.parse(status.sessionExpiresAt) <= Date.now()))) {
    throw new Error('Financial security status is invalid.');
  }
  return status;
}
