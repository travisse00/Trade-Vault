import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  ChartCandlestick,
  NotebookPen,
  Pencil,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import { getQuoteCurrency } from "@/lib/calculations/pair";
import { getTradeById } from "@/lib/service/trade.service";
import { getTradeImageSignedUrls } from "@/lib/service/trade-image.service";
import {
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/format";
import TradeImageGallery from "../../components/TradeImageGallery";
import CloseTradeForm from "../../components/CloseTradeForm";

const marketLabels: Record<string, string> = {
  FOREX: "Forex",
  CRYPTO_SPOT: "Crypto Spot",
  CRYPTO_FUTURES: "Crypto Futures",
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const amount = typeof value === "number" ? value : Number(value);

  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(value: unknown, currency: string): string {
  const amount = toNumber(value);

  return amount === null ? "--" : formatCurrency(amount, currency);
}

function formatSignedMoney(value: unknown, currency: string): string {
  const amount = toNumber(value);

  return amount === null ? "--" : formatSignedCurrency(amount, currency);
}

function formatPrice(value: unknown): string {
  const amount = toNumber(value);

  if (amount === null) return "--";

  return amount.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/** Asset prices stay in their quote currency; they are never converted here. */
function formatQuotePrice(value: unknown, quoteCurrency: string): string {
  const formatted = formatPrice(value);

  return formatted === "--" ? formatted : `${formatted} ${quoteCurrency}`;
}

function formatNumber(value: unknown, digits = 2): string {
  const amount = toNumber(value);

  if (amount === null) return "--";

  return amount.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatPercent(value: unknown): string {
  const amount = toNumber(value);

  if (amount === null) return "--";

  return `${amount >= 0 ? "+" : ""}${amount.toFixed(2)}%`;
}

function formatDate(value: unknown, timezone?: string): string {
  if (!value) return "--";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "--";

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  try {
    if (timezone) {
      options.timeZone = timezone;
    }

    return new Intl.DateTimeFormat("en-GB", options).format(date);
  } catch {
    delete options.timeZone;

    return new Intl.DateTimeFormat("en-GB", options).format(date);
  }
}

function pnlTone(value: unknown): string {
  const amount = toNumber(value);

  if (amount === null) return "text-[#77797C]";

  return amount >= 0 ? "text-[#79B89A]" : "text-[#D17A7A]";
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="text-[#A7A9AC]">{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function DetailItem({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#77797C]">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-medium tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function TradeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    notFound();
  }

  const result = await getTradeById(id);

  if (!result) {
    notFound();
  }

  const { trade, currency, timezone } = result;

  const signedUrls = await getTradeImageSignedUrls(
    trade.images.map((image) => image.storagePath)
  );

  const images = trade.images
    .map((image) => signedUrls[image.storagePath])
    .filter((url): url is string => Boolean(url));

  const isForex = trade.marketType === "FOREX";
  const isOpen = trade.status === "OPEN";
  const isLong = trade.direction === "LONG";
  const quoteCurrency = getQuoteCurrency(trade.asset);

  const positionSize = isForex
    ? trade.lotSize !== null
      ? `${formatNumber(trade.lotSize, 4)} lots`
      : "--"
    : `${formatNumber(trade.quantity, 8)} units`;

  const positionValue =
    trade.positionValue !== null
      ? formatMoney(trade.positionValue, currency)
      : null;

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/trades"
            className="mb-4 inline-flex items-center gap-2 text-sm text-[#92969A] transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to My Trades
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {trade.asset}
            </h1>

            <span className="rounded-md border border-[#303236] bg-[#202225] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A7A9AC]">
              {marketLabels[trade.marketType] ?? trade.marketType}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                isLong
                  ? "border-[#315341] bg-[#1B2921] text-[#79B89A]"
                  : "border-[#4A3131] bg-[#291B1B] text-[#D17A7A]"
              }`}
            >
              {isLong ? (
                <ArrowUpRight size={13} />
              ) : (
                <ArrowDownRight size={13} />
              )}
              {isLong ? "Long" : "Short"}
            </span>

            <span
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                isOpen
                  ? "border-[#414448] bg-[#202225] text-[#A7A9AC]"
                  : "border-[#315341] bg-[#1B2921] text-[#79B89A]"
              }`}
            >
              {trade.status}
            </span>
          </div>
        </div>

        {/* Net P&L highlight */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-64">
          <div className="rounded-xl border border-[#292B2E] bg-[#17191B] p-5">
            <p className="text-xs text-[#77797C]">Net P&L</p>

            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${pnlTone(
                trade.netPnL
              )}`}
            >
              {formatSignedMoney(trade.netPnL, currency)}
            </p>

            <p className="mt-1 text-[10px] text-[#686A6D]">
              {isOpen
                ? "Awaiting close"
                : `Return ${formatPercent(trade.returnPercentage)}`}
            </p>
          </div>

          {isOpen && (
            <CloseTradeForm
              tradeId={trade.id}
              asset={trade.asset}
              direction={trade.direction}
              marketType={trade.marketType}
              entryDate={trade.entryDate.toISOString()}
            />
          )}

          <Link
            href={`/trades/${trade.id}/edit`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#303236] px-4 text-sm font-medium text-[#C4C6C8] transition hover:bg-[#202225] hover:text-white"
          >
            <Pencil size={16} />
            Edit Trade
          </Link>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Trade Information */}
        <SectionCard
          title="Trade Information"
          icon={<ChartCandlestick size={18} />}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <DetailItem
              label="Market"
              value={marketLabels[trade.marketType] ?? trade.marketType}
            />
            <DetailItem
              label="Direction"
              value={isLong ? "Long" : "Short"}
              valueClassName={isLong ? "text-[#79B89A]" : "text-[#D17A7A]"}
            />
            <DetailItem label="Status" value={isOpen ? "Open" : "Closed"} />
            <DetailItem
              label="Entry Price"
              value={formatQuotePrice(trade.entryPrice, quoteCurrency)}
            />
            <DetailItem
              label="Exit Price"
              value={
                trade.exitPrice !== null
                  ? formatQuotePrice(trade.exitPrice, quoteCurrency)
                  : "Not closed"
              }
              valueClassName={
                trade.exitPrice !== null ? "text-white" : "text-[#686A6D]"
              }
            />
            <DetailItem label="Leverage" value={`${trade.leverage}x`} />
            <DetailItem label="Position Size" value={positionSize} />
            {positionValue && (
              <DetailItem label="Position Value" value={positionValue} />
            )}
            <DetailItem
              label="Entry Date"
              value={formatDate(trade.entryDate, timezone)}
            />
            <DetailItem
              label="Exit Date"
              value={
                trade.exitDate
                  ? formatDate(trade.exitDate, timezone)
                  : "Not closed"
              }
              valueClassName={trade.exitDate ? "text-white" : "text-[#686A6D]"}
            />
          </div>
        </SectionCard>

        {/* Risk Management */}
        <SectionCard title="Risk Management" icon={<ShieldCheck size={18} />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <DetailItem
              label="Stop Loss"
              value={
                trade.stopLoss !== null
                  ? formatQuotePrice(trade.stopLoss, quoteCurrency)
                  : "Not set"
              }
              valueClassName={
                trade.stopLoss !== null ? "text-white" : "text-[#686A6D]"
              }
            />
            <DetailItem
              label="Take Profit"
              value={
                trade.takeProfit !== null
                  ? formatQuotePrice(trade.takeProfit, quoteCurrency)
                  : "Not set"
              }
              valueClassName={
                trade.takeProfit !== null ? "text-white" : "text-[#686A6D]"
              }
            />
            <DetailItem
              label="Risk Percentage"
              value={
                trade.riskPercentage !== null
                  ? `${formatNumber(trade.riskPercentage, 4)}%`
                  : "Not set"
              }
              valueClassName={
                trade.riskPercentage !== null ? "text-white" : "text-[#686A6D]"
              }
            />
          </div>
        </SectionCard>

        {/* Trade Performance */}
        <SectionCard title="Trade Performance" icon={<TrendingUp size={18} />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <DetailItem
              label="Gross P&L"
              value={formatSignedMoney(trade.grossPnL, currency)}
              valueClassName={pnlTone(trade.grossPnL)}
            />
            <DetailItem
              label="Trading Fees"
              value={formatMoney(trade.fees, currency)}
            />
            <DetailItem
              label="Funding Fees"
              value={formatMoney(trade.fundingFees, currency)}
            />
            <DetailItem
              label="Net P&L"
              value={formatSignedMoney(trade.netPnL, currency)}
              valueClassName={pnlTone(trade.netPnL)}
            />
            <DetailItem
              label="Return Percentage"
              value={formatPercent(trade.returnPercentage)}
              valueClassName={pnlTone(trade.returnPercentage)}
            />
          </div>

          {isOpen && (
            <p className="mt-5 flex items-center gap-2 rounded-lg border border-[#303236] bg-[#131516] px-3 py-2 text-xs text-[#77797C]">
              <Activity size={14} className="shrink-0 text-[#A7A9AC]" />
              Performance is calculated once this trade is closed.
            </p>
          )}
        </SectionCard>

        {/* Strategy & Notes */}
        <SectionCard title="Strategy & Notes" icon={<NotebookPen size={18} />}>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-[#77797C]">Strategy</p>
              {trade.strategy ? (
                <p className="mt-1 inline-flex items-center gap-2 rounded-md border border-[#303236] bg-[#202225] px-2.5 py-1 text-sm font-medium text-white">
                  <Target size={13} className="text-[#A7A9AC]" />
                  {trade.strategy}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#686A6D]">
                  No strategy recorded.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-[#77797C]">Notes</p>
              {trade.notes ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#C4C6C8]">
                  {trade.notes}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#686A6D]">
                  No notes added for this trade.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Screenshots */}
        <div className="xl:col-span-2">
          <SectionCard title="Screenshots" icon={<Camera size={18} />}>
            <TradeImageGallery urls={images} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
