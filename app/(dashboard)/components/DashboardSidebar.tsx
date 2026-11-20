
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartColumnIncreasing,
  Target,
  LogOut,
  UserRound,
  Menu,
  X,
  Settings,
  CalendarDays,
  Lightbulb,
  Newspaper,
  Bookmark,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/service/auth.service";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Trades", href: "/trades", icon: ArrowLeftRight },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Account", href: "/account", icon: Wallet },
  { name: "Analytics", href: "/analytics", icon: ChartColumnIncreasing },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Watchlist", href: "/watchlist", icon: Bookmark },
  // { name: "Market News", href: "/market-news", icon: Newspaper },
  { name: "Strategies", href: "/strategies", icon: Target },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

function DashboardSidebar({
  collapsed,
  setCollapsed,
}: DashboardSidebarProps) {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const response = await logoutUser();

    if (response.ok) {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[#292B2E] bg-[#151617] transition-all duration-300 lg:flex ${
          collapsed ? "w-[68px]" : "w-[250px]"
        }`}
      >
        {/* Header */}
        <div className="flex h-[72px] shrink-0 items-center border-b border-[#292B2E] px-3">
          {!collapsed ? (
            <div className="flex w-full items-center justify-between">
              <Link href="/dashboard">
                <Image
                  src="/tradevault-wordmark-transparent.png"
                  alt="TradeVault"
                  width={190}
                  height={55}
                  priority
                  className="h-auto w-[180px] object-contain"
                />
              </Link>

              <button
                onClick={() => setCollapsed(true)}
                className="rounded-md p-1.5 text-[#85878A] transition hover:bg-[#252729] hover:text-white"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="group relative mx-auto flex h-10 w-10 items-center justify-center"
              aria-label="Expand sidebar"
            >
              <Image
                src="/tradevault-icon-transparent.png"
                alt="TradeVault"
                width={40}
                height={40}
                priority
                className="h-10 w-10 object-contain transition group-hover:opacity-0"
              />

              <PanelLeftOpen
                size={20}
                className="absolute text-[#A7A9AC] opacity-0 transition group-hover:opacity-100"
              />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 py-5">
          {!collapsed && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#85878A]"
              />

              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#292B2E] bg-[#1D1F21] pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#686A6D] focus:border-[#777A7E]"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sidebar-scrollbar flex-1 overflow-y-auto px-3">
          {!collapsed && (
            <p className="mb-3 px-2 text-[10px] font-semibold tracking-[0.15em] text-[#686A6D]">
              WORKSPACE
            </p>
          )}

          <nav className="space-y-1">
            {navigation.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-[#292B2E] text-white"
                      : "text-[#85878A] hover:bg-[#202224] hover:text-white"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account */}
        <div className="mt-auto border-t border-[#292B2E] p-3">
          <div
            className={`mb-2 flex items-center gap-3 rounded-lg px-2 py-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#292B2E] text-[#A7A9AC]">
              <UserRound size={18} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user?.user_metadata?.full_name || "Your Account"}
                </p>
                <p className="truncate text-xs text-[#686A6D]">
                  {user?.email || "Trader"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#D17A7A] transition hover:bg-[#302020] ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#292B2E] bg-[#151617] px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-[#A7A9AC] transition hover:bg-[#252729] hover:text-white"
        >
          <Menu size={22} />
        </button>

        <Link href="/dashboard">
          <Image
            src="/tradevault-wordmark-transparent.png"
            alt="TradeVault"
            width={150}
            height={44}
            priority
            className="h-auto w-[145px] object-contain"
          />
        </Link>

        <div className="h-10 w-10" />
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          {/* Drawer */}
          <aside className="absolute bottom-0 left-0 top-0 flex w-[280px] max-w-[85vw] flex-col border-r border-[#292B2E] bg-[#151617] shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#292B2E] px-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
              >
                <Image
                  src="/tradevault-wordmark-transparent.png"
                  alt="TradeVault"
                  width={160}
                  height={46}
                  className="h-auto w-[150px] object-contain"
                />
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-[#85878A] transition hover:bg-[#252729] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="sidebar-scrollbar flex-1 overflow-y-auto px-3 py-6">
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.15em] text-[#686A6D]">
                WORKSPACE
              </p>

              <nav className="space-y-1">
                {navigation.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition ${
                        active
                          ? "bg-[#292B2E] text-white"
                          : "text-[#85878A] hover:bg-[#202224] hover:text-white"
                      }`}
                    >
                      <item.icon size={19} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Account */}
            <div className="mt-auto border-t border-[#292B2E] p-4">
              <div className="mb-3 flex items-center gap-3 px-1 py-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#292B2E] text-[#A7A9AC]">
                  <UserRound size={19} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.user_metadata?.full_name || "Your Account"}
                  </p>
                  <p className="truncate text-xs text-[#686A6D]">
                    {user?.email || "Trader"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#D17A7A] transition hover:bg-[#302020]"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default DashboardSidebar;
