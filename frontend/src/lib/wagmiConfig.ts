import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { privy } from "@privy-io/wagmi";

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "XLayer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://testrpc.xlayer.tech"] } },
  blockExplorers: { default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" } },
});

export const xLayerMainnet = defineChain({
  id: 196,
  name: "XLayer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
  blockExplorers: { default: { name: "OKLink", url: "https://www.oklink.com/xlayer" } },
});

export const activeChain = xLayerTestnet;

export const wagmiConfig = createConfig({
  chains: [xLayerTestnet, xLayerMainnet],
  connectors: [privy()],
  transports: {
    [xLayerTestnet.id]: http("https://testrpc.xlayer.tech"),
    [xLayerMainnet.id]: http("https://rpc.xlayer.tech"),
  },
});

export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS ?? ""
) as `0x${string}`;

export const USDC_ADDRESS = (
  import.meta.env.VITE_USDC_ADDRESS ?? ""
) as `0x${string}`;

export const EXPLORER_URL = activeChain.blockExplorers.default.url;
