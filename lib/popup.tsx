"use client";

import { toast, type ExternalToast } from "sonner";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type PopupOptions = ExternalToast;

function PopupCard({
  id,
  message,
  variant,
}: {
  id: string | number;
  message: string;
  variant: "success" | "error";
}) {
  const isSuccess = variant === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className="pointer-events-auto flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-[#303236] bg-[#17191B] p-4 text-white shadow-2xl"
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          isSuccess
            ? "border-[#315341] bg-[#1B2921] text-[#79B89A]"
            : "border-[#4A3131] bg-[#291B1B] text-[#D17A7A]"
        }`}
      >
        {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          {isSuccess ? "Success" : "Something went wrong"}
        </p>
        <p className="mt-1 text-sm leading-5 text-[#A7A9AC]">{message}</p>
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-[#77797C] transition hover:bg-[#202225] hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function showSuccessPopup(message: string, options?: PopupOptions) {
  return toast.custom(
    (id) => <PopupCard id={id} message={message} variant="success" />,
    { duration: 4000, ...options }
  );
}

export function showErrorPopup(message: string, options?: PopupOptions) {
  return toast.custom(
    (id) => <PopupCard id={id} message={message} variant="error" />,
    { duration: 5000, ...options }
  );
}
