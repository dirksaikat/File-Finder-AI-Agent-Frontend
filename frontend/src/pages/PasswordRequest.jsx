import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import apiClient from "../services/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function PasswordRequest() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSent(false);

    // Frontend email format validation
    if (!isEmail(email)) {
      // your requested message (fixed text)
      setError("Please enter your mail correctly");
      return;
    }

    const cleanedEmail = email.trim();

    setSubmitting(true);
    try {
      // Call your backend to request a reset code
      await apiClient.post("/password-reset/request", {
        email: cleanedEmail,
      });

      // Save email so confirm-password page can use it
      try {
        localStorage.setItem("resetEmail", cleanedEmail);
      } catch {
        // ignore storage error
      }

      // Show "code sent" success message
      setSent(true);
      setError("");

      // Redirect to confirm-password page after short delay
      setTimeout(() => {
        navigate(`/confirm-password?email=${encodeURIComponent(cleanedEmail)}`);
      }, 1500); // 1.5s delay so the user can see the message
    } catch (err) {
      console.error(err);
      // If email doesn't match / backend rejects, show this exact text
      setError("Your mail is incorrect");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Password Reset
        </h1>
        <p className="text-gray-600 mt-2">
          Provide the email address associated with your account to recover your
          password.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {sent && (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
            Your code has been sent
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear messages while typing
                setError("");
                setSent(false);
              }}
              className={`mt-1 w-full rounded-xl border ${
                !email || isEmail(email)
                  ? "border-gray-300"
                  : "border-red-400"
              } px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              required
            />
          </div>

          <button
            type="submit"
            // allow click even when format is wrong, so warning can show
            disabled={submitting || !email}
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
        </form>
      </div>
    </div>
  );
}
   