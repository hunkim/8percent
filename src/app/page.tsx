"use client";

import { useEffect, useMemo, useState } from "react";

type StockReturns = {
  symbol: string;
  name: string;
  market: "US" | "KR";
  price: number | null;
  currency: string | null;
  yearly: number | null;
  quarterly: number | null;
  monthly: number | null;
};

type ApiResponse = {
  fetchedAt: number;
  cached: boolean;
  count: number;
  data: StockReturns[];
};

type IndexQuote = {
  symbol: string;
  label: string;
  region: "KR" | "US";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketTime: number | null;
};

type IndicesResponse = {
  fetchedAt: number;
  data: IndexQuote[];
};

type Period = "yearly" | "quarterly" | "monthly";
type MarketFilter = "ALL" | "US" | "KR";

const PERIOD_META: Record<
  Period,
  { label: string; short: string; threshold: number; thresholdLabel: string }
> = {
  yearly: { label: "1년 수익률", short: "1Y", threshold: 8, thresholdLabel: "8%" },
  quarterly: { label: "3개월 수익률", short: "3M", threshold: 3, thresholdLabel: "3%" },
  monthly: { label: "1개월 수익률", short: "1M", threshold: 1, thresholdLabel: "1%" },
};

function formatPct(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function formatPrice(v: number | null, currency: string | null): string {
  if (v === null) return "—";
  if (currency === "KRW") return `₩${Math.round(v).toLocaleString()}`;
  if (currency === "USD") return `$${v.toFixed(2)}`;
  return v.toFixed(2);
}

function formatFetchedAt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [indices, setIndices] = useState<IndexQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("yearly");
  const [market, setMarket] = useState<MarketFilter>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch("/api/returns")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: ApiResponse) => {
        if (!cancel) {
          setResp(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancel) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = () =>
      fetch("/api/indices")
        .then((r) => r.json())
        .then((json: IndicesResponse) => {
          if (!cancel) setIndices(json.data);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!resp) return [];
    const q = query.trim().toLowerCase();
    return resp.data
      .filter((s) => (market === "ALL" ? true : s.market === market))
      .filter((s) => {
        if (!q) return true;
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = a[period];
        const bv = b[period];
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });
  }, [resp, query, market, period]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Logo className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              8 percent
            </h1>
            <span className="text-xs text-zinc-500 sm:text-sm">
              연{" "}
              <b className="text-emerald-600 dark:text-emerald-400">8%</b> · 분기{" "}
              <b className="text-emerald-600 dark:text-emerald-400">3%</b> · 월{" "}
              <b className="text-emerald-600 dark:text-emerald-400">1%</b> 이상
            </span>
          </div>

          <IndicesStrip indices={indices} />
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(Object.keys(PERIOD_META) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  period === p
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {PERIOD_META[p].short} · {PERIOD_META[p].thresholdLabel}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(["ALL", "US", "KR"] as MarketFilter[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  market === m
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {m === "ALL" ? "전체" : m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 / 티커 검색"
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-emerald-900/40"
          />

        </div>

        <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <b>⚠️ 투자 유의사항:</b> 과거 수익률 기준선 통과 여부만 표시합니다. 투자
          권유 아님 · 매매 결정과 책임은 본인.
        </p>
        {resp && (
          <p className="mb-4 mt-1.5 text-[11px] text-zinc-500">
            수익률 데이터: {formatFetchedAt(resp.fetchedAt)} · 종목 {resp.count}개
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="mt-3 text-sm">
              주식 데이터를 가져오는 중입니다. 첫 로드는 1~2분 걸릴 수 있어요.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            오류: {error}
          </div>
        )}

        {!loading && !error && resp && (
          <ResultsTable rows={filtered} period={period} />
        )}

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
          데이터 출처: Yahoo Finance · 24시간마다 갱신 · 투자 판단은 본인 책임입니다.
        </footer>
      </div>
    </div>
  );
}

function ResultsTable({
  rows,
  period,
}: {
  rows: StockReturns[];
  period: Period;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        검색 결과가 없습니다.
      </div>
    );
  }

  // Layout columns: market | symbol | name | 1Y | 3M | 1M | price | signal
  const gridStyle = {
    display: "grid",
    gridTemplateColumns:
      "24px 80px minmax(0,1fr) 72px 72px 72px minmax(0,100px) 48px",
    columnGap: "12px",
    alignItems: "center",
  } as const;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div
        style={gridStyle}
        className="sticky top-0 z-10 hidden border-b border-zinc-200 bg-zinc-50/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500 backdrop-blur sm:grid dark:border-zinc-800 dark:bg-zinc-900/90"
      >
        <div />
        <div>티커</div>
        <div>종목</div>
        <div
          className={`text-right ${
            period === "yearly" ? "text-zinc-900 dark:text-zinc-100" : ""
          }`}
        >
          1Y · 8%
        </div>
        <div
          className={`text-right ${
            period === "quarterly" ? "text-zinc-900 dark:text-zinc-100" : ""
          }`}
        >
          3M · 3%
        </div>
        <div
          className={`text-right ${
            period === "monthly" ? "text-zinc-900 dark:text-zinc-100" : ""
          }`}
        >
          1M · 1%
        </div>
        <div className="text-right">가격</div>
        <div className="text-right">신호</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((s) => (
          <StockRow key={s.symbol} stock={s} period={period} gridStyle={gridStyle} />
        ))}
      </div>
    </div>
  );
}

function StockRow({
  stock,
  period,
  gridStyle,
}: {
  stock: StockReturns;
  period: Period;
  gridStyle: React.CSSProperties;
}) {
  const meta = PERIOD_META[period];
  const value = stock[period];
  const isBuy = value !== null && value >= meta.threshold;
  const ticker = stock.symbol.replace(/\.(KS|KQ)$/, "");
  const flag = stock.market === "US" ? "🇺🇸" : "🇰🇷";

  return (
    <div
      className={`px-3 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        !isBuy ? "opacity-55" : ""
      }`}
    >
      {/* Mobile layout */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{flag}</span>
              <span className="truncate text-sm font-medium">{stock.name}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
              {ticker} · {formatPrice(stock.price, stock.currency)}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span
              className={`text-base font-semibold tabular-nums ${
                isBuy
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {formatPct(value)}
            </span>
            <span
              className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isBuy
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
              }`}
            >
              {isBuy ? "매수" : "매도"} · {PERIOD_META[period].short}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex gap-3 text-[11px] tabular-nums">
          <MobilePct label="1Y" value={stock.yearly} threshold={8} active={period === "yearly"} />
          <MobilePct label="3M" value={stock.quarterly} threshold={3} active={period === "quarterly"} />
          <MobilePct label="1M" value={stock.monthly} threshold={1} active={period === "monthly"} />
        </div>
      </div>

      {/* Desktop layout */}
      <div style={gridStyle} className="hidden sm:grid text-sm">
        <span className="text-sm">{flag}</span>
        <span className="truncate font-mono text-xs text-zinc-500">{ticker}</span>
        <span className="truncate font-medium">{stock.name}</span>
        <PctCell value={stock.yearly} threshold={8} active={period === "yearly"} />
        <PctCell value={stock.quarterly} threshold={3} active={period === "quarterly"} />
        <PctCell value={stock.monthly} threshold={1} active={period === "monthly"} />
        <span className="text-right tabular-nums text-xs text-zinc-500">
          {formatPrice(stock.price, stock.currency)}
        </span>
        <span className="text-right">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              isBuy
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
            }`}
          >
            {isBuy ? "매수" : "매도"}
          </span>
        </span>
      </div>
    </div>
  );
}

function MobilePct({
  label,
  value,
  threshold,
  active,
}: {
  label: string;
  value: number | null;
  threshold: number;
  active: boolean;
}) {
  const ok = value !== null && value >= threshold;
  return (
    <span className={active ? "font-semibold" : ""}>
      <span className="text-zinc-400">{label} </span>
      <span
        className={
          ok
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-400 dark:text-zinc-600"
        }
      >
        {formatPct(value)}
      </span>
    </span>
  );
}

function IndicesStrip({ indices }: { indices: IndexQuote[] | null }) {
  return (
    <div className="mt-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {(indices ?? Array.from({ length: 5 }, () => null)).map((idx, i) => (
            <IndexPill key={idx?.symbol ?? i} idx={idx} />
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500">
        주요 지수 · 약 15분 지연
      </p>
    </div>
  );
}

function IndexPill({ idx }: { idx: IndexQuote | null }) {
  if (!idx) {
    return (
      <div className="flex h-[44px] w-32 shrink-0 animate-pulse rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    );
  }
  const up = (idx.changePercent ?? 0) > 0;
  const down = (idx.changePercent ?? 0) < 0;
  const colorClass = up
    ? "text-emerald-600 dark:text-emerald-400"
    : down
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500";
  const arrow = up ? "▲" : down ? "▼" : "·";
  const price =
    idx.price !== null
      ? idx.price.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "—";
  const pct =
    idx.changePercent !== null
      ? `${up ? "+" : ""}${idx.changePercent.toFixed(2)}%`
      : "—";
  return (
    <div className="flex shrink-0 flex-col rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span>{idx.region === "KR" ? "🇰🇷" : "🇺🇸"}</span>
        <span className="font-medium">{idx.label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{price}</span>
        <span className={`text-xs tabular-nums ${colorClass}`}>
          {arrow} {pct}
        </span>
      </div>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="8 percent logo"
    >
      <rect width="64" height="64" rx="14" fill="#059669" />
      <path
        d="M16 44 L26 34 L34 40 L48 24"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.35"
      />
      <path
        d="M40 24 L48 24 L48 32"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.35"
      />
      <text
        x="32"
        y="43"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="26"
        fontWeight="800"
        fill="#ffffff"
        textAnchor="middle"
        letterSpacing="-1"
      >
        8%
      </text>
    </svg>
  );
}

function PctCell({
  value,
  threshold,
  active,
}: {
  value: number | null;
  threshold: number;
  active: boolean;
}) {
  const ok = value !== null && value >= threshold;
  return (
    <span
      className={`text-right tabular-nums ${active ? "font-semibold" : ""} ${
        ok
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-zinc-400 dark:text-zinc-600"
      }`}
    >
      {formatPct(value)}
    </span>
  );
}
