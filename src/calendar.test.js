import { getMonthDetails, moveMonth } from './calendar';

describe('calendar utilities', () => {
  it('returns the correct layout for a leap-year February', () => {
    expect(getMonthDetails(new Date(2024, 1, 15))).toEqual({
      firstDay: 4,
      daysInMonth: 29,
    });
  });

  it('moves across year boundaries', () => {
    const previousMonth = moveMonth(new Date(2024, 0, 15), -1);

    expect(previousMonth.getFullYear()).toBe(2023);
    expect(previousMonth.getMonth()).toBe(11);
    expect(previousMonth.getDate()).toBe(1);
  });
});
