function formatClock(iso: string): string {
  const d = new Date(iso);
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const period = hours24 < 12 ? "AM" : "PM";
  return `${hours12}:${minutes} ${period}`;
}

/** Start–end clock range, e.g. "3:30 PM – 4:30 PM". Same instant → start only. */
export function formatTimeLabel(startIso: string, endIso: string): string {
  const start = formatClock(startIso);
  if (!endIso || startIso === endIso) return start;
  return `${start} – ${formatClock(endIso)}`;
}
