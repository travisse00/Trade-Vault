
"use client";

import { useEffect, useState } from "react";
import {
  UserRound,
  Wallet,
  Settings2,
  ShieldCheck,
  Save,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [currency, setCurrency] = useState("USD");
  const [startingBalance, setStartingBalance] = useState("0");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [defaultMarket, setDefaultMarket] = useState("Forex");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [leverage, setLeverage] = useState("1");

  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/account");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load account.");
        }

        if (result.account) {
          const account = result.account;

          setAccountExists(true);
          setCurrency(account.currency);
          setStartingBalance(String(account.initialBalance));
          setDateFormat(account.dateFormat);
          setDefaultMarket(account.defaultMarket);
          setTimezone(account.timezone);
          setLeverage(String(account.defaultLeverage));
        }
      } catch (error) {
        console.error("Account loading failed:", error);
        showErrorPopup("Unable to load account settings.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  const sections = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "account", label: "Account Preferences", icon: Wallet },
    { id: "trading", label: "Trading Preferences", icon: Settings2 },
    { id: "security", label: "Security", icon: ShieldCheck },
  ];

  async function handleSave() {
    setSaving(true);

    try {
      // Update profile information through Supabase Auth.
      const profileResponse = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName }),
      });

      const profileResult = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profileResult.error || "Unable to update profile."
        );
      }

      // Update account preferences.
      if (accountExists) {
        const response = await fetch("/api/account", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateFormat,
            defaultMarket,
            timezone,
            defaultLeverage: Number(leverage),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to update preferences."
          );
        }
      }

      showSuccessPopup("Settings saved successfully.");
      router.refresh();
    } catch (error) {
      showErrorPopup(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-[#292B2E] bg-[#1D1F21] px-3 text-sm text-white outline-none transition focus:border-[#A7A9AC]";

  return (
    <div className="min-h-screen bg-[#101112] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-[#85888B]">
            Manage your account and trading preferences.
          </p>
        </div>

        {/* Settings Navigation */}
        <div className="flex gap-2 overflow-x-auto border-b border-[#292B2E] pb-3">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#85888B] transition hover:bg-[#202224] hover:text-white"
            >
              <section.icon size={16} />
              {section.label}
            </a>
          ))}
        </div>

        {/* Profile */}
        <section
          id="profile"
          className="scroll-mt-24 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-[#252729] p-2.5 text-[#A7A9AC]">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Profile</h2>
              <p className="text-xs text-[#85888B]">
                Your personal account information.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </Field>

            <Field label="Email Address">
              <input
                value={user?.email || ""}
                disabled
                className={`${inputClass} cursor-not-allowed opacity-60`}
              />
              <p className="mt-1 text-xs text-[#686A6D]">
                Email is managed through your authentication account.
              </p>
            </Field>
          </div>
        </section>

        {/* Account Preferences */}
        <section
          id="account"
          className="scroll-mt-24 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-[#252729] p-2.5 text-[#A7A9AC]">
              <Wallet size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Account Preferences</h2>
              <p className="text-xs text-[#85888B]">
                Configure your account balance and display preferences.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#85888B]">
              Loading account preferences...
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Default Currency">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={accountExists || loading}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
                <p className="mt-1 text-xs text-[#686A6D]">
                  {accountExists
                    ? "Your account currency is locked."
                    : "Choose your currency during initial account setup."}
                </p>
              </Field>

              <Field label="Starting Account Balance">
                <input
                  type="number"
                  min="0"
                  value={startingBalance}
                  disabled={accountExists || loading}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                />
                <p className="mt-1 text-xs text-[#686A6D]">
                  {accountExists
                    ? "Your initial balance is locked and cannot be changed."
                    : "Set once during initial account setup."}
                </p>
              </Field>

              <Field label="Date Format">
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className={inputClass}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </Field>
            </div>
          )}
        </section>

        {/* Trading Preferences */}
        <section
          id="trading"
          className="scroll-mt-24 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-[#252729] p-2.5 text-[#A7A9AC]">
              <Settings2 size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Trading Preferences</h2>
              <p className="text-xs text-[#85888B]">
                Set your default trading environment.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Default Market Type">
              <select
                value={defaultMarket}
                onChange={(e) => setDefaultMarket(e.target.value)}
                className={inputClass}
              >
                <option value="Forex">Forex</option>
                <option value="Crypto Spot">Crypto Spot</option>
                <option value="Crypto Futures">Crypto Futures</option>
              </select>
            </Field>

            <Field label="Trading Timezone">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputClass}
              >
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </Field>

            <Field label="Default Leverage">
              <select
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className={inputClass}
              >
                <option value="1">1:1</option>
                <option value="10">1:10</option>
                <option value="20">1:20</option>
                <option value="50">1:50</option>
                <option value="100">1:100</option>
                <option value="200">1:200</option>
                <option value="500">1:500</option>
              </select>
              <p className="mt-1 text-xs text-[#686A6D]">
                Used as a default when recording new trades.
              </p>
            </Field>
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="scroll-mt-24 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-[#252729] p-2.5 text-[#A7A9AC]">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Security</h2>
              <p className="text-xs text-[#85888B]">
                Manage access to your TradeVault account.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#292B2E] p-4">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="mt-1 text-xs text-[#85888B]">
                Your account password is managed by Supabase Auth.
              </p>
            </div>

            <span className="rounded-md border border-[#383A3D] px-3 py-1.5 text-xs text-[#A7A9AC]">
              Managed by Supabase
            </span>
          </div>
        </section>

        {/* Save Area */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#292B2E] bg-[#171819] p-4">
          <p className="text-xs text-[#85888B]">
            {accountExists
              ? "Your preferences will be saved to your account."
              : "Complete your initial account setup to configure your balance and currency."}
          </p>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-lg bg-[#A7A9AC] px-4 py-2.5 text-sm font-medium text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
        {label}
      </label>
      {children}
    </div>
  );
}
