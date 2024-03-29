import { Clue } from "./clue";
import { Row, RowState } from "./Row";
import { gameName, maxGuesses } from "./util";

export function About() {
  return (
    <div className="App-about">
      <p>
        {gameName} is a variant of {" "}
        <a href="https://www.powerlanguage.co.uk/wordle/"> 
        Wordle
        </a> by Josh Wardle and is one of three sibling sites{" "}
        <br /><br /> <a href="https://xordle.org">xordle</a> by <a href="https://twitter.com/kellydornhaus">keldor</a><br/>Two secret words, one board, no overlap between the words. 
        <br /><br /> <a href="https://fibble.xyz">Fibble</a> by K &amp; R Garfield, coded by keldor <br/>Lies to you once per row.
        <br /><br /> <a href="https://warmle.org">Warmle</a> by Mike Elliott, coded by keldor <br/>Yellows tell you if you've gotten close in that position.
      </p>
      <hr />
      <p className="App-instructions">    
        <h1>Warmle rules</h1>   
        You get {maxGuesses-1} tries to guess the word.
        <br />
        <br />You start with a random clue. It's the same for everyone.        
        <br />
        <br />Letters in your guess are:
        <br />🟩 Green if it's the right letter.
        <br />🟨 Yellow if it's the wrong letter <b>in that spot</b> but it's close! (within 3 letters alphabetically).
        <br />⬛ Grey if it's more than 3 away from the right letter.
        <br />The thermometer at the bottom is a sort of progress meter; it's based on how many words in the dictionary you've eliminated as possible answers given your clues so far.
        <p>
        <h1>Super Warmle rules</h1>   
        In the Super Warmle bonus games, the distance is reduced to 2 rather than 3. And in Super Warmle PLUS bonus games, it's reduced to 1.
        </p>
      </p>
      <hr />
      <p>
        Report issues{" "}
        <a href="https://github.com/6zs/hottle/issues">here</a> or send me an <a href="mailto:kellydornhaus@gmail.com">email</a> with feedback.
        <br />Code based on a fork of <a href="https://github.com/lynn/hello-wordl">hello wordl</a>.
      </p>
    </div>
  );
}
