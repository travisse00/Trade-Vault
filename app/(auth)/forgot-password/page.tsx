"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ChartNoAxesCombined, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login`,
        });

      if (resetError) {
        showErrorPopup(resetError.message);
        return;
      }

      showSuccessPopup(
        "If an account exists for that email, a password reset link is on its way.",
      );
      setEmail("");
    } catch (err) {
      showErrorPopup(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101112] px-5 py-12 text-white">
      <div className="w-full max-w-md">
        {/* Branding */}
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A7A9AC]">
            <ChartNoAxesCombined className="h-6 w-6 text-[#101112]" />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Trade<span className="text-[#A7A9AC]">Vault</span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-[#303336] bg-[#191B1D] p-7 shadow-2xl sm:p-9">
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#A7A9AC]">
              Account recovery
            </p>

            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              Reset your password
            </h1>

            <p className="text-sm text-[#85898D]">
              Enter the email tied to your account and we&apos;ll send you a
              link to choose a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#D5D7D9]"
              >
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777C80]" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#34383B] bg-[#111314] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#62676B] focus:border-[#A7A9AC] focus:ring-1 focus:ring-[#A7A9AC]/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#A7A9AC] text-sm font-bold text-[#111314] transition hover:bg-[#C0C2C4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-8 border-t border-[#303336] pt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#A7A9AC] transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
