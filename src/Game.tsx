import { useEffect, useRef, useState } from "react";
import { Row, RowState } from "./Row";
import fives_dictionary from "./fives_dictionary.json";
import offensive from "./offensive.json";
import { Clue, hotclue, CluedLetter, describeClue } from "./clue";
import { Keyboard } from "./Keyboard";
import { Thermometer } from "./Thermometer";
import targetList from "./targets.json";
import {
  gameName,
  pick,
  speak,
  dayNum,
  todayDayNum,
  cheat,
  makeRandom,
  practice,
  hotClueDistance,
  bonusPuzzle,
  decoratedGameName,
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

function levenshtein(a: string, b: string, max: number): number {
  if (max <= 0) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a[0] === b[0]) return levenshtein(a.substring(1), b.substring(1), max);
  if (max === 1) return 1;
  return 1 + Math.min(
      levenshtein(a, b.substring(1), max-1),
      levenshtein(a.substring(1), b, max-1),
      levenshtein(a.substring(1), b.substring(1), max-1)
  );
}

const offensiveWords = offensive.filter((word) => word.length >= 4 && word.length <= 6); 
function isGoodInitialGuess(target: string, candidate: string) {
  if (/\*/.test(candidate)) {
    return false;
  }

  if(fives_dictionary.includes(candidate)) {
    return false;
  }

  if (practice || dayNum >= 145) {
    for(let word of offensiveWords) {
      let max = 3;
      let distance = levenshtein(candidate,word,max);
      if (distance < max) {
        return false;
      }
    }
  }

  let hints = hotclue(candidate, target);
  let green = countMatching(hints).get(Clue.Correct) ?? 0;
  let yellow = countMatching(hints).get(Clue.Elsewhere) ?? 0;
  if (!practice && dayNum <= 120) {
    return green != 5;
  }
  return green == 0 && yellow <= 2;
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

const uniqueGame = 3000000 * (3 - hotClueDistance) + (practice ? 300000 : 3000);
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

  const bonusKey = bonusPuzzle == "" ? "" : (".bonus-" + bonusPuzzle.toString());
  const stateStorageKey = practice ? "practiceState" : (gameDayStoragePrefix+seed+bonusKey);
  const guessesStorageKey = practice ? "practiceGuesses" : (guessesDayStoragePrefix+seed+bonusKey);

  const [gameState, setGameState] = useLocalStorage<GameState>(stateStorageKey, GameState.Playing);
  const [guesses, setGuesses] = useLocalStorage<string[]>(guessesStorageKey, puzzle.initialGuesses);
  const [currentGuess, setCurrentGuess] = useState<[string,number]>(["     ",0]);
  const [hint, setHint] = useState<string>(getHintFromState());
   
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
    if (/^[a-z ]$/i.test(key)) {
      setCurrentGuess(([guess,cursor]) => {
          if ( cursor == -1 ) return [guess,cursor];
          return [(guess.slice(0,cursor) + key.toLowerCase() + guess.slice(cursor+1)).slice(0, 5), cursor == 4 ? -1 : cursor+1]
        }        
      );
      tableRef.current?.focus();
      setHint(getHintFromState());
    } else if (key === "Backspace") {
      setCurrentGuess(([guess,cursor]) => {
        let realCursor = cursor == -1 ? 5 : cursor;
        if (cursor != -1 && guess[cursor] != " " ) {
          // delete at the cursor and back up if the cursor is currently on a typed letter
          return [(guess.slice(0,cursor) + " " + guess.slice(cursor+1)).slice(0,5),Math.max(0,realCursor-1)];
        }
        // if the cursor is on a space, delete behind the cursor and back up
        return [(guess.slice(0,realCursor-1) + " " + guess.slice(realCursor)).slice(0, 5),Math.max(0,realCursor-1)]
      });
      setHint(getHintFromState());
    } else if (key === "Enter") {
      if (currentGuess[0].length !== 5 || currentGuess[0].lastIndexOf(" ") !== -1) {
        setHint("More letters, please.");
        return;
      }
      if(guesses.includes(currentGuess[0])) {
        setHint("You've already guessed that!");
        return;
      }
      if (!fives_dictionary.includes(currentGuess[0])) {
        setHint(`That's not in the word list!`);
        return;
      }

      setGuesses((guesses) => guesses.concat([currentGuess[0]]));
      setCurrentGuess(["     ",0]);
      speak(describeClue(hotclue(currentGuess[0], puzzle.target)));
      doWinOrLose();
    } else if (key === "ArrowRight") {
      setCurrentGuess(([guess,cursor]) => [guess,cursor == 4 ? 0 : cursor+1]);
    } else if (key === "ArrowLeft") {
      setCurrentGuess(([guess,cursor]) => [guess,cursor == -1 ? 4 : cursor == 0 ? 4 : cursor-1]);
    } else if (key === "Delete") {
      setCurrentGuess(([guess,cursor]) => [(guess.slice(0,cursor) + " " + guess.slice(cursor+1)).slice(0,5),cursor]);
    } else if (key === "SpaceBar" ) {
      setCurrentGuess(([guess,cursor]) => {
        if ( cursor == -1 ) return [guess,cursor];
        return [(guess.slice(0,cursor) + " " + guess.slice(cursor+1)).slice(0, 5), cursor == 4 ? -1 : cursor+1]
      }        
    );
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
      if (["Backspace", "Delete", "SpaceBar", "ArrowLeft", "ArrowRight", " "].lastIndexOf(e.key) !== -1) {
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

  let getCluedColumn = (selectedColumn: number) => {
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
    return cluedColumn;
  };

  let getLetterInfo = (cluedColumn: CluedLetter[]) => {
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
    return letterInfo;
  };

  let cluedColumn = getCluedColumn(currentGuess[1]);
  let letterInfo = getLetterInfo(cluedColumn);  
  let letterInfos = [
    getLetterInfo(getCluedColumn(0)),
    getLetterInfo(getCluedColumn(1)),
    getLetterInfo(getCluedColumn(2)),
    getLetterInfo(getCluedColumn(3)),
    getLetterInfo(getCluedColumn(4)),
  ];

  const tableRows = Array(props.maxGuesses)
    .fill(undefined)
    .map((_, i) => {
      const guess = [...guesses, currentGuess[0]][i] ?? "";
      const cluedLetters = hotclue(guess, puzzle.target);
      const lockedIn = i < guesses.length;
      const editingState = gameState === GameState.Playing ? RowState.Editing : RowState.Pending;
      return (
        <Row
          key={i}         
          currentGuess={currentGuess}
          onClick={(i)=>(setCurrentGuess(([guess,cursor])=>[guess,i]))}
          rowState={
            lockedIn
              ? RowState.LockedIn
              : (i === guesses.length)
              ? editingState
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
  const practiceLink2 = "?unlimited&warm=2";
  const practiceLink3 = "?unlimited&warm=1";
  const prevLink = "?x=" + (dayNum-1).toString();
  const nextLink = "?x=" + (dayNum+1).toString();

  const [readNewsDay, setReadNewsDay] = useLocalStorage<number>("read-news-", 0);
  let news = "";
  let showNews = false;
  let newsPostedDay = 20;
  const canShowNews = news !== "" && dayNum >= newsPostedDay;
  const newsHasntBeenRead = readNewsDay < newsPostedDay;
  const newsReadToday = readNewsDay == dayNum;
  if (!practice && canShowNews && (newsHasntBeenRead || newsReadToday)) {
    showNews = true;
    if (!newsReadToday) {
      setReadNewsDay(dayNum);
    }
  }

  function bonusPuzzleName(bonusType: string) : string {
    return bonusType === "hot" ? "Super Warmle" : bonusType === "boiling" ? "Super Warmle PLUS" : "";
  }

  function bonusPuzzleParam(bonusType: string) : string|false {
    if ( bonusType === "hot" ) return "?bonus=hot&x="+dayNum;
    if ( bonusType === "boiling" ) return "?bonus=boiling&x="+dayNum;
    return false;
  }

  function nextBonusPuzzleType() {
    return ( bonusPuzzle === "" 
    ? "hot"
    : bonusPuzzle === "hot"
    ? "boiling"
    : "" );
  }

  function prevBonusPuzzleType() {
    return ( bonusPuzzle === "boiling" 
    ? "hot"
    : bonusPuzzle === "hot"
    ? ""
    : "" );
  }


  const currentBonusParam = (bonusPuzzle !== "" && !practice && bonusPuzzleParam(bonusPuzzle));
  const currentBonusPuzzleName = (bonusPuzzle !== "" && !practice && bonusPuzzleName(bonusPuzzle));

  const nextBonusPuzzleParam = (gameState == GameState.Won && !practice && bonusPuzzleParam(nextBonusPuzzleType()));
  const nextBonusPuzzleName = (gameState === GameState.Won && !practice && bonusPuzzleName(nextBonusPuzzleType()));

  const prevBonusPuzzleParam = (bonusPuzzle !== "" && !practice && bonusPuzzleParam(prevBonusPuzzleType()));
  const prevBonusPuzzleName = (bonusPuzzle !== "" && !practice && bonusPuzzleName(prevBonusPuzzleType()));


  const dailyLink = "/?x=" + dayNum;
  const letterOrLetters = hotClueDistance === 2 ? "letter" : "letters";   
  const bonusPuzzleLink = nextBonusPuzzleParam && (<p>Or do the <a href={nextBonusPuzzleParam}>{nextBonusPuzzleName}</a> bonus puzzle.<div>(You only get yellows if you're within {hotClueDistance-1} {letterOrLetters}.)</div></p>)
 
  return (
    <div className="Game" style={{ display: props.hidden ? "none" : "block" }}>
      <div className="Game-options">
        {!practice && canPrev && <span><a className="NextPrev" href={prevLink}>«</a> </span>}
        {!practice && bonusPuzzle !== "" && <a href={dailyLink}>Day {dayNum}{`${cheatText}`}</a>}
        {!practice && bonusPuzzle == "" && <span>Day {dayNum}{`${cheatText}`}</span>}
        {!practice && prevBonusPuzzleParam && (<span>| <a href={prevBonusPuzzleParam}>{prevBonusPuzzleName}</a></span>)}        
        {!practice && currentBonusParam && (<span>| {currentBonusPuzzleName}</span>)}
        {!practice && nextBonusPuzzleParam && (<span>| <a href={nextBonusPuzzleParam}>{nextBonusPuzzleName}</a></span>)}
        {!practice && canNext && <span> <a className="NextPrev" href={nextLink}>»</a></span>}
        {practice && <span>{`${cheatText}`}</span>}
        {practice && <span><a href={practiceLink} onClick={ ()=>{resetPractice();} }>+ New</a></span>}
        {practice && <span><a href={practiceLink2} onClick={ ()=>{resetPractice();} }>+ New Super</a></span>}
        {practice && <span><a href={practiceLink3} onClick={ ()=>{resetPractice();} }>+ New Super PLUS</a></span>}
      </div>
      {showNews && (<div className="News">{news}<br/>{'\u00a0'}
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
        {hint && bonusPuzzleLink}
        {gameState !== GameState.Playing && !practice && (
          <p>
          <button
            onClick={() => {
              const score = gameState === GameState.Lost ? "X" : (guesses.length-1);
              share(
                "Result copied to clipboard!",
                `${decoratedGameName} #${dayNum} ${score}/${props.maxGuesses-1}\n` +
                emojiBlock({guesses:guesses, puzzle:puzzle, gameState:gameState}, props.colorBlind)
              );
            }}
          >
            Share
          </button>
          </p>
        )}
      </p>
      <Keyboard
        layout={props.keyboardLayout}
        letterInfo={letterInfo}
        onKey={onKey}
      />
      <Thermometer letterInfos={letterInfos} gameState={gameState}/>
    </div>
  );
}

export default Game;
