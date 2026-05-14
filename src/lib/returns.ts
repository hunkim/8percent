import YahooFinance from "yahoo-finance2";
import { ALL_TICKERS, type Ticker } from "./tickers";

const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey"]);

export type StockReturns = {
  symbol: string;
  name: string;
  market: "US" | "KR";
  price: number | null;
  currency: string | null;
  yearly: number | null;
  quarterly: number | null;
  monthly: number | null;
};

type CacheEntry = {
  fetchedAt: number;
  data: StockReturns[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cache: CacheEntry | null = null;
let inflight: Promise<StockReturns[]> | null = null;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function fetchOne(t: Ticker): Promise<StockReturns> {
  const to = new Date();
  const from = new Date(to.getTime() - 400 * MS_PER_DAY);

  try {
    const rows = await yahooFinance.chart(t.symbol, {
      period1: from,
      period2: to,
      interval: "1d",
    });

    const quotes = rows.quotes.filter(
      (q): q is typeof q & { close: number } => typeof q.close === "number" && q.close > 0
    );
    if (quotes.length === 0) {
      return {
        symbol: t.symbol,
        name: t.name,
        market: t.market,
        price: null,
        currency: rows.meta?.currency ?? null,
        yearly: null,
        quarterly: null,
        monthly: null,
      };
    }

    const last = quotes[quotes.length - 1];
    const lastTs = last.date.getTime();

    function findClosePriorTo(daysAgo: number): number | null {
      const target = lastTs - daysAgo * MS_PER_DAY;
      // Walk backwards to find the latest close on or before target.
      for (let i = quotes.length - 1; i >= 0; i--) {
        if (quotes[i].date.getTime() <= target) return quotes[i].close;
      }
      return null;
    }

    const y = findClosePriorTo(365);
    const q = findClosePriorTo(91);
    const m = findClosePriorTo(30);

    return {
      symbol: t.symbol,
      name: t.name,
      market: t.market,
      price: last.close,
      currency: rows.meta?.currency ?? null,
      yearly: y !== null ? (last.close / y - 1) * 100 : null,
      quarterly: q !== null ? (last.close / q - 1) * 100 : null,
      monthly: m !== null ? (last.close / m - 1) * 100 : null,
    };
  } catch {
    return {
      symbol: t.symbol,
      name: t.name,
      market: t.market,
      price: null,
      currency: null,
      yearly: null,
      quarterly: null,
      monthly: null,
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

async function fetchAll(): Promise<StockReturns[]> {
  return runWithConcurrency(ALL_TICKERS, 12, fetchOne);
}

export async function getAllReturns(): Promise<{
  data: StockReturns[];
  fetchedAt: number;
  cached: boolean;
}> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, fetchedAt: cache.fetchedAt, cached: true };
  }
  if (!inflight) {
    inflight = fetchAll()
      .then((data) => {
        cache = { fetchedAt: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const data = await inflight;
  return { data, fetchedAt: cache?.fetchedAt ?? now, cached: false };
}
