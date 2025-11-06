import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function ConfirmPassword() {
  const { search } = useLocation();

  // If you pass ?email=... in the URL, we’ll include it with the reset request.
  const emailFromQuery = useMemo(() => {
    const p = new URLSearchParams(search);
    const e = p.get("email");
    return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
  }, [search]);

  const [email] = useState(emailFromQuery); // optional—remove if your API doesn’t need email here
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strongEnough = (v) => v.length >= 8;

  const canSubmit =
    code.trim().length > 0 &&
    strongEnough(password) &&
    confirm === password &&
    !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!canSubmit) {
      setError("Please fill out all fields correctly.");
      return;
    }

    setSubmitting(true);
    try {
      // Adjust body fields to your backend contract if needed.
      const res = await fetch(`${API_BASE}/api/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim(),
          newPassword: password,
          // include email if your backend requires it (remove otherwise)
          ...(email ? { email } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not reset password.");

      setSuccess("Your password was reset successfully. You can now log in.");
      setCode("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-semibold text-gray-900">Password Reset</h1>
        <p className="text-gray-600 mt-2">
          Provide the verification code you received and choose a new password.
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Verification Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
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

          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                id="password"
                type={showPw1 ? "text" : "password"}
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-11 py-3 rounded-xl border ${
                  !password || strongEnough(password) ? "border-gray-300" : "border-red-400"
                } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw1((s) => !s)}
                aria-label={showPw1 ? "Hide password" : "Show password"}
                className="absolute right-3 top-2.5 p-1 text-gray-500 hover:text-gray-700"
              >
                {showPw1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use at least 8 characters. Consider mixing letters, numbers, and symbols.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                id="confirm"
                type={showPw2 ? "text" : "password"}
                minLength={8}
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full pl-10 pr-11 py-3 rounded-xl border ${
                  !confirm || confirm === password ? "border-gray-300" : "border-red-400"
                } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                aria-label={showPw2 ? "Hide password" : "Show password"}
                className="absolute right-3 top-2.5 p-1 text-gray-500 hover:text-gray-700"
              >
                {showPw2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            {submitting ? "Resetting…" : "Reset Password"}
          </button>

          <div className="my-4 h-px bg-gray-100" />
          
        </form>
      </div>
    </div>
  );
}
