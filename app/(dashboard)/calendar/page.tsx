import TradingCalendar from "../components/TradingCalendar";
import { getCalendarPageData } from "@/lib/service/calendar.service";
import { loadWithAccountGuard } from "@/lib/service/account-guard";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;

  const data = await loadWithAccountGuard(() =>
    getCalendarPageData(params.month)
  );

  return <TradingCalendar data={data} />;
}
