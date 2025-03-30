import { useEffect, useState } from "react"
import _items from "../data/sprite_locs.json"
import { useSendItemMutation } from "./sni/sniApiSlice"
import { Button } from "@/components/ui/button"
import { IItemSendInfo } from "../App"

interface IItems {
  [key: string]: IItemInfo
}

interface IItemInfo {
  loc: number[]
  id: number
}

var items: IItems = _items

interface ItemTableProps {
  sentItems: IItemSendInfo[]
  setSentItem: (item: string, sentTS: number) => void
  canSend: boolean
  setCanSend: (canSend: boolean) => void
  handleManualUnlock: () => void
}

function ItemTable(props: ItemTableProps) {
  const { sentItems, setSentItem, canSend, setCanSend, handleManualUnlock } = props
  const [sendItems, sendItemsResult] = useSendItemMutation()
  const [reportGlow, setReportGlow] = useState("")
  const [cooldown, setCooldown] = useState(false)

  function handleItemClick(e: any) {
    if (cooldown) return
    const id = e.target.id
    const item = items[id]
    sendItems({ itemId: item.id })
    setReportGlow(id)
    const timestamp = Date.now()
    setSentItem(id, timestamp)
    setCooldown(true)
    setCanSend(false)
  }

  useEffect(() => {
    if (cooldown) {
      const interval = setInterval(() => {
        setCooldown(false)
      }, 1000)
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
  const lastItem = sentItems[0] || ["", 0]

  return (
    <div
      id="itemSheet"
      className={`
      flex flex-row bg-sprite w-[480px] h-[288px] bg-contain bg-no-repeat relative z-5
      ${canSend ? "" : "pointer-events-none"}
      `}
    >
      {canSend ? null : (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold py-2 px-4 rounded bg-gray-500 opacity-90 text-white z-8 pointer-events-none w-full h-full" />
      )}
      {canSend ? null : (
        <Button
          onClick={handleManualUnlock}
          className={`
        absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold py-2 px-4 rounded
        ${canSend ? "hidden" : "z-10 pointer-events-auto"}`}
        >
          Manual Unlock Next Item
        </Button>
      )}
      {Object.keys(items).map((key) => {
        const item = items[key]
        return (
          <div
            key={`itemsheet_${key}`}
            id={key}
            onClick={handleItemClick}
            className={`w-[48px] h-[48px] hover:border-2 hover:border-green-500 hover:duration-0 z-5
              ${cooldown ? "pointer-events-none" : ""} 
              transition ease-out duration-300 
              ${reportGlow === key ? "bg-green-500 bg-opacity-70" : ""} 
            ${lastItem.item === key ? "border-[2px] border-green-500" : ""}`}
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
