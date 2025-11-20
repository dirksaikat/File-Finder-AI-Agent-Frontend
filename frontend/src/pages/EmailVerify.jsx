import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// ⬇️ Changed from 120 → 60 seconds (1 minute)
const RESEND_INTERVAL_SECONDS = 60; // 1 minute

// Mask email: emon13@gmail.com -> em****@gmail.com
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return email;

  if (local.length <= 2) {
    return `${local[0] || ""}****@${domain}`;
  }

  return `${local.slice(0, 2)}****@${domain}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EmailVerify() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  // Updated: 1-minute countdown
  const [timeLeft, setTimeLeft] = useState(RESEND_INTERVAL_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const maskedEmail = useMemo(
    () => (email ? maskEmail(email) : ""),
    [email]
  );

  useEffect(() => {
    let urlEmail = "";
    try {
      const params = new URLSearchParams(search);
      urlEmail = params.get("email") || "";
    } catch {}

    if (urlEmail) {
      setEmail(urlEmail);
      try {
        localStorage.setItem("verifyEmail", urlEmail);
      } catch {}
    } else {
      try {
        const stored = localStorage.getItem("verifyEmail");
        if (stored) setEmail(stored);
      } catch {}
    }
  }, [search]);

  // 1-minute timer logic (updated)
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResendMessage("");

    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    if (!email) {
      setError("Missing email. Please go back to signup and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          data?.message ||
          "Could not verify your email.";
        throw new Error(msg);
      }

      setSuccess(data?.message || "Email verified successfully. Redirecting to login...");
      setCode("");

      try {
        localStorage.removeItem("verifyEmail");
      } catch {}

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err?.message || "Something went wrong while verifying your email."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!canResend || resending) return;

    if (!email) {
      setError("Missing email. Please go back to signup and try again.");
      return;
    }

    setError("");
    setSuccess("");
    setResendMessage("");
    setResending(true);

    try {
      const url = `${API_BASE}/verify/resend?email=${encodeURIComponent(
        email
      )}`;

      const res = await fetch(url, { method: "POST" });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          data?.message ||
          "Could not resend verification code.";
        throw new Error(msg);
      }

      setResendMessage(
        data?.message ||
          "Verification code has been resent. Please check your email for the new code."
      );

      // Restart updated 1-minute timer
      setTimeLeft(RESEND_INTERVAL_SECONDS);
      setCanResend(false);
    } catch (err) {
      setError(
        err?.message ||
          "Something went wrong while resending the verification code."
      );
    } finally {
      setResending(false);
    }
  }

  const canSubmit = code.trim().length > 0 && !submitting;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          Email Verification
        </h1>

        <p className="text-gray-600 mt-2">
          Enter the verification code we sent to your email
          {maskedEmail ? (
            <span className="font-semibold"> ({maskedEmail}).</span>
          ) : (
            "."
          )}
        </p>

        <p className="text-sm text-gray-500 mt-1">
          You have{" "}
          <span className="font-semibold">
            {formatTime(timeLeft)}
          </span>{" "}
          before you can resend a new code.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
            {success}
          </div>
        )}
        {resendMessage && (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Verification Code <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <KeyRound className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="Enter the code you received"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  code.trim() ? "border-gray-300" : "border-red-400"
                } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify Email"}
          </button>

          {/* Resend button now uses 1-minute timer */}
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resending}
            className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-60 mt-2"
          >
            {resending
              ? "Resending…"
              : canResend
              ? "Resend Code"
              : `Resend Code in ${formatTime(timeLeft)}`}
          </button>

          <div className="my-4 h-px bg-gray-100" />
        </form>
      </div>
    </div>
  );
}
