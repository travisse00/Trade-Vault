
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

export default function AccountSetupPage() {
  const router = useRouter();

  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  function clearFormState() {
    setBalance("");
    setCurrency("USD");
    setConfirmed(false);
  }

  // An account is created exactly once. Before showing the setup form, ask the
  // API whether one already exists; if it does, send the user straight to the
  // dashboard instead of letting them submit a second, conflicting POST.
  useEffect(() => {
    let cancelled = false;

    async function checkExistingAccount() {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });

        if (cancelled) return;

        if (response.status === 401) {
          clearFormState();
          router.replace("/login");
          return;
        }

        const result = await response.json().catch(() => ({}));

        if (response.ok && result.account) {
          clearFormState();
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Fall through to the setup form; a transient failure here should not
        // block a genuine first-time setup.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkExistingAccount();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!confirmed) {
      showErrorPopup("Please confirm your starting balance.");
      return;
    }

    const amount = Number(balance);

    if (!Number.isFinite(amount) || amount < 0) {
      showErrorPopup("Enter a valid starting balance.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initialBalance: amount,
          currency,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 409) {
        // The account already exists (for example it was configured in another
        // tab). That is not a failure — send the user to their dashboard rather
        // than trying to create a duplicate.
        showSuccessPopup("Your trading account is already configured.");
        clearFormState();
        router.replace("/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to configure your account.");
      }

      showSuccessPopup("Your trading account has been configured.");
      clearFormState();
      router.replace("/dashboard");
      // router.refresh();
    } catch (error) {
      showErrorPopup(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-lg border border-[#292B2E] bg-[#1D1F21] px-3 text-sm text-white outline-none transition focus:border-[#A7A9AC]";

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101112] px-4 py-10 text-white">
        <div className="flex items-center gap-3 text-sm text-[#85888B]">
          <Loader2 size={18} className="animate-spin" />
          Checking your account...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101112] px-4 py-10 text-white">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#383A3D] bg-[#202224] text-[#A7A9AC]">
            <Wallet size={25} />
          </div>

          <h1 className="text-2xl font-semibold">
            Configure your trading account
          </h1>

          <p className="mt-2 text-sm text-[#85888B]">
            Set your initial balance to establish your performance baseline.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-[#292B2E] bg-[#171819] p-5 sm:p-7"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
              Account Currency
            </label>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#C4C6C8]">
              Initial Account Balance
            </label>

            <input
              type="number"
              min="0"
              step="any"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Enter your starting balance"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-[#686A6D]">
              Enter the actual balance of the trading account you&apos;re tracking.
            </p>
          </div>

          <div className="rounded-lg border border-[#383A3D] bg-[#202224] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-[#A7A9AC]"
              />

              <div>
                <p className="text-sm font-medium">
                  Your starting balance is permanent
                </p>

                <p className="mt-1 text-xs leading-5 text-[#85888B]">
                  Once confirmed, your initial balance and account currency
                  cannot be changed through normal account settings.
                  Deposits and withdrawals will be recorded separately.
                </p>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#A7A9AC]"
            />

            <span className="text-xs leading-5 text-[#AEB0B2]">
              I confirm that this is the correct initial balance and currency
              of the trading account I intend to track.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !confirmed || !balance}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#A7A9AC] text-sm font-semibold text-[#101112] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Configuring account..." : "Confirm Account"}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#686A6D]">
          You can explore TradeVault before completing this setup.
        </p>
      </div>
    </main>
  );
}
