export const CSV_PATIENT_COLUMNS = [
  "phone",
  "name",
  "medications",
  "reminder_time",
  "protocol",
  "location",
] as const;

export const ALLOWED_PROTOCOLS = [
  "post-discharge",
  "hypertension",
  "diabetes",
] as const;

export const MAX_CSV_PATIENT_ROWS = 1000;

export type CsvPatientRow = {
  sourceRow: number;
  phone: string;
  name: string;
  medications: string;
  reminder_time: string;
  protocol: string | null;
  location: string | null;
};

export type CsvRowError = {
  row: number;
  reason: string;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field.trim());
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      if (c === "\r") {
        i += 1;
      }
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export function normalizePatientPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\+91[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(local)) {
      return `+${digits}`;
    }
  }
  return null;
}

export function normalizeReminderTime24(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parsePatientCsv(text: string): {
  rows: CsvPatientRow[];
  errors: CsvRowError[];
} {
  const errors: CsvRowError[] = [];
  const parsed = parseCsv(text);

  if (parsed.length === 0) {
    return { rows: [], errors: [{ row: 1, reason: "CSV is empty" }] };
  }

  const header = parsed[0].map(normalizeHeader);
  const missing = CSV_PATIENT_COLUMNS.filter(
    (col) => col !== "location" && col !== "protocol" && !header.includes(col),
  );
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          reason: `Missing required columns: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const index = (col: (typeof CSV_PATIENT_COLUMNS)[number]) =>
    header.indexOf(col);

  const dataRows = parsed.slice(1);
  if (dataRows.length > MAX_CSV_PATIENT_ROWS) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          reason: `Too many rows (${dataRows.length}). Maximum is ${MAX_CSV_PATIENT_ROWS}.`,
        },
      ],
    };
  }

  const rows: CsvPatientRow[] = [];

  dataRows.forEach((cells, offset) => {
    const rowNum = offset + 2;
    const get = (col: (typeof CSV_PATIENT_COLUMNS)[number]) => {
      const idx = index(col);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const phoneRaw = get("phone");
    const name = get("name");
    const medications = get("medications");
    const reminderRaw = get("reminder_time");
    const protocolRaw = get("protocol");
    const locationRaw = get("location");

    if (
      !phoneRaw &&
      !name &&
      !medications &&
      !reminderRaw &&
      !protocolRaw &&
      !locationRaw
    ) {
      return;
    }

    const phone = normalizePatientPhone(phoneRaw);
    if (!phone) {
      errors.push({
        row: rowNum,
        reason:
          "phone must be +91 followed by 10 digits (e.g. +919876543210)",
      });
      return;
    }

    if (!name) {
      errors.push({ row: rowNum, reason: "name is required" });
      return;
    }

    if (!medications) {
      errors.push({ row: rowNum, reason: "medications is required" });
      return;
    }

    const reminder_time = normalizeReminderTime24(reminderRaw);
    if (!reminder_time) {
      errors.push({
        row: rowNum,
        reason: "reminder_time must be HH:MM in 24-hour format (e.g. 09:00)",
      });
      return;
    }

    let protocol: string | null = null;
    if (protocolRaw) {
      const normalizedProtocol = protocolRaw.toLowerCase();
      if (
        !ALLOWED_PROTOCOLS.includes(
          normalizedProtocol as (typeof ALLOWED_PROTOCOLS)[number],
        )
      ) {
        errors.push({
          row: rowNum,
          reason: `protocol must be one of: ${ALLOWED_PROTOCOLS.join(", ")} (or empty)`,
        });
        return;
      }
      protocol = normalizedProtocol;
    }

    rows.push({
      sourceRow: rowNum,
      phone,
      name,
      medications,
      reminder_time,
      protocol,
      location: locationRaw || null,
    });
  });

  return { rows, errors };
}

export function countCsvPatientDataRows(text: string): number {
  const parsed = parseCsv(text);
  if (parsed.length <= 1) return 0;
  return parsed.slice(1).filter((cells) => cells.some((c) => c.trim())).length;
}
