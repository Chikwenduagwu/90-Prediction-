/**
 * x402.ts — x402 HTTP Payment Protocol integration
 *
 * x402 allows users to pay for actions via USDC without holding OKB for gas.
 * Flow:
 *   1. Client sends request → server returns 402 Payment Required + payment details
 *   2. Client constructs EIP-712 signed payment payload
 *   3. Client resends request with X-Payment header
 *   4. Facilitator verifies + settles on-chain
 *
 * Docs: https://x402.org
 */

import { type WalletClient, parseUnits } from "viem";
import { USDC_ADDRESS, activeChain } from "./wagmiConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface X402PaymentDetails {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;        // USDC amount in 6-decimal string
  resource: string;                 // URL being accessed
  description: string;
  mimeType: string;
  payTo: `0x${string}`;            // Facilitator address
  maxTimeoutSeconds: number;
  asset: `0x${string}`;            // USDC contract address
  extra?: {
    name: string;
    version: string;
  };
}

export interface X402PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: {
    signature: `0x${string}`;
    authorization: {
      from: `0x${string}`;
      to:   `0x${string}`;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: `0x${string}`;
    };
  };
}

// ─── EIP-3009 TransferWithAuthorization domain ───────────────────────────────

function buildDomain(chainId: number, usdcAddress: `0x${string}`) {
  return {
    name: "USD Coin",
    version: "2",
    chainId,
    verifyingContract: usdcAddress,
  } as const;
}

const TRANSFER_WITH_AUTHORIZATION_TYPE = {
  TransferWithAuthorization: [
    { name: "from",         type: "address" },
    { name: "to",           type: "address" },
    { name: "value",        type: "uint256" },
    { name: "validAfter",   type: "uint256" },
    { name: "validBefore",  type: "uint256" },
    { name: "nonce",        type: "bytes32" },
  ],
} as const;

// ─── Core x402 utilities ──────────────────────────────────────────────────────

/**
 * Generate a random nonce for EIP-3009
 */
function randomNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Parse a 402 response to extract payment requirements
 */
export async function parse402Response(response: Response): Promise<X402PaymentDetails | null> {
  if (response.status !== 402) return null;
  try {
    const data = await response.clone().json();
    return data as X402PaymentDetails;
  } catch {
    return null;
  }
}

/**
 * Create a signed x402 payment payload using EIP-3009 TransferWithAuthorization
 *
 * @param walletClient  Connected Viem wallet client
 * @param from          User's address
 * @param details       Payment details from the 402 response
 */
export async function createX402Payment(
  walletClient: WalletClient,
  from: `0x${string}`,
  details: X402PaymentDetails
): Promise<X402PaymentPayload> {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const validAfter  = now - 60n;            // 1 min grace before
  const validBefore = now + BigInt(details.maxTimeoutSeconds);
  const nonce = randomNonce();
  const value = parseUnits(details.maxAmountRequired, 6);

  const authorization = {
    from,
    to:          details.payTo,
    value,
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await walletClient.signTypedData({
    account: from,
    domain: buildDomain(activeChain.id, USDC_ADDRESS),
    types: TRANSFER_WITH_AUTHORIZATION_TYPE,
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });

  return {
    x402Version: 1,
    scheme: "exact",
    network: `eip155:${activeChain.id}`,
    payload: {
      signature,
      authorization: {
        from,
        to:          details.payTo,
        value:       value.toString(),
        validAfter:  validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

/**
 * Encode the payment payload as base64 for the X-Payment header
 */
export function encodePaymentHeader(payload: X402PaymentPayload): string {
  return btoa(JSON.stringify(payload));
}

/**
 * x402-enabled fetch: automatically handles 402 responses
 * Retries the request with payment header on 402
 *
 * @param url           Request URL
 * @param options       Standard fetch options
 * @param walletClient  Wallet for signing
 * @param from          User address
 * @param onPaymentRequired  Optional callback with payment details (for UI confirmation)
 */
export async function x402Fetch(
  url: string,
  options: RequestInit,
  walletClient: WalletClient,
  from: `0x${string}`,
  onPaymentRequired?: (details: X402PaymentDetails) => Promise<boolean>
): Promise<Response> {
  // First attempt: no payment
  const firstResponse = await fetch(url, options);

  if (firstResponse.status !== 402) {
    return firstResponse;
  }

  // Parse payment requirements
  const details = await parse402Response(firstResponse);
  if (!details) {
    throw new Error("x402: Invalid payment details in 402 response");
  }

  // Confirm with user if callback provided
  if (onPaymentRequired) {
    const confirmed = await onPaymentRequired(details);
    if (!confirmed) throw new Error("x402: Payment rejected by user");
  }

  // Create and sign payment
  const payment = await createX402Payment(walletClient, from, details);
  const paymentHeader = encodePaymentHeader(payment);

  // Retry with payment
  const paidResponse = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "X-Payment": paymentHeader,
      "X-Payment-Version": "1",
    },
  });

  return paidResponse;
}

/**
 * Calculate the USDC "gas" fee for an x402 bet action
 * This covers facilitator costs so user pays zero OKB
 */
export function estimateX402Fee(betAmount: bigint): bigint {
  // Typical facilitator fee: ~0.1% of transaction
  return (betAmount * 10n) / 10_000n;
}

/**
 * Build OKX DEX Aggregator URL for position trading
 * Allows selling prediction shares on secondary market
 */
export function buildOKXDexUrl(params: {
  fromToken: string;
  toToken:   string;
  amount:    string;
  slippage?: number;
}): string {
  const base = "https://www.okx.com/web3/dex-swap";
  const query = new URLSearchParams({
    inputCurrency:  params.fromToken,
    outputCurrency: params.toToken,
    inputAmount:    params.amount,
    slippage:       String(params.slippage ?? 1),
    chainId:        String(activeChain.id),
    referralCode:   import.meta.env.VITE_OKX_DEX_REFERRAL ?? "",
  });
  return `${base}?${query.toString()}`;
}
