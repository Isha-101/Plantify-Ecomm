// Day handling that respects the browser's timezone.
// The client sends `X-TZ-Offset` = minutes EAST of UTC (e.g. 330 for India).
export const DAY_MS = 24 * 60 * 60 * 1000;

export function clampOffset(v) {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 330;
}

/** "YYYY-MM-DD" for the user's local calendar day. */
export function dayKey(date = new Date(), tzOffsetMin = 330) {
  const shifted = new Date(new Date(date).getTime() + tzOffsetMin * 60000);
  return shifted.toISOString().slice(0, 10);
}

/** Midnight (as a UTC-ms number) of the user's local day, expressed as an absolute instant. */
export function startOfLocalDay(date = new Date(), tzOffsetMin = 330) {
  const key = dayKey(date, tzOffsetMin);
  return Date.parse(`${key}T00:00:00.000Z`) - tzOffsetMin * 60000;
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

/** Whole local days between two instants (b - a). */
export function diffDays(a, b, tzOffsetMin = 330) {
  return Math.round((startOfLocalDay(b, tzOffsetMin) - startOfLocalDay(a, tzOffsetMin)) / DAY_MS);
}

export function daysBetweenKeys(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}
