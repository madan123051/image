import {
  getGregorianDateForNepaliDay,
  getNepaliDate,
  getNepaliMonthDetails,
  moveNepaliMonth,
  toNepaliNumerals,
} from './nepaliCalendar';

describe('Nepali calendar utilities', () => {
  it('converts a Gregorian date to Bikram Sambat', () => {
    expect(getNepaliDate(new Date(2024, 6, 24))).toEqual({
      year: 2081,
      month: 4,
      day: 9,
    });
  });

  it('converts a Bikram Sambat date back to Gregorian', () => {
    expect(getGregorianDateForNepaliDay(2081, 4, 9)).toEqual({
      year: 2024,
      month: 7,
      day: 24,
      iso: '2024-07-24',
    });
  });

  it('provides the correct month layout', () => {
    expect(getNepaliMonthDetails(2081, 4)).toEqual({
      firstDay: 2,
      daysInMonth: 32,
    });
  });

  it('moves across Nepali year boundaries', () => {
    expect(moveNepaliMonth({ year: 2081, month: 12 }, 1)).toEqual({
      year: 2082,
      month: 1,
    });
  });

  it('localizes numbers to Devanagari', () => {
    expect(toNepaliNumerals(2083)).toBe('२०८३');
  });
});
