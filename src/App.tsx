import { useRef, useState } from "react";
import Header from "./features/Header"
import { useReadMemoryQuery } from "./features/sni/sniApiSlice";
import { setRaceOverride } from "./features/sni/sniSlice";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { Checkbox } from "./components/ui/checkbox";
import { Button } from "./components/ui/button";
import ItemTable from "./features/ItemTable";

function App() {

  const pollingInterval = useAppSelector((state) => state.sni.pollInterval)
  const [overrideAcknowlegde, setOverrideAcknowlegde] = useState(false)

  const memReply = useReadMemoryQuery(
    { memLoc: 0xF50020, size: 4 },
    { pollingInterval: pollingInterval },
  )

  const dispatch = useAppDispatch();
  const raceOverride = useAppSelector((state) => state.sni.raceOverride)

  const handleRaceOverride = () => {
    dispatch(setRaceOverride(true))
  }

  const race = false // memReply.error && !raceOverride

  const mapContent = race ? (
    <div className="flex flex-col w-4/6 items-center">
      <div className="flex text-red-700 text-2xl font-bold mt-32 w-5/6 text-center">ERROR: Race rom detected!</div>
      <div className="mt-4 mb-4">
      <Checkbox
        id='raceOverride'
        checked={overrideAcknowlegde}
        onClick={() => setOverrideAcknowlegde(!overrideAcknowlegde)}/>
      <label className="ml-3" htmlFor='raceOverride'>I understand that using this in a race is against the rules and that I would be cheating if I did so.</label>
      </div>
      <Button className="w-36" disabled={!overrideAcknowlegde} onClick={() => handleRaceOverride()}>Override</Button>
  </div>
  
  ) : (
    <ItemTable/>
  )

  
  return (
    <div className="flex flex-col items-center">
      <Header/>
      {mapContent}
    </div>
  )
}

export default App
