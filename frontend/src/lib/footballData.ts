/**
 * footballData.ts — Football-Data.org free-tier API client
 * Docs: https://www.football-data.org/documentation/quickstart
 *
 * Free tier: 10 req/min, competitions: PL, BL1, PD, SA, FL1, CL, EC, WC
 */

const BASE_URL = "https://api.football-data.org/v4";
const API_KEY = import.meta.env.VITE_FOOTBALL_DATA_API_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FDScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: { home: number | null; away: number | null };
  halfTime:  { home: number | null; away: number | null };
}

export interface FDMatch {
  id: number;
  utcDate: string;           // ISO 8601
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED";
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: FDScore;
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  odds?: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

export interface FDMatchesResponse {
  count: number;
  filters: Record<string, string>;
  matches: FDMatch[];
}

// ─── Competitions supported on free tier ─────────────────────────────────────

export const COMPETITIONS = {
  PL:  { code: "PL",  name: "Premier League",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  BL1: { code: "BL1", name: "Bundesliga",        flag: "🇩🇪" },
  PD:  { code: "PD",  name: "La Liga",           flag: "🇪🇸" },
  SA:  { code: "SA",  name: "Serie A",           flag: "🇮🇹" },
  FL1: { code: "FL1", name: "Ligue 1",           flag: "🇫🇷" },
  CL:  { code: "CL",  name: "Champions League",  flag: "🏆" },
} as const;

// ─── Simple in-memory cache (respects 10 req/min rate limit) ─────────────────

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

async function fetchFD<T>(endpoint: string): Promise<T> {
  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached.data as T;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "X-Auth-Token": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Football API rate limit exceeded. Please wait a moment.");
    if (res.status === 403) throw new Error("Football API key invalid or missing.");
    throw new Error(`Football API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  cache.set(endpoint, { data, ts: now });
  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch upcoming matches across all supported competitions
 * (next 7 days — avoids hitting past-match endpoints)
 */
export async function fetchUpcomingMatches(): Promise<FDMatch[]> {
  const dateFrom = new Date();
  const dateTo   = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Fetch from multiple competitions in parallel
  const competitionCodes = Object.keys(COMPETITIONS) as (keyof typeof COMPETITIONS)[];
  const results = await Promise.allSettled(
    competitionCodes.map((code) =>
      fetchFD<FDMatchesResponse>(
        `/competitions/${code}/matches?status=SCHEDULED&dateFrom=${fmt(dateFrom)}&dateTo=${fmt(dateTo)}`
      )
    )
  );

  const matches: FDMatch[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      matches.push(...r.value.matches);
    }
  }

  // Sort by kickoff time
  return matches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

/**
 * Fetch a single match by ID
 */
export async function fetchMatch(matchId: string | number): Promise<FDMatch> {
  const res = await fetchFD<{ match: FDMatch }>(`/matches/${matchId}`);
  return res.match;
}

/**
 * Fetch live / in-play matches
 */
export async function fetchLiveMatches(): Promise<FDMatch[]> {
  const res = await fetchFD<FDMatchesResponse>("/matches?status=IN_PLAY,PAUSED");
  return res.matches;
}

/**
 * Map Football-Data outcome to contract Outcome enum
 * Home=1, Away=2, Draw=3
 */
export function mapOutcome(winner: FDScore["winner"]): 1 | 2 | 3 | null {
  if (winner === "HOME_TEAM") return 1;
  if (winner === "AWAY_TEAM") return 2;
  if (winner === "DRAW")      return 3;
  return null;
}

/**
 * Return competition metadata by match competition code
 */
export function getCompetitionMeta(code: string) {
  return COMPETITIONS[code as keyof typeof COMPETITIONS] ?? {
    code,
    name: code,
    flag: "⚽",
  };
}

/**
 * Format FDMatch into a shareable display string for social sharing
 */
export function matchToShareText(match: FDMatch, yourBet: "Home" | "Away" | "Draw", odds: number): string {
  return `⚽ I just bet on ${match.homeTeam.shortName} vs ${match.awayTeam.shortName} — going ${yourBet} at ${odds}x odds!\n\nTrade predictions on GoalMarket 🎯\n#GoalMarket #${match.competition.code} #PredictionMarket`;
}
