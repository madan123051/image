import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '../types/domain';

type Side = 'player' | 'computer';
type Tokens = Record<Side, [number, number]>;

interface OfflineLudoProps {
  language: Language;
  onSchedule(): void;
}

const TRACK_LENGTH = 24;
const FINISH = 27;
const SAFE_CELLS = new Set([0, 6, 12, 18]);
const TRACK_COORDS: Array<[number, number]> = [
  [6, 3], [6, 2], [6, 1], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2],
  [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4],
];
const PLAYER_HOME: Array<[number, number]> = [[5, 3], [4, 3], [3, 3]];
const COMPUTER_HOME: Array<[number, number]> = [[1, 3], [2, 3], [3, 3]];
const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function absoluteTrackCell(side: Side, progress: number): number | null {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (progress + (side === 'computer' ? 12 : 0)) % TRACK_LENGTH;
}

function playableTokens(tokens: Tokens, side: Side, roll: number): number[] {
  return tokens[side].flatMap((progress, index) => {
    if (progress === FINISH) return [];
    if (progress === -1) return roll === 6 ? [index] : [];
    return progress + roll <= FINISH ? [index] : [];
  });
}

function initialTokens(): Tokens {
  return { player: [-1, -1], computer: [-1, -1] };
}

function chooseComputerToken(tokens: Tokens, roll: number, choices: number[]): number {
  const capture = choices.find((index) => {
    const current = tokens.computer[index];
    const next = current === -1 ? 0 : current + roll;
    const landing = absoluteTrackCell('computer', next);
    if (landing === null || SAFE_CELLS.has(landing)) return false;
    return tokens.player.some((progress) => absoluteTrackCell('player', progress) === landing);
  });
  return capture ?? choices.reduce((best, index) => tokens.computer[index] > tokens.computer[best] ? index : best, choices[0]);
}

export function OfflineLudo({ language, onSchedule }: OfflineLudoProps) {
  const [tokens, setTokens] = useState<Tokens>(initialTokens);
  const [turn, setTurn] = useState<Side>('player');
  const [die, setDie] = useState<number | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [note, setNote] = useState(language === 'ne' ? 'तपाईंको पालो—पासा घुमाउनुहोस्।' : 'Your turn—roll the dice.');
  const choices = useMemo(() => die === null ? [] : playableTokens(tokens, turn, die), [die, tokens, turn]);

  const reset = () => {
    setTokens(initialTokens());
    setTurn('player');
    setDie(null);
    setWinner(null);
    setNote(language === 'ne' ? 'नयाँ खेल सुरु भयो। पासा घुमाउनुहोस्।' : 'New game started. Roll the dice.');
  };

  const moveToken = useCallback((side: Side, tokenIndex: number, roll: number) => {
    let captured = false;
    const next: Tokens = { player: [...tokens.player] as [number, number], computer: [...tokens.computer] as [number, number] };
    const currentProgress = next[side][tokenIndex];
    const nextProgress = currentProgress === -1 ? 0 : currentProgress + roll;
    next[side][tokenIndex] = nextProgress;
    const landing = absoluteTrackCell(side, nextProgress);
    if (landing !== null && !SAFE_CELLS.has(landing)) {
      const opponent: Side = side === 'player' ? 'computer' : 'player';
      next[opponent] = next[opponent].map((progress) => {
        if (absoluteTrackCell(opponent, progress) === landing) {
          captured = true;
          return -1;
        }
        return progress;
      }) as [number, number];
    }
    const won = next[side].every((progress) => progress === FINISH);
    setTokens(next);
    setDie(null);
    if (won) {
      setWinner(side);
      setNote(side === 'player' ? (language === 'ne' ? 'तपाईंले जित्नुभयो! 🎉' : 'You won! 🎉') : (language === 'ne' ? 'कम्प्युटरले जित्यो। फेरि प्रयास गर्नुहोस्!' : 'Computer won. Try again!'));
      return;
    }
    const extraTurn = roll === 6 || captured;
    const nextTurn = extraTurn ? side : side === 'player' ? 'computer' : 'player';
    setTurn(nextTurn);
    if (captured) setNote(language === 'ne' ? 'टोकन काटियो—फेरि तपाईंको पालो!' : 'Token captured—roll again!');
    else if (roll === 6) setNote(language === 'ne' ? 'छ आयो—फेरि पासा घुमाउनुहोस्।' : 'Six! Roll again.');
    else setNote(nextTurn === 'player' ? (language === 'ne' ? 'तपाईंको पालो।' : 'Your turn.') : (language === 'ne' ? 'कम्प्युटरको पालो…' : "Computer's turn…"));
  }, [language, tokens]);

  const rollPlayerDice = () => {
    if (turn !== 'player' || die !== null || winner) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    setDie(roll);
    setNote(playableTokens(tokens, 'player', roll).length ? (language === 'ne' ? `${roll} आयो। टोकन छान्नुहोस्।` : `You rolled ${roll}. Choose a token.`) : (language === 'ne' ? `${roll} आयो—चल्न मिलेन।` : `You rolled ${roll}—no move.`));
  };

  useEffect(() => {
    if (winner) return undefined;
    if (turn === 'computer' && die === null) {
      const timer = window.setTimeout(() => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setDie(roll);
        setNote(language === 'ne' ? `कम्प्युटरले ${roll} पायो।` : `Computer rolled ${roll}.`);
      }, 650);
      return () => window.clearTimeout(timer);
    }
    if (die !== null && choices.length === 0) {
      const timer = window.setTimeout(() => {
        setDie(null);
        const nextTurn: Side = turn === 'player' ? 'computer' : 'player';
        setTurn(nextTurn);
        setNote(nextTurn === 'player' ? (language === 'ne' ? 'तपाईंको पालो।' : 'Your turn.') : (language === 'ne' ? 'कम्प्युटरको पालो…' : "Computer's turn…"));
      }, 850);
      return () => window.clearTimeout(timer);
    }
    if (turn === 'computer' && die !== null && choices.length) {
      const timer = window.setTimeout(() => moveToken('computer', chooseComputerToken(tokens, die, choices), die), 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [choices, die, language, moveToken, tokens, turn, winner]);

  const piecesAt = (row: number, column: number) => (['computer', 'player'] as Side[]).flatMap((side) => tokens[side].flatMap((progress, tokenIndex) => {
    const trackCell = absoluteTrackCell(side, progress);
    const coordinate = trackCell === null
      ? (progress >= TRACK_LENGTH && progress < FINISH ? (side === 'player' ? PLAYER_HOME : COMPUTER_HOME)[progress - TRACK_LENGTH] : null)
      : TRACK_COORDS[trackCell];
    return coordinate?.[0] === row && coordinate?.[1] === column ? [{ side, tokenIndex }] : [];
  }));

  return (
    <div className="offline-ludo">
      <header className="ludo-intro">
        <div><p className="eyebrow">{language === 'ne' ? 'इन्टरनेट बिना खेल्नुहोस्' : 'No internet needed'}</p><h3>{language === 'ne' ? 'तपाईं विरुद्ध कम्प्युटर' : 'You vs computer'}</h3></div>
        <button className="secondary-button" type="button" onClick={reset}>{language === 'ne' ? 'फेरि सुरु' : 'Restart'}</button>
      </header>

      <div className={`ludo-player-card computer ${turn === 'computer' ? 'active' : ''}`}><span>🤖</span><div><strong>{language === 'ne' ? 'कम्प्युटर' : 'Computer'}</strong><small>{language === 'ne' ? `${tokens.computer.filter((token) => token === FINISH).length}/2 घर` : `${tokens.computer.filter((token) => token === FINISH).length}/2 home`}</small></div><div className="yard-pieces">{tokens.computer.map((token, index) => token === -1 ? <i key={index} /> : null)}</div></div>

      <div className="ludo-board" aria-label={language === 'ne' ? 'लुडो बोर्ड' : 'Ludo board'}>
        {Array.from({ length: 49 }, (_, index) => {
          const row = Math.floor(index / 7);
          const column = index % 7;
          const trackIndex = TRACK_COORDS.findIndex(([trackRow, trackColumn]) => trackRow === row && trackColumn === column);
          const playerHome = PLAYER_HOME.some(([homeRow, homeColumn]) => homeRow === row && homeColumn === column);
          const computerHome = COMPUTER_HOME.some(([homeRow, homeColumn]) => homeRow === row && homeColumn === column);
          const pieces = piecesAt(row, column);
          const safe = SAFE_CELLS.has(trackIndex);
          return <div className={`ludo-cell ${trackIndex >= 0 ? 'track' : ''} ${safe ? 'safe' : ''} ${playerHome ? 'player-home' : ''} ${computerHome ? 'computer-home' : ''} ${row === 3 && column === 3 ? 'finish' : ''}`} key={index}>
            {safe ? <small>✦</small> : null}
            {pieces.map(({ side, tokenIndex }) => <button
              aria-label={`${side === 'player' ? (language === 'ne' ? 'तपाईं' : 'Your') : (language === 'ne' ? 'कम्प्युटर' : 'Computer')} token ${tokenIndex + 1}`}
              className={`ludo-piece ${side} ${side === 'player' && turn === 'player' && die !== null && choices.includes(tokenIndex) ? 'movable' : ''}`}
              disabled={side !== 'player' || turn !== 'player' || die === null || !choices.includes(tokenIndex)}
              key={`${side}-${tokenIndex}`}
              onClick={() => die !== null && moveToken('player', tokenIndex, die)}
              type="button"
            />)}
          </div>;
        })}
        <div className="ludo-center-mark">A</div>
      </div>

      <div className={`ludo-player-card player ${turn === 'player' ? 'active' : ''}`}><span>🙂</span><div><strong>{language === 'ne' ? 'तपाईं' : 'You'}</strong><small>{language === 'ne' ? `${tokens.player.filter((token) => token === FINISH).length}/2 घर` : `${tokens.player.filter((token) => token === FINISH).length}/2 home`}</small></div><div className="yard-pieces">{tokens.player.map((token, index) => token === -1 ? <i key={index} /> : null)}</div></div>

      <section className="ludo-controls" aria-live="polite">
        <div className={`ludo-die ${die ? 'rolled' : ''}`} aria-label={die ? `Dice ${die}` : 'Dice'}>{die ? DICE[die - 1] : '🎲'}</div>
        <div><strong>{winner ? note : turn === 'player' ? (language === 'ne' ? 'तपाईंको पालो' : 'Your turn') : (language === 'ne' ? 'कम्प्युटर खेल्दैछ' : 'Computer is playing')}</strong><small>{winner ? (language === 'ne' ? 'फेरि खेल्न Restart थिच्नुहोस्।' : 'Tap Restart to play again.') : note}</small></div>
        <button className="primary-button" type="button" disabled={turn !== 'player' || die !== null || Boolean(winner)} onClick={rollPlayerDice}>{language === 'ne' ? 'पासा घुमाउनुहोस्' : 'Roll dice'}</button>
      </section>

      <footer className="ludo-footer"><span>{language === 'ne' ? 'छ आएपछि टोकन खुल्छ। ✦ सुरक्षित घर हो।' : 'Roll six to leave the yard. ✦ marks a safe square.'}</span><button className="text-button" type="button" onClick={onSchedule}>{language === 'ne' ? 'पछि खेल्न पात्रोमा राख्नुहोस्' : 'Schedule 45 min for later'}</button></footer>
    </div>
  );
}
