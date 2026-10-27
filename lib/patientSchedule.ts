/** Current clock time in Asia/Kolkata as HH:MM (24h). */
export function getCurrentTimeIST(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function getNextScheduledCall(
  reminderTime: string | null,
): { label: string; reminder_time: string } | null {
  if (!reminderTime) return null;

  const match = reminderTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const rh = Number(match[1]);
  const rm = Number(match[2]);
  const normalized = `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;

  const nowIst = getCurrentTimeIST();
  const [nh, nm] = nowIst.split(":").map(Number);
  const nowMins = nh * 60 + nm;
  const remMins = rh * 60 + rm;

  const label =
    remMins > nowMins
      ? `Today at ${normalized} IST`
      : `Tomorrow at ${normalized} IST`;

  return { label, reminder_time: normalized };
}
