import _items from "../data/sprite_locs.json"
import { IItemSendInfo } from "../App"
import { Forward, LockOpen } from "lucide-react"

interface IItems {
  [key: string]: IItemInfo
}

interface IItemInfo {
  loc: number[]
  id: number
}

const SpriteLocs: IItems = _items

const SHEET_WIDTH = 10
const SHEET_HEIGHT = 6

function ItemDisplayPanel(props: { sentItems: IItemSendInfo[] }) {
  const { sentItems } = props
  const itemList = sentItems.map((item: IItemSendInfo, index: number) => {
    let item_name = item.item
    if (SpriteLocs[item_name] === undefined) return
    const posX = (SHEET_HEIGHT - SpriteLocs[item_name]["loc"][0]) * 48
    const posY = (SHEET_WIDTH - SpriteLocs[item_name]["loc"][1]) * 48
    const ts = new Date(item.sentTS)
    const unlockTs = new Date(item.unlockedTS)

    return (
      <div
        key={`${item}_${index}`}
        className="flex flex-row items-center h-[48px] w-[120px] mt-2"
      >
        <div
          key={`${item}_${index}_img`}
          className="h-[48px] w-[48px] bg-sprite"
          style={{
            backgroundPositionX: `${posY}px`,
            backgroundPositionY: `${posX}px`,
          }}
          title={item.item} // Add hoverable element
        />
        <div
          key={`${item}_${index}_data`}
          className="text-xs w-[72px] 
          flex flex-col justify-start items-start ml-2"
        >
          <div
            key={`${item}_${index}_time`}
            className="flex flex-row items-center"
          >
            <Forward size={12} />
            {ts.toLocaleTimeString("en-US", {
              hour12: false,
            })}
          </div>
          <div
            key={`${item}_${index}_unlock`}
            className="flex flex-col items-center"
          >
            {item.unlockMethod !== "locked" ? (
              <>
                <div className="flex flex-row items-center">
                  <LockOpen size={12} />
                  {unlockTs.toLocaleTimeString("en-US", {
                    hour12: false,
                  })}
                </div>
                ({item.unlockMethod})
              </>
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    )
  })

  return (
    <div className="flex flex-row flex-wrap align-middle items-center mt-2">
      {itemList}
    </div>
  )
}

export default ItemDisplayPanel
