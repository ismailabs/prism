/** Instants and calendar dates are deliberately separate. */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
/** PostgreSQL instants retain up to six fractional digits. Date.parse alone
 * truncates a future sub-millisecond movement into the present millisecond. */
export function hasOccurred(value:string,now=Date.now()):boolean{
 const milliseconds=Date.parse(value);
 if(!Number.isFinite(milliseconds)||!Number.isSafeInteger(now))return false;
 const fraction=/\.(\d{1,6})(?:Z|[+-]\d{2}:?\d{2})$/.exec(value)?.[1]??'';
 const remainder=BigInt(fraction.slice(3).padEnd(3,'0')||'0');
 return BigInt(milliseconds)*1000n+remainder<=BigInt(now)*1000n;
}
export function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return value === "UTC" || value.includes("/");
  } catch {
    return false;
  }
}
export function financialDate(
  instant: Date | string,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function financialDateTime(
  instant: Date | string,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  return `${financialDate(instant, timezone)}T${parts.find((p) => p.type === "hour")?.value}:${parts.find((p) => p.type === "minute")?.value}`;
}
/** Resolve a wall-clock time in an IANA zone. Reject DST gaps and ambiguous times
 * rather than silently changing a financial date. */
export function financialInstant(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error("Invalid financial date/time.");
  const target = Date.parse(`${local}:00Z`);
  // Reuse one formatter for this resolution instead of constructing date and
  // time formatters for every candidate. Keep the same wall-clock/DST policy.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  });
  const wall = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (key: string) => parts.find(p => p.type === key)?.value;
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
  };
  const matches = new Set<number>();
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = target + offset * 60000;
    if (wall(candidate) === local)
      matches.add(candidate);
  }
  if (matches.size !== 1)
    throw new Error(
      "This time is missing or ambiguous due to daylight saving. Choose another time.",
    );
  return new Date([...matches][0]).toISOString();
}
