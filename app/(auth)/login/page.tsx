"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ChartNoAxesCombined,
  ArrowRight,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { loginSchema } from "@/lib/validation/auth";
import { useRouter } from "next/navigation";
import { login } from "@/lib/service/auth.service";
import { showErrorPopup, showSuccessPopup } from "@/lib/popup";

function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    try {
      const result = loginSchema.safeParse({ email, password });

      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;

        showErrorPopup(
          errors.email?.[0] ||
            errors.password?.[0] ||
            "Invalid input",
        );
        return;
      }

      const response = await login(result.data);

      const data = await response.json();

      if (!response.ok) {
        showErrorPopup(data.error || "Login failed");
        return;
      }

      showSuccessPopup(data.message || "Logged in successfully.");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      router.push("/dashboard");
      router.refresh();
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
    <main className="min-h-screen bg-[#101112] text-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-[#A7A9AC] flex items-center justify-center">
            <ChartNoAxesCombined className="w-6 h-6 text-[#101112]" />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Trade<span className="text-[#A7A9AC]">Vault</span>
          </span>
        </Link>

        {/* Login Card */}
        <div className="bg-[#191B1D] border border-[#303336] rounded-2xl p-7 sm:p-9 shadow-2xl">
          <div className="mb-8">
            <p className="text-[#A7A9AC] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Welcome back
            </p>

            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Sign in to your account
            </h1>

            <p className="text-sm text-[#85898D]">
              Pick up where you left off. Your trading data is waiting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#D5D7D9] mb-2"
              >
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777C80]" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-[#111314] border border-[#34383B] rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-[#62676B] outline-none transition focus:border-[#A7A9AC] focus:ring-1 focus:ring-[#A7A9AC]/30"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#D5D7D9]"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs text-[#A7A9AC] hover:text-white transition"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777C80]" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#111314] border border-[#34383B] rounded-xl pl-11 pr-12 text-sm text-white placeholder:text-[#62676B] outline-none transition focus:border-[#A7A9AC] focus:ring-1 focus:ring-[#A7A9AC]/30"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#777C80] hover:text-white transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#A7A9AC] text-[#111314] text-sm font-bold hover:bg-[#C0C2C4] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-8 pt-6 border-t border-[#303336] text-center">
            <p className="text-sm text-[#85898D]">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-white font-semibold hover:text-[#A7A9AC] transition"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#62676B] mt-7">
          Trade with clarity. Track with purpose.
        </p>
      </div>
    </main>
  );
}

export default Login;
