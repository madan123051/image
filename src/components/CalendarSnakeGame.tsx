import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types/domain';

type Side = 'player' | 'computer';
type Jump = { side: Side; type: 'snake' | 'ladder' } | null;

interface CalendarSnakeGameProps {
  dateKey: string;
  language: Language;
  onClose(): void;
}

export const SNAKES: Record<number, number> = { 18: 7, 27: 13, 33: 19, 37: 24, 41: 30 };
export const LADDERS: Record<number, number> = { 3: 11, 8: 17, 15: 25, 22: 34, 28: 39 };
const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function squareForCell(row: number, column: number): number {
  const rowFromBottom = 5 - row;
  const start = rowFromBottom * 7 + 1;
  return rowFromBottom % 2 === 0 ? start + column : start + (6 - column);
}

export function boardPosition(square: number): { row: number; column: number } {
  const rowFromBottom = Math.floor((square - 1) / 7);
  const offset = (square - 1) % 7;
  return { row: 5 - rowFromBottom, column: rowFromBottom % 2 === 0 ? offset : 6 - offset };
}

function boardPoint(square: number): { x: number; y: number } {
  const { row, column } = boardPosition(square);
  return { x: ((column + 0.5) / 7) * 100, y: ((row + 0.5) / 6) * 100 };
}

const pause = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function CalendarSnakeGame({ dateKey, language, onClose }: CalendarSnakeGameProps) {
  const [playerPosition, setPlayerPosition] = useState(0);
  const [computerPosition, setComputerPosition] = useState(0);
  const [turn, setTurn] = useState<Side>('player');
  const [die, setDie] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [winner, setWinner] = useState<Side | null>(null);
  const [jump, setJump] = useState<Jump>(null);
  const [note, setNote] = useState(language === 'ne' ? 'पासा घुमाएर ४२ सम्म पुग्नुहोस्।' : 'Roll the dice and race to square 42.');
  const positionsRef = useRef({ player: 0, computer: 0 });
  const runRef = useRef(0);

  useEffect(() => () => { runRef.current += 1; }, []);

  const setPosition = (side: Side, position: number) => {
    positionsRef.current[side] = position;
    if (side === 'player') setPlayerPosition(position);
    else setComputerPosition(position);
  };

  const takeTurn = useCallback(async (side: Side) => {
    if (moving || winner) return;
    const run = ++runRef.current;
    const roll = Math.floor(Math.random() * 6) + 1;
    setMoving(true);
    setDie(roll);
    setNote(side === 'player'
      ? (language === 'ne' ? `तपाईंले ${roll} पाउनुभयो।` : `You rolled ${roll}.`)
      : (language === 'ne' ? `कम्प्युटरले ${roll} पायो।` : `Computer rolled ${roll}.`));
    await pause(280);
    if (run !== runRef.current) return;

    const start = positionsRef.current[side];
    const destination = Math.min(42, start + roll);
    for (let square = start + 1; square <= destination; square += 1) {
      if (run !== runRef.current) return;
      setPosition(side, square);
      await pause(145);
    }

    const snakeDestination = SNAKES[destination];
    const ladderDestination = LADDERS[destination];
    const jumpDestination = snakeDestination ?? ladderDestination;
    if (jumpDestination) {
      const jumpType = snakeDestination ? 'snake' : 'ladder';
      setJump({ side, type: jumpType });
      setNote(jumpType === 'snake'
        ? (language === 'ne' ? 'ओहो! सर्पले तल झार्‍यो।' : 'Oops! The snake slides you down.')
        : (language === 'ne' ? 'वाह! भर्‍याङ चढ्नुभयो।' : 'Nice! Climb the ladder.'));
      await pause(520);
      if (run !== runRef.current) return;
      setPosition(side, jumpDestination);
      await pause(300);
      setJump(null);
    }

    const finalPosition = jumpDestination ?? destination;
    if (finalPosition === 42) {
      setWinner(side);
      setMoving(false);
      setNote(side === 'player'
        ? (language === 'ne' ? 'तपाईंले Calendar Snake जित्नुभयो! 🎉' : 'You won Calendar Snake! 🎉')
        : (language === 'ne' ? 'कम्प्युटर जित्यो—फेरि प्रयास गर्नुहोस्।' : 'Computer won—try another round.'));
      return;
    }

    const nextTurn: Side = roll === 6 ? side : side === 'player' ? 'computer' : 'player';
    setTurn(nextTurn);
    setDie(null);
    setMoving(false);
    if (!jumpDestination) setNote(roll === 6
      ? (language === 'ne' ? 'छ आयो—फेरि तपाईंको पालो!' : 'Six! Take another turn.')
      : nextTurn === 'player' ? (language === 'ne' ? 'तपाईंको पालो।' : 'Your turn.') : (language === 'ne' ? 'कम्प्युटरको पालो…' : "Computer's turn…"));
  }, [language, moving, winner]);

  useEffect(() => {
    if (turn !== 'computer' || moving || winner) return undefined;
    const timer = window.setTimeout(() => void takeTurn('computer'), 650);
    return () => window.clearTimeout(timer);
  }, [moving, takeTurn, turn, winner]);

  const restart = () => {
    runRef.current += 1;
    positionsRef.current = { player: 0, computer: 0 };
    setPlayerPosition(0);
    setComputerPosition(0);
    setTurn('player');
    setDie(null);
    setMoving(false);
    setWinner(null);
    setJump(null);
    setNote(language === 'ne' ? 'नयाँ खेल—पासा घुमाउनुहोस्।' : 'New game—roll the dice.');
  };

  const dateLabel = new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`));

  return (
    <section className="calendar-snake-game">
      <header className="snake-game-header">
        <div><p className="eyebrow">{language === 'ne' ? '४२ पात्रो बाकस · अफलाइन खेल' : '42 calendar squares · offline game'}</p><h2>🐍 {language === 'ne' ? 'Calendar Snake' : 'Calendar Snake'}</h2><span>{dateLabel}</span></div>
        <div><button className="secondary-button" type="button" onClick={restart}>{language === 'ne' ? 'फेरि सुरु' : 'Restart'}</button><button className="primary-button" type="button" onClick={onClose}>× {language === 'ne' ? 'खेल बन्द' : 'Close game'}</button></div>
      </header>

      <div className="snake-game-layout">
        <div className="snake-board-wrap">
          <div className="snake-board" aria-label={language === 'ne' ? '४२ बाकसको सर्प भर्‍याङ बोर्ड' : '42-square snakes and ladders board'}>
            {Array.from({ length: 42 }, (_, index) => {
              const row = Math.floor(index / 7);
              const column = index % 7;
              const square = squareForCell(row, column);
              const snake = SNAKES[square];
              const ladder = LADDERS[square];
              return <div className={`snake-square ${snake ? 'snake-head' : ''} ${ladder ? 'ladder-start' : ''} ${square === 42 ? 'goal' : ''}`} key={square}>
                <b>{square}</b>
                {snake ? <span aria-hidden="true">🐍</span> : ladder ? <span aria-hidden="true">🪜</span> : square === 42 ? <span aria-hidden="true">🏆</span> : null}
                {playerPosition === square ? <i className={`snake-token player ${jump?.side === 'player' ? jump.type : ''}`} title={language === 'ne' ? 'तपाईं' : 'You'}>A</i> : null}
                {computerPosition === square ? <i className={`snake-token computer ${jump?.side === 'computer' ? jump.type : ''}`} title={language === 'ne' ? 'कम्प्युटर' : 'Computer'}>C</i> : null}
              </div>;
            })}
            <svg className="snake-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {Object.entries(LADDERS).map(([fromValue, to]) => {
                const from = boardPoint(Number(fromValue));
                const end = boardPoint(to);
                return <g className="ladder-path" key={`ladder-${fromValue}`}><line x1={from.x - 1} y1={from.y} x2={end.x - 1} y2={end.y} /><line x1={from.x + 1} y1={from.y} x2={end.x + 1} y2={end.y} /><line x1={(from.x * .75) + (end.x * .25) - 1} y1={(from.y * .75) + (end.y * .25)} x2={(from.x * .75) + (end.x * .25) + 1} y2={(from.y * .75) + (end.y * .25)} /><line x1={(from.x + end.x) / 2 - 1} y1={(from.y + end.y) / 2} x2={(from.x + end.x) / 2 + 1} y2={(from.y + end.y) / 2} /><line x1={(from.x * .25) + (end.x * .75) - 1} y1={(from.y * .25) + (end.y * .75)} x2={(from.x * .25) + (end.x * .75) + 1} y2={(from.y * .25) + (end.y * .75)} /></g>;
              })}
              {Object.entries(SNAKES).map(([fromValue, to], index) => {
                const from = boardPoint(Number(fromValue));
                const end = boardPoint(to);
                const bend = index % 2 === 0 ? 9 : -9;
                return <path className="snake-path" d={`M ${from.x} ${from.y} C ${from.x + bend} ${(from.y + end.y) / 2}, ${end.x - bend} ${(from.y + end.y) / 2}, ${end.x} ${end.y}`} key={`snake-${fromValue}`} />;
              })}
            </svg>
          </div>
        </div>

        <aside className="snake-game-controls">
          <div className="snake-score"><span className={turn === 'player' ? 'active' : ''}><i className="player">A</i><b>{language === 'ne' ? 'तपाईं' : 'You'}</b><strong>{playerPosition}/42</strong></span><span className={turn === 'computer' ? 'active' : ''}><i className="computer">C</i><b>{language === 'ne' ? 'कम्प्युटर' : 'Computer'}</b><strong>{computerPosition}/42</strong></span></div>
          <div className={`snake-dice ${moving ? 'rolling' : ''}`}>{die ? DICE[die - 1] : '🎲'}</div>
          <div className="snake-turn-copy" aria-live="polite"><strong>{winner ? (winner === 'player' ? (language === 'ne' ? 'तपाईं विजेता!' : 'You win!') : (language === 'ne' ? 'कम्प्युटर विजेता' : 'Computer wins')) : turn === 'player' ? (language === 'ne' ? 'तपाईंको पालो' : 'Your turn') : (language === 'ne' ? 'कम्प्युटर खेल्दैछ' : 'Computer is playing')}</strong><small>{note}</small></div>
          <button className="primary-button wide-button snake-roll-button" type="button" disabled={turn !== 'player' || moving || Boolean(winner)} onClick={() => void takeTurn('player')}>{language === 'ne' ? '🎲 पासा घुमाउनुहोस्' : '🎲 Roll dice'}</button>
          <p>{language === 'ne' ? '🪜 माथि चढ्नुहोस् · 🐍 तल झर्नुहोस् · पहिले ४२ पुग्नेले जित्छ।' : '🪜 Climb up · 🐍 Slide down · First to 42 wins.'}</p>
        </aside>
      </div>
    </section>
  );
}
