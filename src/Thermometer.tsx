import { Clue, clueClass } from "./clue";
import dictionary from "./dictionary.json";
import { GameState } from "./Game";
import { urlParam } from "./util"

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
  let text = numRemain == 1 ? "possiblility" : "possibilities";
  let pctEliminated = (1.0 - numRemain/(dictionary.length*.005));
  let pctShow = numRemain <= 1 ? 100 : Math.floor((100 * pctEliminated));
  if (pctShow != 100) {
      pctShow = pctShow > 97 ? 97 : pctShow < 3 ? 3 : pctShow;
  }
  if (props.gameState === GameState.Won) {
    pctShow = 100;
  }

  let className = pctShow < 15
  ? "freezing"
  : pctShow < 35
  ? "cold" 
  : pctShow < 50
  ? "chilly"
  : pctShow < 65
  ? "warm"
  : pctShow < 85
  ? "hot"
  : "boiling";
  
  return (
    <div id="countdown-wrap">
        <div id="glass">
            <div id="progress" className={className} style={{width: pctShow + "%"}}>
            </div>
        </div>
    </div>    
  );

  //<div className="Remaining-possibilities">{numRemain} {text}</div>
}
