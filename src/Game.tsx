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
  makeRandom,
  practice,
  allowPractice,
  todayDate
} from "./util";

import { Day } from "./Stats"

export enum GameState {
  Playing,
  Won,
  Lost,
}

export const gameDayStoragePrefix = "warmle.results-";
export const guessesDayStoragePrefix = "warmle.guesses-";

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
  return `You ${verbed}! The answer was ${target.toUpperCase()}. Play again tomorrow!`; 
}

const uniqueGame = 3000;
export function makePuzzle(seed: number) : Puzzle {
  let random = makeRandom(seed+uniqueGame);
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

  let seed: number = dayNum;
  if (practice) {
    seed = new Date().getMilliseconds();
    if (!(new URLSearchParams(window.location.search).has("new"))) {
      try {
        let storedSeed = window.localStorage.getItem("practice");
        if (storedSeed) {
          seed = parseInt(storedSeed);
        } else {
          window.localStorage.setItem("practice",""+seed);
        }
      } catch(e) {
      }
    }
  }

  const [puzzle, setPuzzle] = useState(() => {
    return makePuzzle(seed);
  });

  let stateStorageKey = practice ? "practiceState" : (gameDayStoragePrefix+seed);
  let guessesStorageKey = practice ? "practiceGuesses" : (guessesDayStoragePrefix+seed);

  const [gameState, setGameState] = useLocalStorage<GameState>(stateStorageKey, GameState.Playing);
  const [guesses, setGuesses] = useLocalStorage<string[]>(guessesStorageKey, puzzle.initialGuesses);
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
      return `Start guessing!`;
    }
    return ``;
  }
  
  const resetPractice = () => {
    if (practice) {
        window.localStorage.removeItem("practice");
        window.localStorage.removeItem("practiceState");
        window.localStorage.removeItem("practiceGuesses");
    }
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
        setHint("More letters, please.");
        return;
      }
      if(guesses.includes(currentGuess)) {
        setHint("You've already guessed that!");
        return;
      }
      if (!dictionary.includes(currentGuess)) {
        setHint(`That's not in the word list!`);
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
      resetPractice();
    } else if (guesses.length >= props.maxGuesses) {
      setGameState(GameState.Lost);
      resetPractice();
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

    let proximityLetters:string[] = [];
    let nonProximityLetters:string[] = [];
    for (let charCode="a".charCodeAt(0); charCode <= "z".charCodeAt(0); ++charCode) {
      let distance = letter.charCodeAt(0) - charCode;
      if ( distance === 0 ) continue;
      if ( Math.abs(distance) > hotClueDistance ) {
        nonProximityLetters = [...nonProximityLetters, String.fromCharCode(charCode)];
      }
      else {
        proximityLetters = [...proximityLetters, String.fromCharCode(charCode)];
      }
    }

    if (clue === Clue.Absent) {
      for (let letter of proximityLetters) {
        letterInfo.set(letter, Clue.Absent);
      }
    }

    if (clue === Clue.Elsewhere) {
      for (let letter of proximityLetters) {
        const old = letterInfo.get(letter);
        if (old === undefined) {
          letterInfo.set(letter, Clue.Elsewhere);
        }
      }
      for (let letter of nonProximityLetters) {
        const old = letterInfo.get(letter);
        letterInfo.set(letter, Clue.Absent);
      }      
    }

    if (clue === Clue.Correct) {
      for (let letter of proximityLetters) {
         letterInfo.set(letter, Clue.Absent);
      }
      for (let letter of nonProximityLetters) {
        letterInfo.set(letter, Clue.Absent);
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
  const todayLink = "?";
  const practiceLink = "?unlimited";
  const prevLink = "?x=" + (dayNum-1).toString();
  const nextLink = "?x=" + (dayNum+1).toString();

  const [readNewsDay, setReadNewsDay] = useLocalStorage<number>("read-news-", 0);
  let showNews = false;
  let newsPostedDay = 11;
  const canShowNews = dayNum >= newsPostedDay;
  const newsHasntBeenRead = readNewsDay < newsPostedDay;
  const newsReadToday = readNewsDay == dayNum;
  if (!practice && canShowNews && (newsHasntBeenRead || newsReadToday)) {
    showNews = true;
    if (!newsReadToday) {
      setReadNewsDay(dayNum);
    }
  }
 
  return (
    <div className="Game" style={{ display: props.hidden ? "none" : "block" }}>
      <div className="Game-options">
        {!practice && canPrev && <span><a href={prevLink}>Previous</a> |</span>}
        {!practice && <span>Day {dayNum}{`${cheatText}`}</span>}
        {!practice && canNext && <span>| <a href={nextLink}>Next</a></span>}
        {practice && <span>{`${cheatText}`}</span>}
        {practice && <span><a href={practiceLink} onClick={ ()=>{resetPractice();} }>+ New Puzzle</a></span>}
      </div>
      {showNews && (<div className="News">
      BREAKING NEWS: Since April 1 there has been a bug causing players to play two different daily puzzles, depending on how you navigated the page.
      The <b>calendar feature</b> above has been <b>reset</b> so that April 1 = Day 1. <b>This does not affect your stats</b>.
      </div>) }  
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
        {gameState !== GameState.Playing && !practice && (
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
