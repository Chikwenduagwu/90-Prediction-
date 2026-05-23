/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_USDC_ADDRESS: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_FOOTBALL_DATA_API_KEY: string;
  readonly VITE_X402_FACILITATOR_URL: string;
  readonly VITE_OKX_DEX_REFERRAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
