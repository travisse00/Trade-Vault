import { notFound } from "next/navigation";

import { getTradeById } from "@/lib/service/trade.service";
import { getTradeImageSignedUrls } from "@/lib/service/trade-image.service";
import EditTradeForm, {
  type EditableTrade,
} from "../../../components/EditTradeForm";

function toInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

export default async function EditTradePage({
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

  const { trade, currency } = result;

  const signedUrls = await getTradeImageSignedUrls(
    trade.images.map((image) => image.storagePath)
  );

  const images = trade.images
    .map((image) => ({
      id: image.id,
      url: signedUrls[image.storagePath],
    }))
    .filter(
      (image): image is { id: string; url: string } => Boolean(image.url)
    );

  const editable: EditableTrade = {
    id: trade.id,
    marketType: trade.marketType,
    asset: trade.asset,
    direction: trade.direction,
    status: trade.status,
    entryPrice: toInputValue(trade.entryPrice),
    exitPrice: toInputValue(trade.exitPrice),
    lotSize: toInputValue(trade.lotSize),
    positionValue: toInputValue(trade.positionValue),
    leverage: trade.leverage,
    entryDate: trade.entryDate.toISOString(),
    exitDate: trade.exitDate ? trade.exitDate.toISOString() : "",
    stopLoss: toInputValue(trade.stopLoss),
    takeProfit: toInputValue(trade.takeProfit),
    riskPercentage: toInputValue(trade.riskPercentage),
    fees: toInputValue(trade.fees),
    fundingFees: toInputValue(trade.fundingFees),
    strategy: trade.strategy ?? "",
    notes: trade.notes ?? "",
  };

  return (
    <EditTradeForm trade={editable} images={images} currency={currency} />
  );
}
