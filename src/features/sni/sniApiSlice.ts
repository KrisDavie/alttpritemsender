import type { RootState } from "@/app/store"
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import {
  romChange,
  setConnectedDevice,
  setDeviceList,
  setGrpcConnected,
  setMemoryMapping,
  setPrevSram,
  setRaceOverride,
  setRomName,
  setSa1Init,
} from "./sniSlice"
import {
  DevicesClient,
  DeviceControlClient,
  DeviceMemoryClient,
} from "@/sni/sni.client"
import { AddressSpace, MemoryMapping } from "@/sni/sni"

const getTransport = (state: any) => {
  return new GrpcWebFetchTransport({
    baseUrl: `http://${state.sni.grpcHost}:${state.sni.grpcPort}`,
  })
}

export const ingame_modes = [0x07, 0x09, 0x0b]
const save_quit_modes = [0x00, 0x01, 0x17, 0x1B]

type SRAMLocs = {
  [key: number]: [string, number]
}

const memMaps: { [x: string]: MemoryMapping } = {
  'lorom': MemoryMapping.LoROM,
  'sa1': MemoryMapping.SA1,
}

const sram_locs: SRAMLocs = {
  0xf50010: ["game_mode", 0x1],
  0xe02000: ["rom_name", 0x15],
  0xf5f000: ["base", 0x256],
  0xf5f280: ["overworld", 0x82],
  0xf5f340: ["inventory", 0x1bd],
  0xf5f3c6: ["misc", 0x4],
  0xf5f410: ["npcs", 0x2],
  0xf5f4d0: ["multiinfo", 0x4],
  0xf66018: ["pots", 0x250],
  0xf66268: ["sprites", 0x250],
  0xf664b8: ["shops", 0x29],
}

export const sniApiSlice = createApi({
  baseQuery: fakeBaseQuery(),
  reducerPath: "sniApi",
  endpoints: (builder) => ({
    getDevices: builder.query({
      async queryFn(
        arg: { noConnect: boolean },
        queryApi,
        extraOptions,
        baseQuery,
      ) {
        const transport = getTransport(queryApi.getState() as RootState)
        try {
          let devClient = new DevicesClient(transport)
          let devicesReponse = await devClient.listDevices({ kinds: [] })
          let devices = devicesReponse.response.devices.map(
            (device) => device.uri,
          )
          queryApi.dispatch(setGrpcConnected(true))
          queryApi.dispatch(setDeviceList(devices))
          if (devices.length > 0 && !arg.noConnect) {
            queryApi.dispatch(setConnectedDevice(devices[0]))
          }
          return { data: devices }
        } catch (e) {
          return { error: "Error getting devices." }
        }
      },
    }),
    reset: builder.mutation({
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        const state = queryApi.getState() as RootState
        const transport = getTransport(state)
        let controlClient = new DeviceControlClient(transport)
        let connectedDevice = state.sni.connectedDevice
        if (connectedDevice) {
          const res = await controlClient.resetSystem({ uri: connectedDevice })
          return { data: res }
        } else {
          return { error: "No device selected" }
        }
      },
    }),
    sendItem: builder.mutation({
      async queryFn(arg: {itemId: number}, queryApi, extraOptions, baseQuery) {
        let state = queryApi.getState() as RootState
        
        const transport = getTransport(state)
        let controlMem = new DeviceMemoryClient(transport)
        let connectedDevice = state.sni.connectedDevice
        if (!connectedDevice) {
          return { error: "No device or memory data" }
        }
        let game_mode = 0x00

        while (!ingame_modes.includes(game_mode)) {
          const game_mode_response = await controlMem.singleRead({
            uri: connectedDevice,
            request: {
              requestMemoryMapping: MemoryMapping.LoROM,
              requestAddress: parseInt("f50010", 16),
              requestAddressSpace: AddressSpace.FxPakPro,
              size: 1,
            },
          })
          if (!game_mode_response.response.response) {
            return { error: "Error reading memory, no reposonse" }
          }
          game_mode = game_mode_response.response.response.data[0]
          
          await new Promise(r => setTimeout(r, 250))
          state = queryApi.getState() as RootState
        }

        let writeResponse
        let last_item_id = 255
        let last_event_idx = 0

        // Wait for the player to finish receiving before sending the next item
        while (last_item_id != 0) {
          const readCurItem = await controlMem.singleRead({
            uri: connectedDevice,
            request: {
              requestMemoryMapping: MemoryMapping.LoROM,
              requestAddress: parseInt("f5f4d0", 16),
              requestAddressSpace: AddressSpace.FxPakPro,
              size: 3,
            },
          })
          if (!readCurItem.response.response) {
            return { error: "Error reading memory, no reposonse" }
          }
          last_item_id = readCurItem.response.response.data[2]
          last_event_idx =
              readCurItem.response.response.data[0] * 256 +
              readCurItem.response.response.data[1]
          if (last_item_id === 0) {
            if (last_event_idx === 0) {
              // This should never be 0, but the rom sometimes sets it to 0 when changing state
              // Wait for it to be a real value again
              continue 
            }
          }
          await new Promise(r => setTimeout(r, 250))
        }

        let new_event_idx = [(last_event_idx + 1) >> 8, (last_event_idx + 1) & 0xff]
      
        writeResponse = await controlMem.singleWrite({
          uri: connectedDevice,
          request: {
            requestMemoryMapping: MemoryMapping.LoROM,
            requestAddress: parseInt("f5f4d0", 16),
            requestAddressSpace: AddressSpace.FxPakPro,
            data: new Uint8Array([
              new_event_idx[0],
              new_event_idx[1],
              arg.itemId,
              1,
            ]),
          },
        })
        return { data: writeResponse?.response.response?.requestAddress }
      }
    }),
    readMemory: builder.query({
      async queryFn(
        arg: { memLoc: number; size: number },
        queryApi,
        extraOptions,
        baseQuery,
      ) {
        const state = queryApi.getState() as RootState
        const transport = getTransport(state)
        let controlMem = new DeviceMemoryClient(transport)
        let connectedDevice = state.sni.connectedDevice
        if (!connectedDevice) {
          return { error: "No device selected" }
        }

        // Detect memory mapping
        if (!state.sni.memoryMapping) {
          let memMapResponse = await controlMem.mappingDetect({
            uri: connectedDevice,
          })
          if (!memMapResponse.response) {
            return { error: "Error detecting memory mapping" }
          }
          var memMap = memMapResponse.response.memoryMapping
          switch (memMapResponse.response.memoryMapping) {
            case MemoryMapping.LoROM:
              queryApi.dispatch(setMemoryMapping("lorom"))
              break
            case MemoryMapping.SA1:
              queryApi.dispatch(setMemoryMapping("sa1"))
              break
            default:
              return { error: "Unsupported memory mapping" }
          }
        } else {
          var memMap = memMaps[state.sni.memoryMapping]
        }

        // Read rom name
        let romNameResponse = await controlMem.singleRead({
          uri: connectedDevice,
          request: { 
            requestMemoryMapping: memMap,
            requestAddress: 0x7FC0,
            requestAddressSpace: AddressSpace.FxPakPro,
            size: 0x15}
        })

        if (!romNameResponse.response.response) {
          return { error: "Error reading rom name" }
        }

        let romName = Array.from(romNameResponse.response.response.data).map(byte => String.fromCharCode(byte)).join("")

        if (romName !== state.sni.romName) {
          queryApi.dispatch(romChange(romName))
        }
        let memResponse

        let module
        let coords
        let world 

        return { data: module }
      },
    }),
  }),
})

export const {
  useGetDevicesQuery,
  useLazyGetDevicesQuery,
  useSendItemMutation,
  useResetMutation,
  useReadMemoryQuery,
} = sniApiSlice
