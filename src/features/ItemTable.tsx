import { useEffect, useState } from "react"
import _items from "../data/sprite_locs.json"
import { useSendItemMutation } from "./sni/sniApiSlice"

interface IItems {
  [key: string]: IItemInfo
}

interface IItemInfo {
  loc: number[]
  id: number
}

var items: IItems = _items

function ItemTable() {
  const [sendItems, sendItemsResult] = useSendItemMutation()
  const [reportGlow, setReportGlow] = useState("")
  const [sentItems, setSentItems] = useState<string[]>([])
  const [cooldown, setCooldown] = useState(false)
  
  
  function handleItemClick(e: any) {
    if (cooldown) return
    const id = e.target.id
    const item = items[id]
    sendItems({ itemId: item.id })
    setReportGlow(id)
    sentItems.push(id)
    setCooldown(true)
  }

  useEffect(() => {
    if (cooldown) {
      const interval = setInterval(() => {
        setCooldown(false)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [cooldown])


  useEffect(() => {
    if (reportGlow) {
      const interval = setInterval(() => {
        setReportGlow("")
      }, 500)
      return () => clearInterval(interval)
    }
  }, [reportGlow])

  return (
    <div
      id="itemSheet"
      className="flex flex-row bg-sprite w-[480px] h-[288px] bg-contain bg-no-repeat relative"
    >
      {Object.keys(items).map((key) => {
        const item = items[key]
        return (
          <div
            key={key}
            id={key}
            onClick={handleItemClick}
            className={`w-[48px] h-[48px] hover:border-2 ${cooldown ? "border-red-500" : "border-green-500"} transition ease-out duration-300 ${reportGlow === key ? "bg-green-500 bg-opacity-70": ""} `}
            style={{
              position: "absolute",
              left: item.loc[1] * 48,
              top: item.loc[0] * 48,
            }}
          ></div>
        )
      })}
    </div>
  )
}

export default ItemTable
