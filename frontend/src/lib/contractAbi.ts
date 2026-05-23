/**
 * contractAbi.ts — PredictionMarket + MockUSDC ABIs
 * Auto-generated from compiled artifacts; keep in sync with contracts/
 */

export const PREDICTION_MARKET_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getMarket",
    outputs: [
      {
        components: [
          { internalType: "uint256",  name: "id",              type: "uint256"  },
          { internalType: "string",   name: "homeTeam",        type: "string"   },
          { internalType: "string",   name: "awayTeam",        type: "string"   },
          { internalType: "string",   name: "league",          type: "string"   },
          { internalType: "uint256",  name: "matchTimestamp",  type: "uint256"  },
          { internalType: "uint256",  name: "closingTime",     type: "uint256"  },
          { internalType: "bool",     name: "resolved",        type: "bool"     },
          { internalType: "bool",     name: "cancelled",       type: "bool"     },
          { internalType: "uint8",    name: "winner",          type: "uint8"    },
          { internalType: "int256[3]",name: "shares",         type: "int256[3]"},
          { internalType: "uint256",  name: "totalVolume",     type: "uint256"  },
          { internalType: "uint256",  name: "feesCollected",   type: "uint256"  },
          { internalType: "string",   name: "externalMatchId", type: "string"   },
        ],
        internalType: "struct PredictionMarket.Market",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllMarketIds",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarketCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user",     type: "address" },
    ],
    name: "getPosition",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "sharesHome", type: "uint256" },
          { internalType: "uint256", name: "sharesAway", type: "uint256" },
          { internalType: "uint256", name: "sharesDraw", type: "uint256" },
          { internalType: "bool",    name: "claimed",    type: "bool"    },
        ],
        internalType: "struct PredictionMarket.Position",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getOdds",
    outputs: [
      { internalType: "uint256", name: "probHome", type: "uint256" },
      { internalType: "uint256", name: "probAway", type: "uint256" },
      { internalType: "uint256", name: "probDraw", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "uint8",   name: "outcome",  type: "uint8"   },
      { internalType: "uint256", name: "shares",   type: "uint256" },
    ],
    name: "previewBet",
    outputs: [
      { internalType: "uint256", name: "cost",  type: "uint256" },
      { internalType: "uint256", name: "fee",   type: "uint256" },
      { internalType: "uint256", name: "total", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipient",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // ── Write ─────────────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "uint8",   name: "outcome",  type: "uint8"   },
      { internalType: "uint256", name: "shares",   type: "uint256" },
      { internalType: "uint256", name: "maxCost",  type: "uint256" },
    ],
    name: "bet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId",    type: "uint256" },
      { internalType: "uint8",   name: "outcome",     type: "uint8"   },
      { internalType: "uint256", name: "shares",      type: "uint256" },
      { internalType: "uint256", name: "minProceeds", type: "uint256" },
    ],
    name: "sellShares",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Events ────────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256",  name: "marketId",    type: "uint256"  },
      { indexed: false, internalType: "string",   name: "homeTeam",    type: "string"   },
      { indexed: false, internalType: "string",   name: "awayTeam",    type: "string"   },
      { indexed: false, internalType: "string",   name: "league",      type: "string"   },
      { indexed: false, internalType: "uint256",  name: "matchTimestamp", type: "uint256"},
      { indexed: false, internalType: "string",   name: "externalMatchId", type: "string"},
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256",  name: "marketId", type: "uint256" },
      { indexed: true,  internalType: "address",  name: "bettor",   type: "address" },
      { indexed: false, internalType: "uint8",    name: "outcome",  type: "uint8"   },
      { indexed: false, internalType: "uint256",  name: "cost",     type: "uint256" },
      { indexed: false, internalType: "uint256",  name: "shares",   type: "uint256" },
      { indexed: false, internalType: "uint256",  name: "newOddsHome", type: "uint256"},
      { indexed: false, internalType: "uint256",  name: "newOddsAway", type: "uint256"},
      { indexed: false, internalType: "uint256",  name: "newOddsDraw", type: "uint256"},
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256",  name: "marketId", type: "uint256" },
      { indexed: true,  internalType: "address",  name: "seller",   type: "address" },
      { indexed: false, internalType: "uint8",    name: "outcome",  type: "uint8"   },
      { indexed: false, internalType: "uint256",  name: "sharesSold", type: "uint256"},
      { indexed: false, internalType: "uint256",  name: "proceeds", type: "uint256" },
      { indexed: false, internalType: "uint256",  name: "newOddsHome", type: "uint256"},
      { indexed: false, internalType: "uint256",  name: "newOddsAway", type: "uint256"},
      { indexed: false, internalType: "uint256",  name: "newOddsDraw", type: "uint256"},
    ],
    name: "SharesSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "marketId",    type: "uint256" },
      { indexed: false, internalType: "uint8",   name: "winner",      type: "uint8"   },
      { indexed: false, internalType: "uint256", name: "totalVolume", type: "uint256" },
    ],
    name: "MarketResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true,  internalType: "address", name: "claimant", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",   type: "uint256" },
    ],
    name: "WinningsClaimed",
    type: "event",
  },
] as const;

export const USDC_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount",  type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner",   type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
