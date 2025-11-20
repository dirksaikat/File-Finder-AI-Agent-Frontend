import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// ⬇️ Changed from 120 → 60 seconds (1 minute)
const RESEND_INTERVAL_SECONDS = 60; // 1 minute

// Mask email: emon@gmail.com -> emon**@gmail.com
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return email;

  const visible = local.length <= 4 ? local : local.slice(0, 4);
  return `${visible}**@${domain}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ConfirmPassword() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const [timeLeft, setTimeLeft] = useState(RESEND_INTERVAL_SECONDS);
  const [canResend, setCanResend] = useState(false);

  // 🚫 Block copy/cut/paste/drag-drop
  const blockClipboard = (e) => {
    e.preventDefault();
  };

  // Load email from URL or localStorage
  useEffect(() => {
    let urlEmail = "";
    try {
      const params = new URLSearchParams(search);
      urlEmail = params.get("email") || "";
    } catch {}

    if (urlEmail) {
      setEmail(urlEmail);
      try {
        localStorage.setItem("resetEmail", urlEmail);
      } catch {}
    } else {
      try {
        const storedReset = localStorage.getItem("resetEmail");
        const storedVerify = localStorage.getItem("verifyEmail");
        if (storedReset) setEmail(storedReset);
        else if (storedVerify) setEmail(storedVerify);
      } catch {}
    }
  }, [search]);

  const maskedEmail = useMemo(
    () => (email ? maskEmail(email.toLowerCase()) : ""),
    [email]
  );

  // 1-minute timer (updated)
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const id = setTimeout(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  const strongEnough = (v) => v.length >= 8;

  const canSubmit =
    code.trim().length > 0 &&
    strongEnough(password) &&
    confirm === password &&
    !submitting;

  function normalizeError(err, fallback) {
    if (!err) return fallback;
    const msg =
      typeof err === "string"
        ? err
        : err.message || fallback || "Something went wrong.";
    if (msg === "Failed to fetch") {
      return "Unable to reach the server. Please make sure the backend is running and try again.";
    }
    return msg;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResendMessage("");

    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (!strongEnough(password)) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("password does not match");
      return;
    }
    if (!email) {
      setError("Missing email. Please restart the password reset process.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.trim(),
          new_password: password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data.detail ||
          data.error ||
          data.message ||
          res.statusText ||
          "Could not reset password.";
        throw new Error(msg);
      }

      setSuccess(
        data.message ||
          "Your password has been reset successfully. Redirecting to login..."
      );

      setCode("");
      setPassword("");
      setConfirm("");

      try {
        localStorage.removeItem("resetEmail");
      } catch {}

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(normalizeError(err, "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!canResend || resending) return;

    if (!email) {
      setError("Missing email. Please restart the password reset process.");
      return;
    }

    setError("");
    setSuccess("");
    setResendMessage("");
    setResending(true);

    try {
      const res = await fetch(`${API_BASE}/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data.detail ||
          data.error ||
          data.message ||
          res.statusText ||
          "Could not resend verification code.";
        throw new Error(msg);
      }

      setResendMessage(
        data.message || "Check your email—we’ve sent a new verification code."
      );

      // Restart new 1-minute timer
      setTimeLeft(RESEND_INTERVAL_SECONDS);
      setCanResend(false);
    } catch (err) {
      setError(
        normalizeError(
          err,
          "Something went wrong while resending the verification code."
        )
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-semibold text-gray-900">Password Reset</h1>
        <p className="text-gray-600 mt-2">
          Enter the verification code you received and choose a new password.
        </p>
        <p className="text-gray-600 mt-1">
          We sent the code to your email
          {maskedEmail ? (
            <span className="font-semibold"> ({maskedEmail}).</span>
          ) : (
            "."
          )}
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

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
          autoComplete="off"
          noValidate
        >
          {/* Verification Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Verification Code <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <KeyRound className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code you received"
                autoComplete="one-time-code"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300"
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type={showPw1 ? "text" : "password"}
                placeholder="At least 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-300"
                required

                // 🚫 BLOCK COPY/CUT/PASTE/DRAG
                onCopy={blockClipboard}
                onCut={blockClipboard}
                onPaste={blockClipboard}
                onDrop={blockClipboard}
                onDragOver={blockClipboard}
              />
              <button
                type="button"
                onClick={() => setShowPw1((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showPw1 ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type={showPw2 ? "text" : "password"}
                placeholder="Re-enter new password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-300"
                required

                // 🚫 BLOCK COPY/CUT/PASTE/DRAG
                onCopy={blockClipboard}
                onCut={blockClipboard}
                onPaste={blockClipboard}
                onDrop={blockClipboard}
                onDragOver={blockClipboard}
              />
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showPw2 ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {confirm && confirm !== password && (
              <p className="text-xs text-red-600 mt-1">password does not match</p>
            )}
          </div>

          {/* Reset Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Resetting…" : "Reset Password"}
          </button>

          {/* Resend Button */}
          <button
            type="button"
            disabled={!canResend || resending}
            onClick={handleResend}
            className="w-full mt-2 py-3 rounded-xl border border-gray-300"
          >
            {resending
              ? "Resending…"
              : canResend
              ? "Resend Code"
              : `Resend Code in ${formatTime(timeLeft)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
