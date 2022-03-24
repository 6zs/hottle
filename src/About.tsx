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
          </a>{" "}
          <br />code based on a fork of <a href="https://github.com/lynn/hello-wordl">hello wordl</a>
          <br />see also: <a href="https://fibble.xyz">fibble</a>
        </p>
      <p className="App-instructions">       
        <br />you get {maxGuesses} tries to guess both words
        <br />
        <br />you start with a random clue
        <br />it's the same for everyone
        <br />
        <br />letters in your guess are:
        <br />🟩 green if it's the right letter
        <br />🟨 yellow if yellow alphabetically within 3 letters of the right letter
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
