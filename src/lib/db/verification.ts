import { mysqlQuery, mysqlExec } from "@/lib/db/mysql";

// Helper to format Date to Shanghai Time (UTC+8) string: 'YYYY-MM-DD HH:mm:ss'
function toShanghaiTimeString(date: Date) {
  // Add 8 hours to UTC time
  const offset = 8 * 60 * 60 * 1000;
  const shanghaiDate = new Date(date.getTime() + offset);

  return shanghaiDate.toISOString().slice(0, 19).replace("T", " ");
}

export async function setVerificationCode(email: string, code: string, ttlSeconds: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const createdAtShanghai = toShanghaiTimeString(now);
  const expiresAtShanghai = toShanghaiTimeString(expiresAt);

  await mysqlExec(
    "INSERT INTO verification_codes (email, code, expires_at, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE code = ?, expires_at = ?, created_at = ?",
    [email, code, expiresAtShanghai, createdAtShanghai, code, expiresAtShanghai, createdAtShanghai]
  );
}

export async function getVerificationCode(email: string): Promise<string | null> {
  const rows = await mysqlQuery<{ code: string; expires_at: string }>(
    "SELECT code, CAST(expires_at AS CHAR) as expires_at FROM verification_codes WHERE email = ?",
    [email]
  );

  if (rows.length === 0) return null;

  const { code, expires_at } = rows[0];

  // Parse DB string as Shanghai Time (UTC+8)
  // Format from DB is 'YYYY-MM-DD HH:mm:ss'
  // We explicitly treat it as +08:00
  const dateStr = expires_at.replace(" ", "T") + "+08:00";
  const expireDate = new Date(dateStr);

  if (new Date() > expireDate) {
    await deleteVerificationCode(email);
    return null;
  }

  return code;
}

export async function deleteVerificationCode(email: string) {
  await mysqlExec("DELETE FROM verification_codes WHERE email = ?", [email]);
}
