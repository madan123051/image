declare module 'bikram-sambat' {
  export interface BikramSambatDate {
    year: number;
    month: number;
    day: number;
  }

  export function daysInMonth(year: number, month: number): number;
  export function toBik(gregorianIsoDate: string): BikramSambatDate;
  export function toGreg(
    year: number,
    month: number,
    day: number
  ): BikramSambatDate;
}
