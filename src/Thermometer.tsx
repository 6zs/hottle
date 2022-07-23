import { Clue, clueClass } from "./clue";
import dictionary from "./dictionary.json";
import { urlParam } from "./util"

interface ThermometerProps {
  letterInfos: Map<string, Clue>[]; 
}

export function Thermometer(props: ThermometerProps) {
  let numRemain = 0;
  for(var word of dictionary) {
    let possible = true;
    for(var i = 0; i < props.letterInfos.length; ++i) {
        var letter = word.charAt(i);
        let clue = props.letterInfos[i].get(letter);
        if (clue == Clue.Absent) {
            possible = false;
            break;
        }
    }
    if(possible) {
      ++numRemain;
    }
  }
  let text = numRemain == 1 ? "possiblility" : "possibilities";
  let pctEliminated = (1.0 - numRemain/(dictionary.length*.2));
  let pctShow = numRemain == 1 ? 100 : Math.floor((100 * pctEliminated));
  if (pctShow != 100) {
      pctShow = pctShow > 95 ? 95 : pctShow < 5 ? 5 : pctShow;
  }
  
  return (
    <div id="countdown-wrap">
        <div id="glass">
            <div id="progress" style={{width: pctShow + "%"}}>
            </div>
        </div>
    </div>    
  );

  //<div className="Remaining-possibilities">{numRemain} {text}</div>
}
