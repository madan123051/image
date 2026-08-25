import {
  daysInMonth as getDaysInNepaliMonth,
  toBik,
  toGreg,
} from 'bikram-sambat';

export const NEPALI_MONTHS = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत',
];

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function toGregorianIso(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;
}

export function toNepaliNumerals(value) {
  return String(value).replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)]);
}

export function getNepaliDate(date) {
  return toBik(toGregorianIso(date));
}

export function getNepaliMonthDetails(year, month) {
  const firstGregorianDay = toGreg(year, month, 1);
  const firstDay = new Date(
    Date.UTC(
      firstGregorianDay.year,
      firstGregorianDay.month - 1,
      firstGregorianDay.day
    )
  ).getUTCDay();

  return {
    firstDay,
    daysInMonth: getDaysInNepaliMonth(year, month),
  };
}

export function getGregorianDateForNepaliDay(year, month, day) {
  const date = toGreg(year, month, day);

  return {
    ...date,
    iso: `${date.year}-${padNumber(date.month)}-${padNumber(date.day)}`,
  };
}

export function moveNepaliMonth(date, offset) {
  const monthIndex = date.year * 12 + (date.month - 1) + offset;

  return {
    year: Math.floor(monthIndex / 12),
    month: (monthIndex % 12) + 1,
  };
}

export function canMoveNepaliMonth(date, offset) {
  const nextMonth = moveNepaliMonth(date, offset);

  try {
    getDaysInNepaliMonth(nextMonth.year, nextMonth.month);
    return true;
  } catch {
    return false;
  }
}
