import TradeInsightsView from "../components/TradeInsightsView";
import { getInsightsData } from "@/lib/service/insights.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = params.period;

  const data = await loadWithAccountGuard(() => getInsightsData(period));

  return <TradeInsightsView data={data} />;
}
