"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ChartNoAxesCombined } from "lucide-react";
import { registerSchema } from "@/lib/validation/auth";
import { register } from "@/lib/service/auth.service";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      setLoading(true);

      const result = registerSchema.safeParse({ fullName, email, password });

      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;

        showErrorPopup(
          errors.fullName?.[0] ||
            errors.email?.[0] ||
            errors.password?.[0] ||
            "Invalid input",
        );
        return;
      }

      const response = await register(result.data);

      const data = await response.json();

      if (!response.ok) {
        showErrorPopup(data.error || "Registration failed");
        return;
      }

      showSuccessPopup(
        data.message ||
          "Account created successfully. Please check your email to verify.",
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
    } catch (error) {
      showErrorPopup(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101112] px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#A7A9AC] text-[#111111]">
            <ChartNoAxesCombined size={25} />
          </div>

          <h1 className="text-2xl font-bold tracking-[0.18em]">TRADEVAULT</h1>

          <p className="mt-2 text-sm text-[#85888B]">
            Your trading performance, under control.
          </p>
        </div>

        <div className="rounded-2xl border border-[#303234] bg-[#191B1D] p-7 shadow-2xl sm:p-9">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-[#85888B]">
              Start building a clearer picture of your trading.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-[#D1D2D3]"
              >
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-[#35383A] bg-[#111314] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#686B6E] focus:border-[#A7A9AC]"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#D1D2D3]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#35383A] bg-[#111314] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#686B6E] focus:border-[#A7A9AC]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#D1D2D3]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-[#35383A] bg-[#111314] px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-[#686B6E] focus:border-[#A7A9AC]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#85888B] transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#A7A9AC] py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#C2C4C6] active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#85888B]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-white underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-7 text-center text-xs tracking-wide text-[#626568]">
          TRADE SMARTER. TRACK BETTER.
        </p>
      </div>
    </main>
  );
}
