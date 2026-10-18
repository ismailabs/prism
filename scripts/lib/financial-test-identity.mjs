// Test-only JWT fixture builder. It never runs in the app or on hosted Auth.
// Existing finance regression actors use explicitly seeded approved sessions;
// new adversarial MFA actors use tag='bare' and supply every claim themselves.
export async function financialClaims(db, claims) {
  if (claims.aal !== 'aal2' || !claims.session_id || Object.hasOwn(claims, 'amr')) return claims;
  const session = (await db.query("select user_id,tag from auth.sessions where id=$1", [claims.session_id])).rows[0];
  if (!session || session.tag !== 'financial-fixture' || session.user_id !== claims.sub) return claims;
  const result = await db.query("select authentication_method as method,floor(extract(epoch from updated_at))::bigint::text as timestamp from auth.mfa_amr_claims where session_id=$1", [claims.session_id]);
  return { ...claims, amr: result.rows.map(row => ({ method: row.method, timestamp: Number(row.timestamp) })) };
}
