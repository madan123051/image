export function getMonthDetails(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    firstDay: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

export function moveMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}
