/**
 * Product roadmap content.
 *
 * Kept as a small typed data structure so items and statuses can be updated
 * in one place as TradeVault develops. No dates or delivery commitments.
 */
export const ROADMAP_STATUSES = [
  "Planned",
  "In Development",
  "Coming Soon",
  "Released",
] as const;

export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  /** Optional, non-committal details shown as simple bullets on the page. */
  capabilities?: string[];
}

export const roadmapItems: RoadmapItem[] = [
  {
    id: "price-alerts",
    title: "Price Alerts",
    status: "Planned",
    description:
      "Set custom price conditions for Forex pairs, cryptocurrencies, stocks, indices and commodities. Receive notifications when an asset reaches a specified price.",
  },
  {
    id: "live-market-prices",
    title: "Live Market Prices",
    status: "Planned",
    description:
      "Monitor live market prices across supported financial markets.",
  },
  {
    id: "mobile-application",
    title: "Mobile Application",
    status: "Planned",
    description:
      "Access TradeVault's trading journal, account overview and analytics from a dedicated mobile application.",
  },
  {
    id: "advanced-notifications",
    title: "Advanced Notifications",
    status: "Planned",
    description:
      "Receive useful notifications about trading activity, account events and market-related updates.",
  },
  {
    id: "strategy-backtesting",
    title: "Strategy Backtesting",
    status: "Planned",
    description:
      "Test trading strategies against historical market data without risking real capital. Configure entry and exit conditions, simulate trades, and analyse performance through metrics such as win rate, profit factor, drawdown and risk/reward.",
    capabilities: [
      "Historical chart replay.",
      "Custom entry and exit conditions.",
      "Stop-loss and take-profit configuration.",
      "Simulated historical trades.",
      "Performance analytics.",
      "Strategy comparison.",
    ],
  },
];
