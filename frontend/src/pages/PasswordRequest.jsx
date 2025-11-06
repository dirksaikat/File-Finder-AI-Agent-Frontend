import React, { useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function PasswordRequest() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Could not send reset email.");
      }
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Password Reset</h1>
        <p className="text-gray-600 mt-2">
          Provide the email address associated with your account to recover your password.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {sent && (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a reset link has been sent.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${
                !email || isEmail(email) ? "border-gray-300" : "border-red-400"
              } px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !isEmail(email)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Reset Password"}
          </button>

          <div className="my-4 h-px bg-gray-100" />

          <div className="flex items-center justify-between text-sm text-gray-600">
            <Link to="/login" className="hover:text-gray-900 font-medium">
              Login
            </Link>
            <Link to="/signup" className="hover:text-gray-900 font-medium">
              Register
            </Link>
          </div>

          {/* Optional: social sign-in area */}
          {/* <div className="pt-6">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <div className="h-px bg-gray-200 flex-1" />
              <span>Or sign in with</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="h-11 rounded-xl border border-gray-300 bg-white">Google</button>
              <button className="h-11 rounded-xl border border-gray-300 bg-white">Microsoft</button>
            </div>
          </div> */}
        </form>
      </div>
    </div>
  );
}
