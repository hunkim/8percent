# 8percent

미국 Top 200 / 한국 Top 200 종목의 **1년 (8%) · 3개월 (3%) · 1개월 (1%)** 수익률
기준선 통과 여부를 한눈에 보여주는 대시보드.

- 기준 이상 → **매수** (emerald 강조)
- 기준 미만 → **매도** (회색 흐림)
- 종목명/티커 검색, 시장(미국/한국) 필터, 매수 신호만 보기 토글
- 모바일 / 데스크탑 반응형
- 데이터: [Yahoo Finance](https://finance.yahoo.com) — 무료 (API 키 불필요)
- 24시간 캐시

> ⚠️ 본 사이트는 투자 권유나 자문이 아닙니다. 모든 매매 결정과 그 결과에 대한
> 책임은 전적으로 본인에게 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속. 첫 로드는 1~2분 걸립니다
(384개 종목 fetch).

## Vercel 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hunkim/8percent)

1. 이 저장소를 Vercel에 import
2. 환경변수 없음 — 그대로 deploy
3. 첫 요청 시 18~30초 소요 (콜드 스타트 + Yahoo fetch), 이후 24시간 동안은
   Vercel data cache가 응답

### Vercel 설정 노트
- `maxDuration = 60` (Hobby tier 한도). Pro 이상은 더 늘려도 됩니다.
- `revalidate = 86400` — 24시간마다 자동 재검증
- 모든 ticker fetch는 동시성 12로 제한 (Yahoo rate limit 회피)

## 구조

```
src/
├── app/
│   ├── api/returns/route.ts   # JSON API, 24h cache
│   └── page.tsx               # 메인 UI
└── lib/
    ├── tickers.ts             # 미국 + 한국 종목 리스트
    └── returns.ts             # Yahoo Finance fetch + 수익률 계산
```

기준선 / 종목을 수정하려면:
- `src/lib/tickers.ts` — 종목 추가/제거
- `src/app/page.tsx`의 `PERIOD_META` — 기간별 임계값 수정

## 기술 스택

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- yahoo-finance2 (무료, API 키 불필요)

## 라이선스

MIT
