/**
 * useMarkets.ts — Fetch and subscribe to all prediction markets
 */

import { useReadContracts, useWatchContractEvent } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS } from "@/lib/wagmiConfig";
import { PREDICTION_MARKET_ABI } from "@/lib/contractAbi";
import { getImpliedProbabilities, probToOdds } from "@/lib/lmsr";

export interface Market {
  id: bigint;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchTimestamp: bigint;
  closingTime: bigint;
  resolved: boolean;
  cancelled: boolean;
  winner: number;
  shares: [bigint, bigint, bigint];
  totalVolume: bigint;
  feesCollected: bigint;
  externalMatchId: string;
  probHome: number;
  probAway: number;
  probDraw: number;
  oddsHome: number;
  oddsAway: number;
  oddsDraw: number;
  isOpen: boolean;
  minutesToClose: number;
}

const isContractConfigured = !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x";

export function useMarkets() {
  const queryClient = useQueryClient();
  const [marketIds, setMarketIds] = useState<bigint[]>([]);

  // Step 1: fetch all market IDs — skip if no contract address
  const { data: idsData, isLoading: idsLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getAllMarketIds",
      },
    ],
    query: { enabled: isContractConfigured },
  });

  useEffect(() => {
    const ids = idsData?.[0]?.result as bigint[] | undefined;
    if (ids) setMarketIds(ids);
  }, [idsData]);

  // Step 2: fetch each market in batch
  const { data: marketsData, isLoading: marketsLoading, refetch } = useReadContracts({
    contracts: marketIds.map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMarket" as const,
      args: [id] as const,
    })),
    query: { enabled: isContractConfigured && marketIds.length > 0 },
  });

  // Step 3: watch for new events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "BetPlaced",
    onLogs: () => {
      void refetch();
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
    enabled: isContractConfigured,
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "MarketCreated",
    onLogs: () => void refetch(),
    enabled: isContractConfigured,
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    eventName: "MarketResolved",
    onLogs: () => void refetch(),
    enabled: isContractConfigured,
  });

  // Step 4: enrich with derived data
  const markets: Market[] = (marketsData ?? [])
    .map((r) => r.result)
    .filter(Boolean)
    .map((raw) => {
      const m = raw as {
        id: bigint; homeTeam: string; awayTeam: string; league: string;
        matchTimestamp: bigint; closingTime: bigint; resolved: boolean;
        cancelled: boolean; winner: number; shares: [bigint, bigint, bigint];
        totalVolume: bigint; feesCollected: bigint; externalMatchId: string;
      };

      const [probHome, probAway, probDraw] = getImpliedProbabilities(m.shares);
      const now = BigInt(Math.floor(Date.now() / 1000));
      const isOpen = !m.resolved && !m.cancelled && now < m.closingTime;
      const secsToClose = Number(m.closingTime - now);
      const minutesToClose = Math.max(0, Math.floor(secsToClose / 60));

      return {
        ...m,
        probHome, probAway, probDraw,
        oddsHome: probToOdds(probHome),
        oddsAway: probToOdds(probAway),
        oddsDraw: probToOdds(probDraw),
        isOpen,
        minutesToClose,
      };
    });

  const invalidate = useCallback(() => void refetch(), [refetch]);

  return {
    markets,
    isLoading: isContractConfigured ? (idsLoading || marketsLoading) : false,
    refetch: invalidate,
  };
}

export function useMarket(marketId: bigint | undefined) {
  const { markets, isLoading, refetch } = useMarkets();
  const market = markets.find((m) => m.id === marketId);
  return { market, isLoading, refetch };
}
