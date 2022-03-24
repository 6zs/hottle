export enum Clue {
  Absent,
  Elsewhere,
  Correct,
}

export interface CluedLetter {
  clue?: Clue;
  letter: string;
}

export function hotclue(word: string, target: string): CluedLetter[] {
  let maxDistanceForYellow = 3;
  return word.split("").map((letter, i) => {
    if (target[i] === letter) {
      return { clue: Clue.Correct, letter };
    } else if (Math.abs(target.charCodeAt(i)-letter.charCodeAt(0)) <= maxDistanceForYellow) {
      return { clue: Clue.Elsewhere, letter };
    } else {
      return { clue: Clue.Absent, letter };
    }
  });
}

export function clueClass(clue: Clue, correctGuess: boolean): string {
  const suffix = (correctGuess ? "-fin" : "");
  if (clue === Clue.Absent) {
    return "letter-absent";
  } else if (clue === Clue.Elsewhere) {
    return "letter-elsewhere" + suffix;
  } else {
    return "letter-correct" + suffix;
  }
}

export function clueWord(clue: Clue): string {
  if (clue === Clue.Absent) {
    return "no";
  } else if (clue === Clue.Elsewhere) {
    return "elsewhere";
  } else {
    return "correct";
  }
}

export function describeClue(clue: CluedLetter[]): string {
  return clue
    .map(({ letter, clue }) => letter.toUpperCase() + " " + clueWord(clue!))
    .join(", ");
}
