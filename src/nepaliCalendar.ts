import { daysInMonth as getDaysInNepaliMonth, toBik, toGreg } from 'bikram-sambat';

export interface NepaliDate {
  year: number;
  month: number;
  day: number;
}

export const NEPALI_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत',
];

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function toGregorianIso(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function toNepaliNumerals(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)]);
}

export function getNepaliDate(date: Date): NepaliDate {
  return toBik(toGregorianIso(date));
}

export function getNepaliMonthDetails(year: number, month: number): { firstDay: number; daysInMonth: number } {
  const firstGregorianDay = toGreg(year, month, 1);
  const firstDay = new Date(Date.UTC(firstGregorianDay.year, firstGregorianDay.month - 1, firstGregorianDay.day)).getUTCDay();
  return { firstDay, daysInMonth: getDaysInNepaliMonth(year, month) };
}

export function getGregorianDateForNepaliDay(year: number, month: number, day: number): NepaliDate & { iso: string } {
  const date = toGreg(year, month, day);
  return { ...date, iso: `${date.year}-${padNumber(date.month)}-${padNumber(date.day)}` };
}

export function moveNepaliMonth(date: Omit<NepaliDate, 'day'>, offset: number): Omit<NepaliDate, 'day'> {
  const monthIndex = date.year * 12 + (date.month - 1) + offset;
  return { year: Math.floor(monthIndex / 12), month: (monthIndex % 12) + 1 };
}

export function canMoveNepaliMonth(date: Omit<NepaliDate, 'day'>, offset: number): boolean {
  const nextMonth = moveNepaliMonth(date, offset);
  try {
    getDaysInNepaliMonth(nextMonth.year, nextMonth.month);
    return true;
  } catch {
    return false;
  }
}
