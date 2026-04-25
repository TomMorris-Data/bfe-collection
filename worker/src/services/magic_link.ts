export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function checkinUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/checkin/${token}`;
}

export function tokenExpiresAt(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/** Return the Monday of the current week as YYYY-MM-DD */
export function thisPeriodStart(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  today.setDate(today.getDate() + diff);
  return today.toISOString().slice(0, 10);
}

export function periodEnd(periodStart: string): string {
  const d = new Date(periodStart);
  d.setDate(d.getDate() + 13);
  return d.toISOString().slice(0, 10);
}
