"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ExternalLink,
  Filter,
  LoaderCircle,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";
import { filterWatchlistItems, type WatchlistCategory } from "@/lib/watchlist/filter";

type WatchlistItem = {
  id: string;
  name: string;
  symbol: string;
  category: WatchlistCategory;
  notes: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

type RelatedNewsArticle = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "forex" | "crypto" | "stocks" | "indices" | "commodities" | "macro";
  categoryLabel: string;
  relatedAsset: string | null;
  impact: "High" | "Medium" | "Low" | null;
};

type FormState = {
  name: string;
  symbol: string;
  category: WatchlistCategory;
  notes: string;
  isFavorite: boolean;
};

const CATEGORY_OPTIONS: { value: "ALL" | WatchlistCategory; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "STOCKS", label: "Stocks" },
  { value: "INDICES", label: "Indices" },
  { value: "COMMODITIES", label: "Commodities" },
];

const CATEGORY_LABELS: Record<WatchlistCategory, string> = {
  FOREX: "Forex",
  CRYPTO: "Crypto",
  STOCKS: "Stocks",
  INDICES: "Indices",
  COMMODITIES: "Commodities",
};

const EMPTY_FORM: FormState = {
  name: "",
  symbol: "",
  category: "FOREX",
  notes: "",
  isFavorite: false,
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function categoryBadgeClasses(category: WatchlistCategory): string {
  switch (category) {
    case "FOREX":
      return "border-[#3A3D41] bg-[#202225] text-[#C4C6C8]";
    case "CRYPTO":
      return "border-[#3A3D41] bg-[#1D2023] text-[#C4C6C8]";
    case "STOCKS":
      return "border-[#3A3D41] bg-[#202326] text-[#C4C6C8]";
    case "INDICES":
      return "border-[#3A3D41] bg-[#1E2022] text-[#C4C6C8]";
    case "COMMODITIES":
      return "border-[#3A3D41] bg-[#212325] text-[#C4C6C8]";
    default:
      return "border-[#303236] bg-[#1A1C1E] text-[#A7A9AC]";
  }
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | WatchlistCategory>("ALL");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<WatchlistItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const [relatedNews, setRelatedNews] = useState<RelatedNewsArticle[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await fetch("/api/watchlist", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load watchlist.");
      }

      const nextItems = Array.isArray(data.items) ? (data.items as WatchlistItem[]) : [];
      setItems(nextItems);
      setSelectedId((current) => {
        if (current && nextItems.some((item) => item.id === current)) return current;
        return null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load watchlist.";
      setLoadError(message);
      setItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRelated() {
      if (!selectedItem) {
        setRelatedNews([]);
        setRelatedError("");
        setRelatedLoading(false);
        return;
      }

      try {
        setRelatedLoading(true);
        setRelatedError("");

        const params = new URLSearchParams({
          symbol: selectedItem.symbol,
          name: selectedItem.name,
          category: selectedItem.category,
        });

        const response = await fetch(`/api/watchlist/related-news?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load related cached news.");
        }

        setRelatedNews(Array.isArray(data.articles) ? (data.articles as RelatedNewsArticle[]) : []);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load related cached news.";
        setRelatedError(message);
        setRelatedNews([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    }

    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    return filterWatchlistItems(items, { search, category: categoryFilter });
  }, [items, search, categoryFilter]);

  const favoriteItems = useMemo(
    () => filteredItems.filter((item) => item.isFavorite),
    [filteredItems]
  );

  const mainItems = filteredItems;

  function openAddForm() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item: WatchlistItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      symbol: item.symbol,
      category: item.category,
      notes: item.notes ?? "",
      isFavorite: item.isFavorite,
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function submitForm() {
    if (saving) return;

    const payload = {
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      category: form.category,
      notes: form.notes.trim() ? form.notes.trim() : editingItem ? null : undefined,
      isFavorite: form.isFavorite,
    };

    if (!payload.name || !payload.symbol) {
      setFormError("Asset name and symbol are required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const isEdit = Boolean(editingItem);
      const url = isEdit ? `/api/watchlist/${editingItem!.id}` : "/api/watchlist";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Unable to ${isEdit ? "update" : "add"} asset.`);
      }

      const saved = data.item as WatchlistItem;

      setItems((current) => {
        if (!isEdit) return [saved, ...current];
        return current.map((item) => (item.id === saved.id ? saved : item));
      });

      if (!isEdit) {
        setSelectedId(saved.id);
      }

      showSuccessPopup(isEdit ? "Watchlist asset updated." : "Asset added to watchlist.");
      setFormOpen(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to ${editingItem ? "update" : "add"} asset.`;
      setFormError(message);
      showErrorPopup(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(item: WatchlistItem) {
    if (favoriteBusyId) return;

    const nextValue = !item.isFavorite;
    setFavoriteBusyId(item.id);
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, isFavorite: nextValue } : entry
      )
    );

    try {
      const response = await fetch(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextValue }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to update favourite status.");
      }

      const saved = data.item as WatchlistItem;
      setItems((current) =>
        current.map((entry) => (entry.id === saved.id ? saved : entry))
      );
    } catch (error) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isFavorite: item.isFavorite } : entry
        )
      );
      const message =
        error instanceof Error ? error.message : "Unable to update favourite status.";
      showErrorPopup(message);
    } finally {
      setFavoriteBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingId) return;

    try {
      setDeletingId(deleteTarget.id);
      const response = await fetch(`/api/watchlist/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to remove asset.");
      }

      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setSelectedId((current) => (current === deleteTarget.id ? null : current));
      showSuccessPopup("Asset removed from watchlist.");
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove asset.";
      showErrorPopup(message);
    } finally {
      setDeletingId(null);
    }
  }

  const hasFilters = search.trim() !== "" || categoryFilter !== "ALL";

  return (
    <div className="min-h-screen min-w-0 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#303236] bg-[#202225] text-[#A7A9AC]">
              <Bookmark size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
              <p className="mt-1 text-sm text-[#77797C]">
                Save and organise assets you want to monitor. No live prices or external market-data feeds.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-semibold text-[#101112] transition hover:bg-white sm:w-auto"
        >
          <Plus size={17} />
          Add Asset
        </button>
      </div>

      {loadError && (
        <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {loadError}
        </div>
      )}

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#303236] bg-[#1A1C1E] p-4">
          <p className="text-xs uppercase tracking-wider text-[#77797C]">Total Saved</p>
          <p className="mt-2 text-2xl font-semibold text-[#E5E6E7]">{items.length}</p>
          <p className="mt-1 text-xs text-[#6F7174]">Assets in your watchlist</p>
        </div>
        <div className="rounded-2xl border border-[#303236] bg-[#1A1C1E] p-4">
          <p className="text-xs uppercase tracking-wider text-[#77797C]">Favourites</p>
          <p className="mt-2 text-2xl font-semibold text-[#E5E6E7]">
            {items.filter((item) => item.isFavorite).length}
          </p>
          <p className="mt-1 text-xs text-[#6F7174]">Marked for quick access</p>
        </div>
        <div className="rounded-2xl border border-[#303236] bg-[#1A1C1E] p-4">
          <p className="text-xs uppercase tracking-wider text-[#77797C]">Showing</p>
          <p className="mt-2 text-2xl font-semibold text-[#E5E6E7]">{filteredItems.length}</p>
          <p className="mt-1 text-xs text-[#6F7174]">
            {hasFilters ? "After filters/search" : "All saved assets"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#303236] bg-[#1A1C1E] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77797C]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full rounded-xl border border-[#303236] bg-[#131415] py-2.5 pl-9 pr-3 text-sm text-[#E5E6E7] placeholder:text-[#6F7174] outline-none transition focus:border-[#4A4D52]"
            />
          </label>

          <label className="relative block">
            <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77797C]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "ALL" | WatchlistCategory)}
              className="w-full appearance-none rounded-xl border border-[#303236] bg-[#131415] py-2.5 pl-9 pr-8 text-sm text-[#E5E6E7] outline-none transition focus:border-[#4A4D52]"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("ALL");
            }}
            disabled={!hasFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#303236] bg-[#131415] px-4 py-2.5 text-sm text-[#C4C6C8] transition hover:border-[#4A4D52] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={15} />
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6 min-w-0">
          {favoriteItems.length > 0 && (
            <section className="rounded-2xl border border-[#303236] bg-[#1A1C1E] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A7A9AC]">
                  Favourite Assets
                </h2>
                <span className="text-xs text-[#77797C]">{favoriteItems.length}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {favoriteItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selectedId === item.id
                        ? "border-[#4A4D52] bg-[#202225]"
                        : "border-[#303236] bg-[#131415] hover:border-[#3A3D41]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#E5E6E7]">{item.name}</p>
                        <p className="mt-0.5 text-xs text-[#A7A9AC]">{item.symbol}</p>
                      </div>
                      <Star size={15} className="mt-0.5 shrink-0 fill-[#A7A9AC] text-[#A7A9AC]" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClasses(item.category)}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="text-[11px] text-[#6F7174]">Updated {formatDate(item.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#303236] bg-[#1A1C1E] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[#303236] px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A7A9AC]">
                  Saved Assets
                </h2>
                <p className="mt-1 text-xs text-[#77797C]">
                  Select an asset to view related cached market news.
                </p>
              </div>
              <span className="text-xs text-[#77797C]">{filteredItems.length} shown</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-[#A7A9AC]">
                <LoaderCircle size={16} className="animate-spin" />
                Loading watchlist...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-[#C4C6C8]">
                  {items.length === 0 ? "Your watchlist is empty" : "No assets match your filters"}
                </p>
                <p className="mt-2 text-sm text-[#77797C]">
                  {items.length === 0
                    ? "Add assets you want to monitor across Forex, Crypto, Stocks, Indices, and Commodities."
                    : "Try a different search term or category filter."}
                </p>
                {items.length === 0 && (
                  <button
                    type="button"
                    onClick={openAddForm}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#303236] bg-[#131415] px-4 py-2 text-sm text-[#D7D8DA] transition hover:border-[#4A4D52]"
                  >
                    <Plus size={15} />
                    Add your first asset
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#303236] text-left text-xs uppercase tracking-wider text-[#77797C]">
                        <th className="px-5 py-3 font-medium">Asset</th>
                        <th className="px-5 py-3 font-medium">Category</th>
                        <th className="px-5 py-3 font-medium">Notes</th>
                        <th className="px-5 py-3 font-medium">Updated</th>
                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-b border-[#26282B] transition ${
                            selectedId === item.id ? "bg-[#202225]" : "hover:bg-[#17191B]"
                          }`}
                        >
                          <td className="px-5 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => setSelectedId(item.id)}
                              className="text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#E5E6E7]">{item.name}</span>
                                {item.isFavorite && (
                                  <Star size={13} className="fill-[#A7A9AC] text-[#A7A9AC]" />
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-[#A7A9AC]">{item.symbol}</div>
                            </button>
                          </td>
                          <td className="px-5 py-3 align-top">
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClasses(item.category)}`}>
                              {CATEGORY_LABELS[item.category]}
                            </span>
                          </td>
                          <td className="px-5 py-3 align-top max-w-[260px]">
                            <p className="line-clamp-2 text-xs text-[#9FA1A4]">
                              {item.notes || <span className="text-[#5F6164]">No notes</span>}
                            </p>
                          </td>
                          <td className="px-5 py-3 align-top text-xs text-[#8E9093] whitespace-nowrap">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleFavorite(item)}
                                disabled={favoriteBusyId === item.id}
                                title={item.isFavorite ? "Remove favourite" : "Mark as favourite"}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#303236] bg-[#131415] text-[#A7A9AC] transition hover:border-[#4A4D52] hover:text-white disabled:opacity-50"
                              >
                                <Star size={14} className={item.isFavorite ? "fill-[#A7A9AC]" : ""} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#303236] bg-[#131415] text-[#A7A9AC] transition hover:border-[#4A4D52] hover:text-white"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#303236] bg-[#131415] text-[#A7A9AC] transition hover:border-red-500/40 hover:text-red-300"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-[#26282B]">
                  {mainItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 ${selectedId === item.id ? "bg-[#202225]" : "bg-transparent"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-[#E5E6E7]">{item.name}</p>
                              {item.isFavorite && <Star size={13} className="fill-[#A7A9AC] text-[#A7A9AC]" />}
                            </div>
                            <p className="mt-0.5 text-xs text-[#A7A9AC]">{item.symbol}</p>
                          </div>
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${categoryBadgeClasses(item.category)}`}>
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        </div>
                        {item.notes && <p className="mt-2 line-clamp-2 text-xs text-[#9FA1A4]">{item.notes}</p>}
                        <p className="mt-2 text-[11px] text-[#6F7174]">Updated {formatDate(item.updatedAt)}</p>
                      </button>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item)}
                          disabled={favoriteBusyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#303236] bg-[#131415] px-3 py-1.5 text-xs text-[#C4C6C8] disabled:opacity-50"
                        >
                          <Star size={13} className={item.isFavorite ? "fill-[#A7A9AC]" : ""} />
                          Favourite
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#303236] bg-[#131415] px-3 py-1.5 text-xs text-[#C4C6C8]"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#303236] bg-[#131415] px-3 py-1.5 text-xs text-[#C4C6C8]"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 self-start">
          <section className="rounded-2xl border border-[#303236] bg-[#1A1C1E] overflow-hidden">
            <div className="border-b border-[#303236] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2 text-[#A7A9AC]">
                <Newspaper size={15} />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Related Cached News</h2>
              </div>
              <p className="mt-1 text-xs text-[#77797C]">
                Shows matches from existing cached Marketaux news only. Selecting an asset does not trigger new provider requests.
              </p>
            </div>

            {!selectedItem ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-[#C4C6C8]">No asset selected</p>
                <p className="mt-2 text-sm text-[#77797C]">
                  Select a watchlist asset to view related cached headlines.
                </p>
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <div className="rounded-xl border border-[#303236] bg-[#131415] p-3">
                  <p className="text-sm font-semibold text-[#E5E6E7]">{selectedItem.name}</p>
                  <p className="mt-0.5 text-xs text-[#A7A9AC]">
                    {selectedItem.symbol} · {CATEGORY_LABELS[selectedItem.category]}
                  </p>
                </div>

                {relatedLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#A7A9AC]">
                    <LoaderCircle size={15} className="animate-spin" />
                    Loading related cached news...
                  </div>
                ) : relatedError ? (
                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {relatedError}
                  </div>
                ) : relatedNews.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#303236] bg-[#131415] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#C4C6C8]">No related cached news</p>
                    <p className="mt-2 text-sm text-[#77797C]">
                      No matching headlines were found in existing cached news for this asset yet. Load Market News first to populate the cache, then check again.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {relatedNews.map((article) => (
                      <article
                        key={article.id}
                        className="rounded-xl border border-[#303236] bg-[#131415] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#77797C]">
                          <span className="uppercase tracking-wider">{article.categoryLabel}</span>
                          {article.relatedAsset && (
                            <>
                              <span>·</span>
                              <span>{article.relatedAsset}</span>
                            </>
                          )}
                          {article.impact && (
                            <>
                              <span>·</span>
                              <span>{article.impact} impact</span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-2 text-sm font-medium leading-snug text-[#E5E6E7]">
                          {article.headline}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#9FA1A4]">
                          {article.summary}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#77797C]">
                          <span className="truncate">{article.source} · {formatDateTime(article.publishedAt)}</span>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#303236] px-2 py-1 text-[#C4C6C8] transition hover:border-[#4A4D52] hover:text-white"
                          >
                            Open <ExternalLink size={12} />
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#303236] bg-[#1A1C1E] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#303236] px-5 py-4">
              <h3 className="text-base font-semibold text-[#E5E6E7]">
                {editingItem ? "Edit Watchlist Asset" : "Add Asset to Watchlist"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#303236] text-[#A7A9AC] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-[#77797C]">Asset Name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Euro / US Dollar, Bitcoin, Apple Inc."
                    className="w-full rounded-xl border border-[#303236] bg-[#131415] px-3 py-2.5 text-sm text-[#E5E6E7] placeholder:text-[#5F6164] outline-none focus:border-[#4A4D52]"
                    maxLength={120}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-[#77797C]">Symbol / Ticker</span>
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm((s) => ({ ...s, symbol: e.target.value }))}
                    placeholder="e.g. EURUSD, BTC, AAPL"
                    className="w-full rounded-xl border border-[#303236] bg-[#131415] px-3 py-2.5 text-sm text-[#E5E6E7] placeholder:text-[#5F6164] outline-none focus:border-[#4A4D52]"
                    maxLength={32}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-[#77797C]">Market Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((s) => ({ ...s, category: e.target.value as WatchlistCategory }))}
                    className="w-full rounded-xl border border-[#303236] bg-[#131415] px-3 py-2.5 text-sm text-[#E5E6E7] outline-none focus:border-[#4A4D52]"
                  >
                    {CATEGORY_OPTIONS.filter((o) => o.value !== "ALL").map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-[#77797C]">Personal Notes (optional)</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Why are you tracking this asset?"
                    rows={3}
                    maxLength={500}
                    className="w-full resize-y rounded-xl border border-[#303236] bg-[#131415] px-3 py-2.5 text-sm text-[#E5E6E7] placeholder:text-[#5F6164] outline-none focus:border-[#4A4D52]"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-[#C4C6C8] sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isFavorite}
                    onChange={(e) => setForm((s) => ({ ...s, isFavorite: e.target.checked }))}
                    className="h-4 w-4 rounded border-[#303236] bg-[#131415]"
                  />
                  Mark as favourite
                </label>
              </div>

              <p className="text-xs text-[#6F7174]">
                Duplicates are prevented per account within the same market category using a normalized symbol.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#303236] px-5 py-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-[#303236] px-4 py-2 text-sm text-[#C4C6C8] transition hover:border-[#4A4D52] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2 text-sm font-semibold text-[#101112] transition hover:bg-white disabled:opacity-60"
              >
                {saving && <LoaderCircle size={14} className="animate-spin" />}
                {editingItem ? "Save Changes" : "Add Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#303236] bg-[#1A1C1E] p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-[#E5E6E7]">Remove asset?</h3>
            <p className="mt-2 text-sm text-[#9FA1A4]">
              Remove <span className="text-[#E5E6E7]">{deleteTarget.name}</span> ({deleteTarget.symbol}) from your watchlist? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !deletingId && setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="rounded-lg border border-[#303236] px-4 py-2 text-sm text-[#C4C6C8] hover:border-[#4A4D52] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-60"
              >
                {deletingId && <LoaderCircle size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
