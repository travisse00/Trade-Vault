
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChartCandlestick } from "lucide-react";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

type MarketType = "FOREX" | "CRYPTO_SPOT" | "CRYPTO_FUTURES";

type PendingImage = {
  file: File;
  url: string;
};

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

function normalizeMarketType(value: unknown): MarketType | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  const markets: Record<string, MarketType> = {
    FOREX: "FOREX",
    "CRYPTO SPOT": "CRYPTO_SPOT",
    CRYPTO_SPOT: "CRYPTO_SPOT",
    "CRYPTO FUTURES": "CRYPTO_FUTURES",
    CRYPTO_FUTURES: "CRYPTO_FUTURES",
  };

  return markets[normalized] ?? null;
}

export default function NewTradePage() {
  const router = useRouter();

  const [marketType, setMarketType] = useState<MarketType>("FOREX");
  const [defaultLeverage, setDefaultLeverage] = useState(1);

  const [asset, setAsset] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [entryDate, setEntryDate] = useState("");

  const [entryPrice, setEntryPrice] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [positionValue, setPositionValue] = useState("");
  const [leverage, setLeverage] = useState("1");

  const [exitPrice, setExitPrice] = useState("");
  const [exitDate, setExitDate] = useState("");

  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskPercentage, setRiskPercentage] = useState("");
  const [fees, setFees] = useState("0");
  const [fundingFees, setFundingFees] = useState("0");

  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [tradeSaved, setTradeSaved] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const markets = [
    {
      value: "FOREX",
      label: "Forex",
      description: "Currency pairs",
    },
    {
      value: "CRYPTO_SPOT",
      label: "Crypto Spot",
      description: "Buy and sell crypto",
    },
    {
      value: "CRYPTO_FUTURES",
      label: "Crypto Futures",
      description: "Leveraged crypto trading",
    },
  ] as const;

  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Revoke any remaining object URLs when the page unmounts.
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, []);

  // Load the user's saved account preferences.
  useEffect(() => {
    async function fetchAccountPreferences() {
      try {
        const response = await fetch("/api/account", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.account) return;

        const savedLeverage = Number(
          data.account.defaultLeverage ?? 1
        );

        if (
          Number.isInteger(savedLeverage) &&
          savedLeverage >= 1
        ) {
          setDefaultLeverage(savedLeverage);
          setLeverage(String(savedLeverage));
        }

        const savedMarket = normalizeMarketType(
          data.account.defaultMarket
        );

        if (savedMarket) {
          setMarketType(savedMarket);

          if (savedMarket === "CRYPTO_SPOT") {
            setDirection("LONG");
          }
        }
      } catch (error) {
        console.error(
          "Unable to load account preferences:",
          error
        );
      }
    }

    fetchAccountPreferences();
  }, []);

  function clearFormState() {
    images.forEach(({ url }) => URL.revokeObjectURL(url));

    setMarketType("FOREX");
    setAsset("");
    setDirection("LONG");
    setStatus("OPEN");
    setEntryPrice("");
    setExitPrice("");
    setLotSize("");
    setPositionValue("");
    setLeverage(String(defaultLeverage));
    setEntryDate("");
    setExitDate("");
    setStopLoss("");
    setTakeProfit("");
    setRiskPercentage("");
    setFees("0");
    setFundingFees("0");
    setStrategy("");
    setNotes("");
    setImages([]);
    setTradeSaved(false);
  }

  async function handleSubmit() {
    if (tradeSaved) {
      return;
    }

    if (!asset.trim() || !entryPrice || !entryDate) {
      showErrorPopup(
        "Please complete the asset, entry price and entry date."
      );
      return;
    }

    if (marketType === "FOREX" && !lotSize) {
      showErrorPopup("Please enter your lot size.");
      return;
    }

    if (marketType !== "FOREX" && !positionValue) {
      showErrorPopup("Please enter your position value.");
      return;
    }

    if (status === "CLOSED" && (!exitPrice || !exitDate)) {
      showErrorPopup(
        "Please provide your exit price and exit date."
      );
      return;
    }

    const payload: Record<string, unknown> = {
      marketType,
      asset: asset.trim(),
      direction,
      status,
      entryPrice: Number(entryPrice),
      entryDate: new Date(entryDate).toISOString(),
      leverage: Number(leverage) || defaultLeverage,

      ...(status === "CLOSED"
        ? {
            exitPrice: Number(exitPrice),
            exitDate: new Date(exitDate).toISOString(),
          }
        : {}),

      ...(marketType === "FOREX"
        ? { lotSize: Number(lotSize) }
        : { positionValue: Number(positionValue) }),

      ...(marketType === "CRYPTO_SPOT"
        ? { fees: Number(fees) }
        : {}),

      ...(marketType === "CRYPTO_FUTURES"
        ? { fundingFees: Number(fundingFees) }
        : {}),

      ...(stopLoss ? { stopLoss: Number(stopLoss) } : {}),
      ...(takeProfit ? { takeProfit: Number(takeProfit) } : {}),
      ...(riskPercentage
        ? { riskPercentage: Number(riskPercentage) }
        : {}),
      ...(strategy.trim() ? { strategy: strategy.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      formData.append("trade", JSON.stringify(payload));

      images.forEach(({ file }) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/trades", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.tradeCreated) {
          setTradeSaved(true);
          showErrorPopup(
            "Your trade was saved, but image upload failed. Do not submit again. You can find your trade on the My Trades page."
          );
          return;
        }

        throw new Error(data.error || "Unable to create trade.");
      }

      showSuccessPopup("Trade created successfully.");
      clearFormState();
      router.push("/trades");
      router.refresh();
    } catch (error) {
      showErrorPopup(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#101112] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/trades"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#92969A] transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to trades
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <ChartCandlestick
              size={22}
              className="text-[#A7A9AC]"
            />
            <span className="text-sm text-[#92969A]">
              Trade Journal
            </span>
          </div>

          <h1 className="text-2xl font-semibold">Add New Trade</h1>
          <p className="mt-2 text-sm text-[#92969A]">
            Record a trade and let TradeVault handle the calculations.
          </p>
        </div>

        {/* Market Selection */}
        <section className="rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Select Market</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Choose the market this trade belongs to.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {markets.map((market) => {
              const selected = marketType === market.value;

              return (
                <button
                  key={market.value}
                  type="button"
                  onClick={() => {
                    setMarketType(market.value);
                    setLeverage(String(defaultLeverage));

                    if (market.value === "CRYPTO_SPOT") {
                      setDirection("LONG");
                    }
                  }}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? "border-[#A7A9AC] bg-[#242628]"
                      : "border-[#292B2E] bg-[#1B1D1F] hover:border-[#55595D]"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {market.label}
                  </span>
                  <span className="mt-2 block text-xs text-[#92969A]">
                    {market.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Trade Details */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Trade Details</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Enter the basic information about your trade.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Asset / Trading Pair
              </label>
              <input
                value={asset}
                onChange={(e) =>
                  setAsset(e.target.value.toUpperCase())
                }
                placeholder={
                  marketType === "FOREX"
                    ? "e.g. EUR/USD"
                    : "e.g. BTC/USDT"
                }
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none transition focus:border-[#A7A9AC]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as "LONG" | "SHORT")
                }
                disabled={marketType === "CRYPTO_SPOT"}
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="LONG">Long / Buy</option>
                <option value="SHORT">Short / Sell</option>
              </select>

              {marketType === "CRYPTO_SPOT" && (
                <p className="mt-2 text-xs text-[#92969A]">
                  Crypto Spot supports Long positions only.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Trade Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "OPEN" | "CLOSED")
                }
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Entry Date & Time
              </label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC] [color-scheme:dark]"
              />
            </div>
          </div>
        </section>

        {/* Position Details */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Position Details</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Enter your entry price and position size.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
            </div>

            {marketType === "FOREX" && (
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Lot Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="e.g. 0.10"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
                <p className="mt-2 text-xs text-[#92969A]">
                  Standard lots: 1.00 = 100,000 units.
                </p>
              </div>
            )}

            {(marketType === "CRYPTO_SPOT" ||
              marketType === "CRYPTO_FUTURES") && (
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Position Value
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={positionValue}
                  onChange={(e) => setPositionValue(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
                <p className="mt-2 text-xs text-[#92969A]">
                  Enter the value in your account currency.
                </p>
              </div>
            )}

            {marketType === "CRYPTO_FUTURES" && (
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Leverage
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
                <p className="mt-2 text-xs text-[#92969A]">
                  Your account default is {defaultLeverage}x.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Exit Details */}
        {status === "CLOSED" && (
          <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-medium">Exit Details</h2>
              <p className="mt-1 text-sm text-[#92969A]">
                Record the price and time you closed this trade.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Exit Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Exit Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC] [color-scheme:dark]"
                />
              </div>
            </div>
          </section>
        )}

        {/* Fees & Risk Management */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Fees & Risk Management</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Add your risk levels and any applicable fees.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Stop Loss <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Take Profit <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Risk Percentage <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                placeholder="e.g. 2"
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
            </div>

            {marketType === "CRYPTO_SPOT" && (
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Trading Fees
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
              </div>
            )}

            {marketType === "CRYPTO_FUTURES" && (
              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Funding Fees
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fundingFees}
                  onChange={(e) => setFundingFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
                />
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-[#92969A]">
            Forex and Crypto Futures trading commissions are calculated automatically.
          </p>
        </section>

        {/* Strategy & Notes */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Strategy & Notes</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Document the strategy and reasoning behind this trade.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Strategy <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. SMC, ICT, BOS, FVG"
                className="w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
              <p className="mt-2 text-xs text-[#92969A]">
                Your strategy will automatically appear on the Strategies page.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Trade Notes <span className="text-[#777B80]">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Why did you enter? What confirmations did you see? What could you have done better?"
                className="w-full resize-y rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none focus:border-[#A7A9AC]"
              />
            </div>
          </div>
        </section>

        {/* Trade Images */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
  <div className="mb-5">
    <div className="flex items-center justify-between">
      <h2 className="font-medium">Trade Images</h2>
      <span className="text-xs text-[#92969A]">
        {images.length}/{MAX_IMAGES} images
      </span>
    </div>

    <p className="mt-1 text-sm text-[#92969A]">
      Attach screenshots of your charts and trade setups.
    </p>
  </div>

  {images.length < MAX_IMAGES && (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#45494D] bg-[#101112] px-5 py-8 text-center transition hover:border-[#A7A9AC]">
      <span className="text-sm font-medium">
        Choose images
      </span>

      <span className="mt-2 text-xs text-[#92969A]">
        PNG, JPG or WEBP · Maximum 5 MB per image
      </span>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const selectedFiles = Array.from(
            e.target.files ?? []
          );

          const validFiles = selectedFiles.filter(
            (file) =>
              ALLOWED_IMAGE_TYPES.includes(file.type) &&
              file.size > 0 &&
              file.size <= MAX_IMAGE_SIZE
          );

          const invalidCount =
            selectedFiles.length - validFiles.length;

          const remainingSlots = MAX_IMAGES - images.length;

          const filesToAdd = validFiles.slice(
            0,
            remainingSlots
          );

          const newImages = filesToAdd.map((file) => ({
            file,
            url: URL.createObjectURL(file),
          }));

          setImages((current) => [...current, ...newImages]);

          if (invalidCount > 0) {
            showErrorPopup(
              "Some files were rejected. Use PNG, JPG or WEBP images under 5 MB."
            );
          } else if (validFiles.length > remainingSlots) {
            showErrorPopup(
              "You can attach a maximum of 5 images per trade."
            );
          }

          e.target.value = "";
        }}
      />
    </label>
  )}

  {images.length > 0 && (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map(({ file, url }, index) => (
        <div
          key={`${file.name}-${file.lastModified}-${index}`}
          className="overflow-hidden rounded-lg border border-[#303235] bg-[#101112]"
        >
          <div className="relative aspect-video bg-[#1B1D1F]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Trade screenshot ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="p-3">
            <p className="truncate text-xs font-medium">
              {file.name}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[#92969A]">
                {(file.size / 1024).toFixed(1)} KB
              </span>

              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(url);
                  setImages((current) =>
                    current.filter((_, i) => i !== index)
                  );
                }}
                className="text-xs text-red-400 transition hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</section>


        {/* Submission */}
        <div className="mt-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/trades"
              className="rounded-lg border border-[#303235] px-6 py-3 text-center text-sm text-[#C5C7C9] transition hover:bg-[#1B1D1F]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || tradeSaved}
              className="rounded-lg bg-[#A7A9AC] px-6 py-3 text-sm font-semibold text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
  ? "Saving Trade..."
  : tradeSaved
    ? "Trade Saved"
    : "Save Trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
