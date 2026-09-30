/** Instants and calendar dates are deliberately separate. */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
  const matches = new Set<number>();
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = target + offset * 60000;
    if (financialDateTime(new Date(candidate), timezone) === local)
      matches.add(candidate);
  }
  if (matches.size !== 1)
    throw new Error(
      "This time is missing or ambiguous due to daylight saving. Choose another time.",
    );
  return new Date([...matches][0]).toISOString();
}
