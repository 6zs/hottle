import { Clue } from "./clue";
import { Row, RowState } from "./Row";
import { gameName, maxGuesses } from "./util";

export function About() {
  return (
    <div className="App-about">
        <p>
          {gameName} is a variant of {" "}
          <a href="https://www.powerlanguage.co.uk/wordle/">
            wordle
          </a> and is one of three sibling sites:{" "}
          <br /><a href="https://xordle.xyz">xordle</a> -- two secret words, one board, no overlap between the words
          <br /><a href="https://fibble.xyz">Fibble</a> -- lies to you once per row
          <br /><a href="https://warmle.org">Warmle</a> -- yellows tell you if you've gotten close
          <br />code based on a fork of <a href="https://github.com/lynn/hello-wordl">hello wordl</a>
        </p>
      <p className="App-instructions">       
        <br />you get {maxGuesses} tries to guess both words
        <br />
        <br />you start with a random clue
        <br />it's the same for everyone
        <br />
        <br />letters in your guess are:
        <br />🟩 green if it's the right letter
        <br />🟨 yellow if it's the wrong letter <b>in that spot</b> but it's close! (within 3 letters alphabetically)
        <br />⬛ grey if it's more than 3 away from the right letter
      </p>
      <hr />
      <p>
        report issues{" "}
        <a href="https://github.com/6zs/hottle/issues">here</a>
      </p>
      <p>
      </p>
    </div>
  );
}
