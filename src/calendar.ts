export function getMonthDetails(date: Date): { firstDay: number; daysInMonth: number } {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    firstDay: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

export function moveMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}
