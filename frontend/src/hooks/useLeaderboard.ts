/**
 * useLeaderboard.ts — Build leaderboard from on-chain BetPlaced + WinningsClaimed events
 */

import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { activeChain, CONTRACT_ADDRESS } from "@/lib/wagmiConfig";

export interface LeaderboardEntry {
  rank: number;
  address: `0x${string}`;
  displayAddress: string;   // truncated: 0x1234...abcd
  totalVolume: bigint;      // total USDC wagered
  totalWins: number;
  totalBets: number;
  winRate: number;          // 0-100
  totalPnl: bigint;         // claimed - wagered (approx)
}

// ─── Event ABIs for getLogs ───────────────────────────────────────────────────

const BET_PLACED_EVENT = parseAbiItem(
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, uint8 outcome, uint256 cost, uint256 shares, uint256 newOddsHome, uint256 newOddsAway, uint256 newOddsDraw)"
);

const WINNINGS_CLAIMED_EVENT = parseAbiItem(
  "event WinningsClaimed(uint256 indexed marketId, address indexed claimant, uint256 amount)"
);

function truncate(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const client = createPublicClient({
          chain: activeChain,
          transport: http(),
        });

        // Fetch last ~10000 blocks (approx last 24h on X Layer ~2s blocks)
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > 10_000n ? latestBlock - 10_000n : 0n;

        const [betLogs, claimLogs] = await Promise.all([
          client.getLogs({
            address: CONTRACT_ADDRESS,
            event: BET_PLACED_EVENT,
            fromBlock,
            toBlock: "latest",
          }),
          client.getLogs({
            address: CONTRACT_ADDRESS,
            event: WINNINGS_CLAIMED_EVENT,
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        // Aggregate by address
        const stats = new Map<
          `0x${string}`,
          { volume: bigint; bets: number; claimed: bigint }
        >();

        for (const log of betLogs) {
          const bettor = log.args.bettor as `0x${string}`;
          const cost   = log.args.cost as bigint;
          const cur = stats.get(bettor) ?? { volume: 0n, bets: 0, claimed: 0n };
          stats.set(bettor, { ...cur, volume: cur.volume + cost, bets: cur.bets + 1 });
        }

        // Map market resolution to winners — simplified: track claim addresses
        const winnerSet = new Set<`0x${string}`>();
        const claimedByAddr = new Map<`0x${string}`, bigint>();
        for (const log of claimLogs) {
          const claimant = log.args.claimant as `0x${string}`;
          const amount   = log.args.amount as bigint;
          winnerSet.add(claimant);
          claimedByAddr.set(claimant, (claimedByAddr.get(claimant) ?? 0n) + amount);
        }

        // Build leaderboard entries
        const raw: Omit<LeaderboardEntry, "rank">[] = [];
        for (const [addr, s] of stats.entries()) {
          const claimed = claimedByAddr.get(addr) ?? 0n;
          const totalWins = winnerSet.has(addr) ? 1 : 0; // simplified — count unique claims
          raw.push({
            address: addr,
            displayAddress: truncate(addr),
            totalVolume: s.volume,
            totalBets: s.bets,
            totalWins,
            winRate: s.bets > 0 ? Math.round((totalWins / s.bets) * 100) : 0,
            totalPnl: claimed - s.volume,
          });
        }

        // Sort by volume descending, take top 10
        const sorted = raw
          .sort((a, b) => (b.totalVolume > a.totalVolume ? 1 : -1))
          .slice(0, 10)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        if (!cancelled) {
          setEntries(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    // Refresh every 30 seconds
    const interval = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { entries, isLoading, error };
}
