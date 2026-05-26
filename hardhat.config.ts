import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    // ── X Layer Mainnet ──────────────────────────────────────────────────
    xlayer: {
      url: "https://xlayertestrpc.okx.com",
      chainId: 196,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },

    // ── X Layer Testnet ──────────────────────────────────────────────────
    xlayer_testnet: {
      url: "https://xlayertestrpc.okx.com",
      chainId: 195,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },

    // ── Local development ────────────────────────────────────────────────
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
  },

  etherscan: {
    apiKey: {
      xlayer: process.env.XLAYER_EXPLORER_API_KEY || "",
      xlayer_testnet: process.env.XLAYER_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/api",
          browserURL: "https://www.oklink.com/xlayer",
        },
      },
      {
        network: "xlayer_testnet",
        chainId: 195,
        urls: {
          apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/api",
          browserURL: "https://www.oklink.com/xlayer-test",
        },
      },
    ],
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 60_000,
  },
};

export default config;
