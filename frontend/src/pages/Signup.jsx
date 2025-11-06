import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha";
import apiClient from "../services/api.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function GoogleLogin({ onSuccess, onError }) {
  const btnRef = useRef(null);

  useEffect(() => {
    const scriptId = "google-identity-services";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.id = scriptId;
      s.onload = init;
      s.onerror = () => onError?.(new Error("Failed to load Google SDK"));
      document.head.appendChild(s);
    } else {
      init();
    }

    function init() {
      if (!window.google || !btnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onSuccess?.(response.credential),
          ux_mode: "popup",
          auto_select: false,
          context: "signup",
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: "100%",
        });
      } catch (e) {
        onError?.(e);
      }
    }
  }, [onSuccess, onError]);

  return (
    <div ref={btnRef} className="w-full">
      <button
        type="button"
        onClick={() => onError?.(new Error("Google button not initialized"))}
        className="w-full py-3 rounded-xl bg-white border border-gray-300 text-gray-800 font-medium shadow-sm"
      >
        Login with Google
      </button>
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [captchaToken, setCaptchaToken] = useState(null);
  const [success, setSuccess] = useState(false);

  const next = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const n = p.get("next");
    return n && n.startsWith("/") ? n : "/";
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get("email");
    if (e) setEmail(e);
  }, []);

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Use at least 8 characters.";
    if (!confirm) e.confirm = "Please confirm your password.";
    else if (confirm !== password) e.confirm = "Passwords do not match.";
    if (!agree) e.agree = "You must accept the terms to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    if (!captchaToken) {
      setErrors((prev) => ({ ...prev, submit: "Please complete the reCAPTCHA." }));
      return;
    }

    const payload = {
      name: fullName.trim(),
      email: email.trim(),
      password: password,
      confirm_password: confirm,
      terms_accepted: agree,
    };

    setLoading(true);
    try {
      const res = await apiClient.post("/register", payload);

      if (!res?.data?.message && res.status !== 200) {
        throw new Error("Signup failed");
      }

      setSuccess(true);
      setErrors({});
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch (err) {
      setErrors({ submit: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Google sign-in failed");
      navigate(next, { replace: true });
    } catch (e) {
      setErrors({ submit: e.message || "Google login failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (e) => {
    setErrors({ submit: e?.message || "Unable to initialize Google login." });
  };

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    password &&
    confirm &&
    agree &&
    !!captchaToken &&
    !loading;

  return (
    <div className="min-h-screen w-full bg-blue-600 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 md:p-10"
      >
        <h1 className="text-3xl font-bold text-gray-900">Signup</h1>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errors.submit}</div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
              Account created successfully! Redirecting to login...
            </div>
          )}

          {/* Full Name */}
          <label className="block">
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={validate}
                placeholder="Full name"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  errors.fullName ? "border-red-400" : "border-gray-300"
                } focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              />
            </div>
            {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
          </label>

          {/* Email */}
          <label className="block">
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validate}
                placeholder="Email"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                  errors.email ? "border-red-400" : "border-gray-300"
                } focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              />
            </div>
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </label>

          {/* Password */}
          <label className="block">
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input
                type={showPw1 ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validate}
                placeholder="Password (min 8 chars)"
                className={`w-full pl-10 pr-11 py-3 rounded-xl border ${
                  errors.password ? "border-red-400" : "border-gray-300"
                } focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              />
              <button
                type="button"
                onClick={() => setShowPw1((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPw1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
          </label>

          {/* Confirm Password */}
          <label className="block">
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input
                type={showPw2 ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={validate}
                placeholder="Confirm password"
                className={`w-full pl-10 pr-11 py-3 rounded-xl border ${
                  errors.confirm ? "border-red-400" : "border-gray-300"
                } focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500`}
              />
              <button
                type="button"
                onClick={() => setShowPw2((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPw2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirm && <p className="text-red-600 text-sm mt-1">{errors.confirm}</p>}
          </label>

          {/* Terms */}
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              onBlur={validate}
              className="mt-1.5 h-5 w-5 accent-blue-600"
              required
            />
            <label htmlFor="agree" className="text-gray-700 text-sm">
              I agree to the <a className="text-blue-600 hover:text-blue-700" href="#">Terms</a> and{" "}
              <a className="text-blue-600 hover:text-blue-700" href="#">Privacy Policy</a>.
            </label>
          </div>
          {errors.agree && <p className="text-red-600 text-sm -mt-2">{errors.agree}</p>}

          {/* reCAPTCHA */}
          <div className="mt-2">
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={(val) => setCaptchaToken(val)}
              onExpired={() => setCaptchaToken(null)}
              onErrored={() => {
                setCaptchaToken(null);
                setErrors((prev) => ({
                  ...prev,
                  submit: "reCAPTCHA couldn’t load. Check your connection and try again.",
                }));
              }}
              theme="light"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Signup"}
          </button>

          <div className="flex items-center gap-4 text-gray-400">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-sm">Or</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to={`/login?next=${encodeURIComponent(next)}${
                email ? `&email=${encodeURIComponent(email)}` : ""
              }`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Login
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
