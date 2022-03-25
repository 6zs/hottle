import { useEffect, useRef, useState } from "react";
import { Row, RowState } from "./Row";
import dictionary from "./dictionary.json";
import { Clue, hotclue, CluedLetter, describeClue, hotClueDistance } from "./clue";
import { Keyboard } from "./Keyboard";
import targetList from "./targets.json";
import {
  gameName,
  pick,
  speak,
  dayNum,
  todayDayNum,
  cheat,
  maxGuesses,
  makeRandom
} from "./util";

import { Day } from "./Stats"

export enum GameState {
  Playing,
  Won,
  Lost,
}

export const gameDayStoragePrefix = "warmle-game-day-";
export const guessesDayStoragePrefix = "warmle-guesses-day-";

function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((t: T) => T)) => void] {
  const [current, setCurrent] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch (e) {
      return initial;
    }
  });
  const setSetting = (value: T | ((t: T) => T)) => {
    try {
      const v = value instanceof Function ? value(current) : value;
      setCurrent(v);
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {}
  };
  return [current, setSetting];
}

interface GameProps {
  maxGuesses: number;
  hidden: boolean;
  colorBlind: boolean;
  keyboardLayout: string;
}

const eligible = targetList.slice(0, targetList.indexOf("murky") + 1).filter((word) => word.length === 5); // Words no rarer than this one

function isValidClue(word: string) {
  if (/\*/.test(word)) {
    return false;
  }
  return true;
}

function countMatching(cluedLetters: CluedLetter[]) : Map<Clue, number> {
  let counts = new Map<Clue,number>();
  for (const letter of cluedLetters) {
    let clue = letter.clue;
    if (clue) {
      let count = counts.get(clue) ?? 0;
      counts.set(clue, count+1);
    }
  }
  return counts;
}

function isGoodInitialGuess(target: string, candidate: string) {
  if (/\*/.test(candidate)) {
    return false;
  }
  let hints = hotclue(candidate, target);
  let green = countMatching(hints).get(Clue.Correct) ?? 0;
  let yellow = countMatching(hints).get(Clue.Elsewhere) ?? 0;
  return green != 5;
}

function randomTarget(random: ()=>number): string {
  let candidate: string;
  do {
    candidate = pick(eligible, random);
  } while (!isValidClue(candidate));
  return candidate;
}

function initialGuess(target: string, random: ()=>number): [string] {
  let candidate: string;
  do {
    candidate = "";
    for(var i = 0; i < 5; ++i )
    {
      candidate = candidate +  String.fromCharCode( 'a'.charCodeAt(0) + Math.floor(26 * random()) );
    } 
  } while(!isGoodInitialGuess(target, candidate));
  return [candidate];
}

function randomClue(target: string, random: ()=>number) {
  let candidate: string;
  do {
    candidate = pick(eligible, random);
  } while (target === candidate || !isValidClue(target));
  return candidate;
}

function gameOverText(state: GameState, target: string) : string {
  const verbed = state === GameState.Won ? "won" : "lost";
  return `you ${verbed}! the answers was ${target.toUpperCase()}. play again tomorrow`; 
}

const uniqueGameNumber = 200000;
export function makePuzzle(dayNum: number) : Puzzle {
  let random = makeRandom(dayNum+uniqueGameNumber);
  let target =  randomTarget(random);
  let puzzle: Puzzle = {
    target: target,
    initialGuesses: initialGuess(target, random)
  };
  return puzzle;
}

export function emojiBlock(day: Day, colorBlind: boolean) : string {
  const emoji = colorBlind
    ? ["⬛", "🟦", "🟧"]
    : ["⬛", "🟨", "🟩"];
  return day.guesses.map((guess) =>
        hotclue(guess, day.puzzle.target)
          .map((c) => emoji[c.clue ?? 0])
          .join("")
      )
      .join("\n");
}

export interface Puzzle {
  target: string,
  initialGuesses: string[]
}

function Game(props: GameProps) {

  const [puzzle, setPuzzle] = useState(() => {
    return makePuzzle(dayNum);
  });

  const [gameState, setGameState] = useLocalStorage<GameState>(gameDayStoragePrefix+dayNum, GameState.Playing);
  const [guesses, setGuesses] = useLocalStorage<string[]>(guessesDayStoragePrefix+dayNum, puzzle.initialGuesses);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [hint, setHint] = useState<string>(getHintFromState());
  const [selectedColumn, setSelectedColumn] = useState<number>(0);
   
  const tableRef = useRef<HTMLTableElement>(null);
  async function share(copiedHint: string, text?: string) {
    const url = window.location.origin + window.location.pathname;
    const body = (text ? text + "\n" : "") + url;
    if (
      /android|iphone|ipad|ipod|webos/i.test(navigator.userAgent) &&
      !/firefox/i.test(navigator.userAgent)
    ) {
      try {
        await navigator.share({ text: body });
        return;
      } catch (e) {
        console.warn("navigator.share failed:", e);
      }
    }
    try {
      await navigator.clipboard.writeText(body);
      setHint(copiedHint);
      return;
    } catch (e) {
      console.warn("navigator.clipboard.writeText failed:", e);
    }
    setHint(url);
  }

  function getHintFromState() {    
    if  (gameState === GameState.Won || gameState === GameState.Lost) {
      return gameOverText(gameState, puzzle.target);
    }
    if ( guesses.length === 0 && currentGuess === undefined ) {
      return `start guessin'`;
    }
    return ``;
  }

  const onKey = (key: string) => {
    if (gameState !== GameState.Playing) {
      return;
    } 
    if (guesses.length === props.maxGuesses) {
      return;
    }
    if (/^[a-z]$/i.test(key)) {
      setCurrentGuess((guess) =>
        (guess + key.toLowerCase()).slice(0, 5)
      );
      tableRef.current?.focus();
      setHint(getHintFromState());
      setSelectedColumn((currentGuess.length+1 < 5) ? (currentGuess.length+1) : -1 );
    } else if (key === "Backspace") {
      setCurrentGuess((guess) => guess.slice(0, -1));
      setHint(getHintFromState());
      setSelectedColumn(Math.max(0,currentGuess.length-1));
    } else if (key === "Enter") {
      if (currentGuess.length !== 5) {
        setHint("type more letters");
        return;
      }
      if(guesses.includes(currentGuess)) {
        setHint("you've already guessed that");
        return;
      }
      if (!dictionary.includes(currentGuess)) {
        setHint(`that's not in the word list`);
        return;
      }

      setSelectedColumn(0);
      setGuesses((guesses) => guesses.concat([currentGuess]));
      setCurrentGuess("");
      speak(describeClue(hotclue(currentGuess, puzzle.target)));
      doWinOrLose();
    }
  };

  const doWinOrLose = () => {
    if (guesses.includes(puzzle.target)) {
      setGameState(GameState.Won);
    } else if (guesses.length >= props.maxGuesses) {
      setGameState(GameState.Lost);
    } 
    setHint(getHintFromState());    
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        onKey(e.key);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [currentGuess, gameState]);

  useEffect(() => {
    doWinOrLose();
  }, [currentGuess, gameState, guesses, puzzle.target]);

  let reduceCorrect = (prev: CluedLetter, iter: CluedLetter, currentIndex: number, array: CluedLetter[]) => {
    let reduced: CluedLetter = prev;
    if ( iter.clue !== Clue.Correct ) {
      reduced.clue = Clue.Absent;
    }
    return reduced;
  };

  let cluedColumn: CluedLetter[] = selectedColumn !== -1 ? new Array(guesses.length) : [];
  if (selectedColumn !== -1) {
    guesses.map((guess,i) => {
      const lockedIn = i < guesses.length;
      if (lockedIn) {
        let clue = hotclue(guess, puzzle.target);
        cluedColumn[i] = clue[selectedColumn];
      }
    });
  }

  let letterInfo = new Map<string, Clue>();

  for (const { clue, letter } of cluedColumn) {
    
    if (clue === undefined) continue;

    if (clue === Clue.Absent || clue === Clue.Correct ) {
      letterInfo.set(letter, clue);
    } else if (clue === Clue.Elsewhere ) {
      letterInfo.set(letter, Clue.Absent);
    }

    if (clue === Clue.Absent || clue === Clue.Elsewhere) {
      let proximityLetters:string[] = [];
      for(let i = 0; i <= hotClueDistance; ++i) {
        let charCodeLeft = letter.charCodeAt(0) - i;
        let charCodeRight = letter.charCodeAt(0) + i;
        if (charCodeLeft >= 'a'.charCodeAt(0)) {
          proximityLetters = [...proximityLetters, String.fromCharCode(charCodeLeft)];
        } 
        if (charCodeRight <= 'z'.charCodeAt(0)) {
          proximityLetters = [...proximityLetters, String.fromCharCode(charCodeRight)];
        }
      }
      for (let letter of proximityLetters) {
        const old = letterInfo.get(letter);
        if (old === undefined || old === Clue.Elsewhere) {
          letterInfo.set(letter, clue);
        }   
      }
    }
  }


  const tableRows = Array(props.maxGuesses)
    .fill(undefined)
    .map((_, i) => {
      const guess = [...guesses, currentGuess][i] ?? "";
      const cluedLetters = hotclue(guess, puzzle.target);
      const lockedIn = i < guesses.length;
      return (
        <Row
          key={i}         
          rowState={
            lockedIn
              ? RowState.LockedIn
              : (i === guesses.length)
              ? RowState.Editing
              : RowState.Pending
          }
          cluedLetters={cluedLetters}
          cluedColumn={cluedColumn}
          annotation={`\u00a0`}          
        />
      );
    });

  const cheatText = cheat ? ` ${puzzle.target}` : "";
  const canPrev = dayNum > 1;
  const canNext = dayNum < todayDayNum;
  const prevLink = "?d=" + (dayNum-1).toString();
  const nextLink = "?d=" + (dayNum+1).toString();

  return (
    <div className="Game" style={{ display: props.hidden ? "none" : "block" }}>
      <div className="Game-options">
        {canPrev && <span><a href={prevLink}>prev</a> |</span>}
        <span>day {dayNum}{`${cheatText}`}</span>
        {canNext && <span>| <a href={nextLink}>next</a></span>}
      </div>
     
      <table
        className="Game-rows"
        tabIndex={0}
        aria-label="table of guesses"
        ref={tableRef}
      >
        <tbody>{tableRows}</tbody>
      </table>
      <p
        role="alert"
        style={{
          userSelect: /https?:/.test(hint) ? "text" : "none",
          whiteSpace: "pre-wrap",
        }}
      >
        {hint || `\u00a0`}
        {gameState !== GameState.Playing && (
          <p>
          <button
            onClick={() => {
              const score = gameState === GameState.Lost ? "X" : guesses.length;
              share(
                "result copied to clipboard!",
                `${gameName} #${dayNum} ${score}/${props.maxGuesses}\n` +
                emojiBlock({guesses:guesses, puzzle:puzzle, gameState:gameState}, props.colorBlind)
              );
            }}
          >
            share emoji results
          </button>
          </p>
        )}
      </p>
      <Keyboard
        layout={props.keyboardLayout}
        letterInfo={letterInfo}
        onKey={onKey}
      />
    </div>
  );
}

export default Game;
