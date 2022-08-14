import { Clue, clueClass } from "./clue";
import dictionary from "./fives_dictionary.json";
import { GameState } from "./Game";

interface ThermometerProps {
  letterInfos: Map<string, Clue>[]; 
  gameState: GameState;
}

export function Thermometer(props: ThermometerProps) {
  let numRemain = 0;
  for(var word of dictionary) {
    let possible = true;
    for(var i = 0; i < props.letterInfos.length; ++i) {
        var letter = word.charAt(i);
        let clue = props.letterInfos[i].get(letter);
        if (clue === Clue.Absent) {
            possible = false;
            break;
        }
    }
    if(possible) {
      ++numRemain;
    }
  }

  const ratioEliminated = (1.0 - numRemain/dictionary.length);

  let pctShow = Math.floor(100 * Math.pow(ratioEliminated, 100));
  
  if (pctShow != 100) {
      pctShow = pctShow > 99 ? 99 : pctShow < 10 ? 10 : pctShow;
  }
  
  if (props.gameState === GameState.Won) {
    pctShow = 100;
  }

  let className = pctShow < 15
    ? "Freezing"
    : pctShow < 35
    ? "Cold" 
    : pctShow < 60
    ? "Chilly"
    : pctShow < 70
    ? "Warm"
    : pctShow < 90
    ? "Hot"
    : "Boiling";

  let temperatureText = props.gameState !== GameState.Won && (
    <div className="Remaining-possibilities">{className}</div>
  );
  
  return (
    <div id="countdown-wrap">
        <div id="glass">
            <div id="progress" className={className} style={{width: pctShow + "%"}}>
            </div>
        </div>
        {temperatureText}
    </div>    
  );

}
