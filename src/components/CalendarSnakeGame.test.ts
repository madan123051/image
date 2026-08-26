import { boardPosition, LADDERS, SNAKES, squareForCell } from './CalendarSnakeGame';

describe('Calendar Snake board', () => {
  it('numbers all 42 cells in a bottom-up snake pattern', () => {
    const squares = Array.from({ length: 42 }, (_, index) => squareForCell(Math.floor(index / 7), index % 7));
    expect(new Set(squares).size).toBe(42);
    expect(squares.slice(-7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(squares.slice(-14, -7)).toEqual([14, 13, 12, 11, 10, 9, 8]);
    expect(boardPosition(42)).toEqual({ row: 0, column: 0 });
  });

  it('keeps every snake and ladder endpoint on the board', () => {
    [...Object.entries(SNAKES), ...Object.entries(LADDERS)].forEach(([from, to]) => {
      expect(Number(from)).toBeGreaterThanOrEqual(1);
      expect(Number(from)).toBeLessThanOrEqual(42);
      expect(to).toBeGreaterThanOrEqual(1);
      expect(to).toBeLessThanOrEqual(42);
    });
  });
});
