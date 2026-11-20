import StrategiesClient from "../components/StrategiesClient";
import { getAnalyticsData } from "@/lib/service/analytics.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";

export default async function StrategiesPage() {
  const data = await loadWithAccountGuard(getAnalyticsData);

  return (
    <StrategiesClient
      strategies={data.strategies}
      currency={data.currency}
    />
  );
}
