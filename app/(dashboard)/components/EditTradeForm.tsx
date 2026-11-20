"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChartCandlestick, ImagePlus, X } from "lucide-react";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

type MarketType = "FOREX" | "CRYPTO_SPOT" | "CRYPTO_FUTURES";
type TradeDirection = "LONG" | "SHORT";
type TradeStatus = "OPEN" | "CLOSED";

type PendingImage = {
  file: File;
  url: string;
};

export interface EditableTrade {
  id: string;
  marketType: MarketType;
  asset: string;
  direction: TradeDirection;
  status: TradeStatus;
  entryPrice: string;
  exitPrice: string;
  lotSize: string;
  positionValue: string;
  leverage: number;
  entryDate: string;
  exitDate: string;
  stopLoss: string;
  takeProfit: string;
  riskPercentage: string;
  fees: string;
  fundingFees: string;
  strategy: string;
  notes: string;
}

interface ExistingImage {
  id: string;
  url: string;
}

interface EditTradeFormProps {
  trade: EditableTrade;
  images: ExistingImage[];
  currency: string;
}

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const inputClass =
  "w-full rounded-lg border border-[#303235] bg-[#101112] px-3 py-3 text-sm outline-none transition focus:border-[#A7A9AC]";

const markets = [
  { value: "FOREX", label: "Forex", description: "Currency pairs" },
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

function toDateTimeLocal(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditTradeForm({
  trade,
  images,
  currency,
}: EditTradeFormProps) {
  const router = useRouter();

  const isClosed = trade.status === "CLOSED";

  const [marketType, setMarketType] = useState<MarketType>(
    trade.marketType
  );
  const [asset, setAsset] = useState(trade.asset);
  const [direction, setDirection] = useState<TradeDirection>(
    trade.direction
  );
  const [entryDate, setEntryDate] = useState(() =>
    toDateTimeLocal(trade.entryDate)
  );

  const [entryPrice, setEntryPrice] = useState(trade.entryPrice);
  const [lotSize, setLotSize] = useState(trade.lotSize);
  const [positionValue, setPositionValue] = useState(
    trade.positionValue
  );
  const [leverage, setLeverage] = useState(String(trade.leverage));

  const [exitPrice, setExitPrice] = useState(trade.exitPrice);
  const [exitDate, setExitDate] = useState(() =>
    toDateTimeLocal(trade.exitDate)
  );

  const [stopLoss, setStopLoss] = useState(trade.stopLoss);
  const [takeProfit, setTakeProfit] = useState(trade.takeProfit);
  const [riskPercentage, setRiskPercentage] = useState(
    trade.riskPercentage
  );
  const [fees, setFees] = useState(trade.fees || "0");
  const [fundingFees, setFundingFees] = useState(
    trade.fundingFees || "0"
  );

  const [strategy, setStrategy] = useState(trade.strategy);
  const [notes, setNotes] = useState(trade.notes);

  const [existingImages, setExistingImages] =
    useState<ExistingImage[]>(images);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<PendingImage[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalImages = existingImages.length + newImages.length;

  const newImagesRef = useRef(newImages);

  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);

  // Revoke any remaining object URLs when the page unmounts.
  useEffect(() => {
    return () => {
      newImagesRef.current.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, []);

  const entryDateMin = useMemo(() => entryDate || undefined, [entryDate]);

  function handleMarketChange(next: MarketType) {
    setMarketType(next);

    if (next === "CRYPTO_SPOT") {
      setDirection("LONG");
    }
  }

  function handleRemoveExisting(id: string) {
    setExistingImages((current) =>
      current.filter((image) => image.id !== id)
    );
    setRemovedImageIds((current) =>
      current.includes(id) ? current : [...current, id]
    );
  }

  function handleAddFiles(selectedFiles: File[]) {
    const validFiles = selectedFiles.filter(
      (file) =>
        ALLOWED_IMAGE_TYPES.includes(file.type) &&
        file.size > 0 &&
        file.size <= MAX_IMAGE_SIZE
    );

    const invalidCount = selectedFiles.length - validFiles.length;
    const remainingSlots = MAX_IMAGES - totalImages;
    const filesToAdd = validFiles.slice(0, Math.max(remainingSlots, 0));

    setNewImages((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    ]);

    if (invalidCount > 0) {
      showErrorPopup(
        "Some files were rejected. Use PNG, JPG or WEBP images under 5 MB."
      );
    } else if (validFiles.length > remainingSlots) {
      showErrorPopup("You can attach a maximum of 5 images per trade.");
    }
  }

  function clearFormState() {
    newImages.forEach(({ url }) => URL.revokeObjectURL(url));

    setAsset("");
    setDirection("LONG");
    setEntryDate("");
    setEntryPrice("");
    setLotSize("");
    setPositionValue("");
    setLeverage(String(trade.leverage || 1));
    setExitPrice("");
    setExitDate("");
    setStopLoss("");
    setTakeProfit("");
    setRiskPercentage("");
    setFees("0");
    setFundingFees("0");
    setStrategy("");
    setNotes("");
    setExistingImages([]);
    setRemovedImageIds([]);
    setNewImages([]);
  }

  async function handleSubmit() {
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

    if (isClosed && (!exitPrice || !exitDate)) {
      showErrorPopup("Please provide your exit price and exit date.");
      return;
    }

    if (
      isClosed &&
      new Date(exitDate).getTime() < new Date(entryDate).getTime()
    ) {
      showErrorPopup("Exit date cannot be earlier than the entry date.");
      return;
    }

    const payload: Record<string, unknown> = {
      marketType,
      asset: asset.trim(),
      direction,
      entryPrice: Number(entryPrice),
      entryDate: new Date(entryDate).toISOString(),
      leverage: Number(leverage) || 1,
    };

    if (isClosed) {
      payload.exitPrice = Number(exitPrice);
      payload.exitDate = new Date(exitDate).toISOString();
    }

    if (marketType === "FOREX") {
      payload.lotSize = Number(lotSize);
    } else {
      payload.positionValue = Number(positionValue);
    }

    if (marketType === "CRYPTO_SPOT") {
      payload.fees = Number(fees || 0);
    }

    if (marketType === "CRYPTO_FUTURES") {
      payload.fundingFees = Number(fundingFees || 0);
    }

    if (stopLoss) payload.stopLoss = Number(stopLoss);
    if (takeProfit) payload.takeProfit = Number(takeProfit);
    if (riskPercentage) payload.riskPercentage = Number(riskPercentage);
    if (strategy.trim()) payload.strategy = strategy.trim();
    if (notes.trim()) payload.notes = notes.trim();

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      formData.append("id", trade.id);
      formData.append("trade", JSON.stringify(payload));
      formData.append(
        "removeImageIds",
        JSON.stringify(removedImageIds)
      );

      newImages.forEach(({ file }) => formData.append("images", file));

      const response = await fetch("/api/trades", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to update trade.");
      }

      showSuccessPopup("Trade updated successfully.");
      clearFormState();
      router.push(`/trades/${trade.id}`);
      router.refresh();
    } catch (error) {
      showErrorPopup(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#101112] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/trades/${trade.id}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#92969A] transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to trade details
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <ChartCandlestick size={22} className="text-[#A7A9AC]" />
            <span className="text-sm text-[#92969A]">Trade Journal</span>
          </div>

          <h1 className="text-2xl font-semibold">Edit Trade</h1>
          <p className="mt-2 text-sm text-[#92969A]">
            Correct any details and TradeVault will recalculate your
            performance automatically.
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
                  onClick={() => handleMarketChange(market.value)}
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
              Update the basic information about your trade.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Asset / Trading Pair
              </label>
              <input
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                placeholder={
                  marketType === "FOREX" ? "e.g. EUR/USD" : "e.g. BTC/USDT"
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) =>
                  setDirection(e.target.value as TradeDirection)
                }
                disabled={marketType === "CRYPTO_SPOT"}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
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
              <div className="flex h-[46px] items-center gap-2 rounded-lg border border-[#303235] bg-[#0C0D0E] px-3 text-sm text-[#A7A9AC]">
                {isClosed ? "Closed" : "Open"}
                <span className="text-xs text-[#686A6D]">
                  · set automatically
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Entry Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
          </div>
        </section>

        {/* Position Details */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Position Details</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Update your entry price and position size.
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
                className={inputClass}
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
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-[#92969A]">
                  Standard lots: 1.00 = 100,000 units.
                </p>
              </div>
            )}

            {marketType !== "FOREX" && (
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
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-[#92969A]">
                  Enter the value in {currency || "your account currency"}.
                </p>
              </div>
            )}

            {marketType !== "CRYPTO_SPOT" && (
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
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </section>

        {/* Exit Details */}
        {isClosed && (
          <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-medium">Exit Details</h2>
              <p className="mt-1 text-sm text-[#92969A]">
                Update the price and time you closed this trade.
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
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#C5C7C9]">
                  Exit Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={exitDate}
                  min={entryDateMin}
                  onChange={(e) => setExitDate(e.target.value)}
                  className={`${inputClass} [color-scheme:dark]`}
                />
              </div>
            </div>
          </section>
        )}

        {/* Fees & Risk Management */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Fees &amp; Risk Management</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Update your risk levels and any applicable fees.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Stop Loss{" "}
                <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Take Profit{" "}
                <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Risk Percentage{" "}
                <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                placeholder="e.g. 2"
                className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-[#92969A]">
            Forex and Crypto Futures trading commissions are calculated
            automatically.
          </p>
        </section>

        {/* Strategy & Notes */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-medium">Strategy &amp; Notes</h2>
            <p className="mt-1 text-sm text-[#92969A]">
              Document the strategy and reasoning behind this trade.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Strategy{" "}
                <span className="text-[#777B80]">(Optional)</span>
              </label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. SMC, ICT, BOS, FVG"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C5C7C9]">
                Trade Notes{" "}
                <span className="text-[#777B80]">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Why did you enter? What confirmations did you see? What could you have done better?"
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section className="mt-5 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Screenshots</h2>
              <span className="text-xs text-[#92969A]">
                {totalImages}/{MAX_IMAGES} images
              </span>
            </div>
            <p className="mt-1 text-sm text-[#92969A]">
              Remove existing screenshots or add new ones.
            </p>
          </div>

          {existingImages.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#77797C]">
                Current screenshots
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {existingImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-lg border border-[#303235] bg-[#101112]"
                  >
                    <div className="relative aspect-video bg-[#1B1D1F]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`Trade screenshot ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3">
                      <span className="text-xs text-[#92969A]">
                        Screenshot {index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveExisting(image.id)}
                        aria-label={`Remove screenshot ${index + 1}`}
                        className="inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300"
                      >
                        <X size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalImages < MAX_IMAGES && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#45494D] bg-[#101112] px-5 py-8 text-center transition hover:border-[#A7A9AC]">
              <ImagePlus size={20} className="text-[#A7A9AC]" />
              <span className="mt-3 text-sm font-medium">
                Add more images
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
                  handleAddFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {newImages.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {newImages.map(({ file, url }, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="overflow-hidden rounded-lg border border-[#303235] bg-[#101112]"
                >
                  <div className="relative aspect-video bg-[#1B1D1F]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`New screenshot ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <span className="truncate text-xs text-[#92969A]">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(url);
                        setNewImages((current) =>
                          current.filter((_, i) => i !== index)
                        );
                      }}
                      className="inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300"
                    >
                      <X size={13} />
                      Remove
                    </button>
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
              href={`/trades/${trade.id}`}
              className="rounded-lg border border-[#303235] px-6 py-3 text-center text-sm text-[#C5C7C9] transition hover:bg-[#1B1D1F]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-[#A7A9AC] px-6 py-3 text-sm font-semibold text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
