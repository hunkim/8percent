import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
yahooFinance._notices.suppress(["yahooSurvey"]);

export type IndexQuote = {
  symbol: string;
  label: string;
  region: "KR" | "US";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketTime: number | null;
};

const INDICES: { symbol: string; label: string; region: "KR" | "US" }[] = [
  { symbol: "^KS11", label: "KOSPI", region: "KR" },
  { symbol: "^KQ11", label: "KOSDAQ", region: "KR" },
  { symbol: "^GSPC", label: "S&P 500", region: "US" },
  { symbol: "^IXIC", label: "Nasdaq", region: "US" },
  { symbol: "^DJI", label: "Dow", region: "US" },
];

export async function getIndices(): Promise<IndexQuote[]> {
  const symbols = INDICES.map((i) => i.symbol);
  try {
    const quotes = await yahooFinance.quote(symbols);
    const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));
    return INDICES.map((meta) => {
      const q = bySymbol.get(meta.symbol);
      return {
        symbol: meta.symbol,
        label: meta.label,
        region: meta.region,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePercent: q?.regularMarketChangePercent ?? null,
        marketTime:
          q?.regularMarketTime instanceof Date
            ? q.regularMarketTime.getTime()
            : null,
      };
    });
  } catch {
    return INDICES.map((meta) => ({
      symbol: meta.symbol,
      label: meta.label,
      region: meta.region,
      price: null,
      change: null,
      changePercent: null,
      marketTime: null,
    }));
  }
}
