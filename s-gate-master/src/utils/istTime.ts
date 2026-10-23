/**
 * India Standard Time (Asia/Kolkata) is a fixed UTC+05:30 with no daylight saving,
 * so a plain offset is exact — and does not depend on the device's time zone or on
 * Intl time-zone support in the JS engine.
 */
export const IST_OFFSET_MS = 330 * 60 * 1000;

/** Calendar date and wall-clock time of an instant in IST: { date: 'YYYY-MM-DD', time: 'HH:mm' }. */
export function toIstParts(input: Date | string | number): { date: string; time: string } {
    const shifted = new Date(new Date(input).getTime() + IST_OFFSET_MS).toISOString();
    return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/**
 * A ONCE pre-approval schedule in IST, which is how the backend evaluates
 * `date` + `startTime`/`endTime`. Using `validFrom.slice(0, 10)` sent the UTC
 * date, i.e. yesterday for anything created between 00:00 and 05:30 IST.
 */
export function onceScheduleIst(window: { validFrom: string; validUntil: string }): { date: string; startTime: string; endTime: string } {
    const from = toIstParts(window.validFrom);
    const until = toIstParts(window.validUntil);
    return { date: from.date, startTime: from.time, endTime: until.time };
}
