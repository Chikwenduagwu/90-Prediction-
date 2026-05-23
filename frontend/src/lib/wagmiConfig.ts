import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// ─── X Layer Chain Definitions ────────────────────────────────────────────────

export const xLayerTestnet = defineChain({
  id: 195,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
    public:  { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

export const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
    public:  { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer",
    },
  },
  testnet: false,
});

// ─── Determine active chain from env ─────────────────────────────────────────

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? 195);
export const activeChain = chainId === 196 ? xLayerMainnet : xLayerTestnet;

// ─── Wagmi Config ─────────────────────────────────────────────────────────────

export const wagmiConfig = createConfig({
  chains: [xLayerTestnet, xLayerMainnet],
  connectors: [injected()],
  transports: {
    [xLayerTestnet.id]: http("https://testrpc.xlayer.tech"),
    [xLayerMainnet.id]: http("https://rpc.xlayer.tech"),
  },
});

// ─── Contract Addresses ───────────────────────────────────────────────────────

export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS ?? ""
) as `0x${string}`;

export const USDC_ADDRESS = (
  import.meta.env.VITE_USDC_ADDRESS ?? ""
) as `0x${string}`;

export const EXPLORER_URL = activeChain.blockExplorers.default.url;
