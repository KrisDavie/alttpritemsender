import { useEffect, useState } from "react"
import Header from "./features/Header"
import { useReadMemoryQuery } from "./features/sni/sniApiSlice"
import { useAppSelector, usePrevious } from "./app/hooks"
import ItemTable from "./features/ItemTable"
import ItemDisplayPanel from "./features/ItemDisplayPanel"
import _items from "./data/items.json"
import { useLocalStorage } from "usehooks-ts"
import { Button } from "./components/ui/button"

interface IItems {
  [index: string]: String
}

export interface IItemSendInfo {
  item: string
  sentTS: number
  unlockedTS: number
  unlockMethod: "manual" | "auto" | "locked"
}

const dungeonKeyMap: { [key: number]: string } = {
  0: "Small Key (Escape)",
  1: "Small Key (Eastern Palace)",
  2: "Small Key (Desert Palace)",
  3: "Small Key (Agahnims Tower)",
  4: "Small Key (Swamp Palace)",
  5: "Small Key (Palace of Darkness)",
  6: "Small Key (Misery Mire)",
  7: "Small Key (Skull Woods)",
  8: "Small Key (Ice Palace)",
  9: "Small Key (Tower of Hera)",
  10: "Small Key (Thieves Town)",
  11: "Small Key (Turtle Rock)",
  12: "Small Key (Ganons Tower)",
}

function App() {
  const pollingInterval = useAppSelector((state) => state.sni.pollInterval)
  const [sentItems, setSentItems] = useState<IItemSendInfo[]>([])
  const [canSend, setCanSend] = useState(true)
  const receiving = useAppSelector((state) => state.sni.receiving)
  const [romNameLS, setRomNameLS] = useState("")

  const connectedDevice = useAppSelector((state) => state.sni.connectedDevice)
  const items: IItems = _items

  const itemHoldmemReply = useReadMemoryQuery(
    { memLoc: 0xf502d8, size: 1 },
    { pollingInterval: pollingInterval, skip: canSend },
  ).data

  const keysMemReply = useReadMemoryQuery(
    { memLoc: 0xf5f4e1, size: 0x0D },
    { pollingInterval: pollingInterval, skip: canSend },
  ).data

  const prevKeysMemReply = usePrevious(keysMemReply)

  const romNameMem = useReadMemoryQuery(
    { memLoc: 0xe02000, size: 0x15 },
    { pollingInterval: romNameLS === "" ? 500 : 5000 },
  ).data

  const [lsData, setLsData] = useLocalStorage(
    "go-1Data",
    {},
    { serializer: JSON.stringify, deserializer: JSON.parse },
  )

  useEffect(() => {
    if (!connectedDevice || receiving || canSend || !keysMemReply || !prevKeysMemReply) return
    // compare prevKeysMemReply and keysMemReply arrays
    var keysChanged = prevKeysMemReply.reduce((acc: Array<number>, prevKey: number, index: number) => {
      if (prevKey !== keysMemReply[index]) {
        acc.push(index)
      }
      return acc
    }, [])
    keysChanged.forEach((key: number) => {
      if (key >= 0 && key <= 12) {
        const item = dungeonKeyMap[key]
        if (item === sentItems[0]?.item) {
          handleUnlock("auto")
        }
      }
    })
  }, [keysMemReply, prevKeysMemReply, canSend, receiving, connectedDevice])

  useEffect(() => {
    if (!connectedDevice || receiving || canSend || !itemHoldmemReply) return
    const memReplyInt = parseInt(itemHoldmemReply.toString(), 16)
    if (memReplyInt === 0) {
      return
    }
    if (items[memReplyInt] === sentItems[0].item) {
      handleUnlock("auto")
    }
  }, [itemHoldmemReply, canSend, receiving, connectedDevice])

  useEffect(() => {
    if (romNameLS === "") return
    lsData[romNameLS] = sentItems
    setLsData(lsData)
  }, [romNameLS, sentItems])

  useEffect(() => {
    if (romNameMem && romNameMem.length > 0) {
      var romNameStr = String.fromCharCode.apply(null, Array.from(romNameMem))
      if (romNameStr === romNameLS) return
      setRomNameLS(romNameStr)
      const gameData = lsData[romNameStr] || []
      setSentItems(gameData)
      setCanSend(gameData[0]?.unlockMethod !== "locked")
    } else {
      setRomNameLS("")
    }
  }, [romNameMem, lsData])



  const handleSendItem = (item: string, sentTS: number) => {
    setSentItems([
      { item, sentTS, unlockedTS: 0, unlockMethod: "locked" },
      ...sentItems,
    ])
  }

  const handleUnlock = (unlockMethod: "manual" | "auto") => {
    const curItem = sentItems[0]
    curItem.unlockMethod = unlockMethod
    curItem.unlockedTS = Date.now()
    setSentItems([curItem, ...sentItems.slice(1)])
    setCanSend(true)
  }

  const handleResetSeed = () => {
    const res = window.confirm(
      "Are you sure you want to reset the seed? This will remove all sent items from the log."
    )
    if (res) {
      setSentItems([])
      setCanSend(true)
    }
  }

  const exportSentItems = () => {
    const humanReadableSentItems = sentItems.map((item) => {
      return {
        item: item.item,
        sentTS: new Date(item.sentTS).toLocaleString('en-US', {timeZoneName: "short"}),
        unlockedTS: new Date(item.unlockedTS).toLocaleString('en-US', {timeZoneName: "short"}),
        unlockMethod: item.unlockMethod,
      }
    })
    const dataStr = JSON.stringify(humanReadableSentItems, null, 4)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = "sent_items.json"
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="flex flex-col max-w-[480px] mx-auto">
      <Header />
      <ItemTable
        sentItems={sentItems}
        setSentItem={handleSendItem}
        canSend={canSend}
        setCanSend={setCanSend}
        handleManualUnlock={() => handleUnlock("manual")}
      />
      <div className="flex flex-col justify-start mt-4">
        <div className="flex flex-row items-center justify-between font-bold">
          Sent Items
          <div>
            <Button size="sm" onClick={handleResetSeed} disabled={romNameLS === ""} variant="destructive" className="mx-1">Reset Seed</Button>
            <Button size="sm" onClick={exportSentItems} disabled={sentItems.length === 0} className="mx-1">Export Sent Items</Button>
          </div>
        </div>
        <ItemDisplayPanel sentItems={sentItems} />
      </div>
    </div>
  )
}

export default App
