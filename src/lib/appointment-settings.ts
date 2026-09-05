import { BusinessRuleError } from "./errors";

export interface WorkingHours {
  open: string;
  close: string;
}

export interface AppointmentSettings {
  appointmentSlotMinutes: number;
  /** Max concurrent PENDING/CONFIRMED appointments per slot; 0 = unlimited. */
  maxConcurrentPerSlot: number;
  workingHours: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, WorkingHours>>;
}

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  appointmentSlotMinutes: 60,
  maxConcurrentPerSlot: 0,
  workingHours: {
    1: { open: "08:00", close: "17:00" },
    2: { open: "08:00", close: "17:00" },
    3: { open: "08:00", close: "17:00" },
    4: { open: "08:00", close: "17:00" },
    5: { open: "08:00", close: "17:00" },
    6: { open: "08:00", close: "17:00" },
  },
};

const TIME_ZONE = "Asia/Ho_Chi_Minh";
/**
 * Fixed UTC offset of the garage timezone. Asia/Ho_Chi_Minh has no DST, so
 * wall-clock conversion is a constant shift. If the garage ever moves to a
 * DST-observing timezone, replace this with Intl-based conversion.
 */
const GARAGE_UTC_OFFSET_MINUTES = 7 * 60;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAY_INDEX: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkingHours(value: unknown): value is WorkingHours {
  if (!isRecord(value) || typeof value.open !== "string" || typeof value.close !== "string") {
    return false;
  }
  return (
    TIME_PATTERN.test(value.open) &&
    TIME_PATTERN.test(value.close) &&
    minutes(value.open) < minutes(value.close)
  );
}

function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function localCalendar(scheduledAt: Date): { weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; minutes: number } {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(scheduledAt);
  const weekday = WEEKDAY_INDEX[values.find((part) => part.type === "weekday")?.value ?? ""];
  const hour = Number(values.find((part) => part.type === "hour")?.value);
  const minute = Number(values.find((part) => part.type === "minute")?.value);

  if (weekday === undefined || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new BusinessRuleError("Thời gian hẹn không hợp lệ.");
  }
  return { weekday, minutes: hour * 60 + minute };
}

export function parseAppointmentSettings(value: unknown): AppointmentSettings {
  if (!isRecord(value) || !Number.isInteger(value.appointmentSlotMinutes)) {
    return DEFAULT_APPOINTMENT_SETTINGS;
  }
  const appointmentSlotMinutes = value.appointmentSlotMinutes;
  if (
    typeof appointmentSlotMinutes !== "number" ||
    appointmentSlotMinutes <= 0 ||
    appointmentSlotMinutes > 24 * 60 ||
    !isRecord(value.workingHours)
  ) {
    return DEFAULT_APPOINTMENT_SETTINGS;
  }

  const workingHours: AppointmentSettings["workingHours"] = {};
  for (const [day, hours] of Object.entries(value.workingHours)) {
    if (!/^[0-6]$/.test(day) || !isWorkingHours(hours)) {
      return DEFAULT_APPOINTMENT_SETTINGS;
    }
    workingHours[Number(day) as 0 | 1 | 2 | 3 | 4 | 5 | 6] = {
      open: hours.open,
      close: hours.close,
    };
  }

  const maxConcurrentPerSlot =
    typeof value.maxConcurrentPerSlot === "number" &&
    Number.isInteger(value.maxConcurrentPerSlot) &&
    value.maxConcurrentPerSlot >= 0
      ? value.maxConcurrentPerSlot
      : 0;

  return { appointmentSlotMinutes, maxConcurrentPerSlot, workingHours };
}
export function assertAppointmentSlot(
  settings: AppointmentSettings,
  scheduledAt: Date,
): Date {
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new BusinessRuleError("Thời gian hẹn không hợp lệ.");
  }

  const local = localCalendar(scheduledAt);
  const hours = settings.workingHours[local.weekday];
  if (!hours) {
    throw new BusinessRuleError("Gara không làm việc vào thời điểm đã chọn.");
  }

  const open = minutes(hours.open);
  const close = minutes(hours.close);
  if (local.minutes < open || local.minutes >= close) {
    throw new BusinessRuleError("Thời điểm đã chọn nằm ngoài giờ làm việc.");
  }
  if ((local.minutes - open) % settings.appointmentSlotMinutes !== 0) {
    throw new BusinessRuleError("Thời điểm đã chọn phải khớp khung giờ hẹn.");
  }

  const endsAt = new Date(scheduledAt.getTime() + settings.appointmentSlotMinutes * 60_000);
  if (local.minutes + settings.appointmentSlotMinutes > close) {
    throw new BusinessRuleError("Khung giờ hẹn vượt quá giờ làm việc.");
  }
  return endsAt;
}

export interface DaySlot {
  start: Date;
  end: Date;
}

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a `YYYY-MM-DD` calendar date (garage-local day). */
export function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) throw new BusinessRuleError("Ngày không hợp lệ (dùng định dạng YYYY-MM-DD).");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new BusinessRuleError("Ngày không hợp lệ (dùng định dạng YYYY-MM-DD).");
  }
  // Reject overflow dates like 2026-02-30.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new BusinessRuleError("Ngày không hợp lệ (dùng định dạng YYYY-MM-DD).");
  }
  return { year, month, day };
}

/** Convert a garage-local wall time to an absolute Date. */
export function garageWallToDate(
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(
    Date.UTC(year, month - 1, day, 0, mins - GARAGE_UTC_OFFSET_MINUTES + hours * 60),
  );
}

/**
 * Build all bookable slots for a garage-local calendar day from settings.
 * Returns [] for days the garage is closed. Slot boundaries follow the same
 * rules as `assertAppointmentSlot` (aligned to opening time, never past close).
 */
export function buildSlotsForDay(settings: AppointmentSettings, ymd: string): DaySlot[] {
  const { year, month, day } = parseYmd(ymd);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const hours = settings.workingHours[weekday];
  if (!hours) return [];

  const open = minutes(hours.open);
  const close = minutes(hours.close);
  const slotMinutes = settings.appointmentSlotMinutes;

  const slots: DaySlot[] = [];
  for (let start = open; start + slotMinutes <= close; start += slotMinutes) {
    slots.push({
      start: garageWallToDate(year, month, day, start),
      end: garageWallToDate(year, month, day, start + slotMinutes),
    });
  }
  return slots;
}
