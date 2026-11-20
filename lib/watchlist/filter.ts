export type WatchlistCategory = "FOREX" | "CRYPTO" | "STOCKS" | "INDICES" | "COMMODITIES";

export interface WatchlistFilterItem {
  name: string;
  symbol: string;
  category: WatchlistCategory;
  notes?: string | null;
  isFavorite?: boolean;
}

export function matchesWatchlistSearch(
  item: Pick<WatchlistFilterItem, "name" | "symbol" | "notes">,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    item.name.toLowerCase().includes(q) ||
    item.symbol.toLowerCase().includes(q) ||
    (item.notes ?? "").toLowerCase().includes(q)
  );
}

export function filterWatchlistItems<T extends WatchlistFilterItem>(
  items: T[],
  opts: { search?: string; category?: "ALL" | WatchlistCategory }
): T[] {
  const category = opts.category ?? "ALL";
  const search = opts.search ?? "";

  return items.filter((item) => {
    if (category !== "ALL" && item.category !== category) return false;
    return matchesWatchlistSearch(item, search);
  });
}
