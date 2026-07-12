import React, { useState } from "react";
import { motion } from "motion/react";
import { User, Key, ShieldCheck, Sparkles, Cpu, AlertTriangle } from "lucide-react";
import { User as AppUser } from "../types";
import { playClickSound, playSuccessSound, playLossSound } from "../utils/audio";
import { apiFetch } from "../utils/apiClient";

interface AuthPanelProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function AuthPanel({ onLoginSuccess }: AuthPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Both fields are required.");
      playLossSound();
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const data = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      if (data && data.success) {
        playSuccessSound();
        onLoginSuccess(data.user);
      } else {
        setErrorMessage((data && data.message) || "Failed to authenticate.");
        playLossSound();
      }
    } catch (err) {
      setErrorMessage("Network error. Make sure your connection is active.");
      playLossSound();
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    playClickSound();
    playSuccessSound();
    // Default mock user
    onLoginSuccess({
      uid: "guest_" + Math.random().toString(36).substring(2, 7),
      username: "Guest User",
      coins: 3,
      isAdmin: false
    });
  };

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans text-white">
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,200,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,200,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7A5CFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00C8FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,200,255,0.15)] relative z-10 backdrop-blur-md"
      >
        {/* Glowing Title Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00C8FF] to-transparent" />

        {/* Brand Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,200,255,0.2)]">
            <Cpu className="w-6 h-6 text-[#00C8FF] animate-pulse" />
          </div>
          <h1 className="text-2xl font-display font-black tracking-widest bg-gradient-to-r from-white via-[#00C8FF] to-[#FF2D95] bg-clip-text text-transparent uppercase">
            WINGO NEURAL DECK
          </h1>
          <p className="text-[10px] font-display text-slate-400 tracking-[3px] uppercase mt-1">
            SECURE ACCESS SYSTEM
          </p>
        </div>

        {/* Authentication Switcher Tabs */}
        <div className="grid grid-cols-2 bg-black/60 border border-slate-900 rounded-xl p-1 mb-6">
          <button
            onClick={() => {
              playClickSound();
              setIsLogin(true);
              setErrorMessage("");
            }}
            className={`py-2 text-xs font-display font-bold rounded-lg transition-all ${
              isLogin ? "bg-[#7A5CFF]/20 text-[#7A5CFF] border border-[#7A5CFF]/30 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => {
              playClickSound();
              setIsLogin(false);
              setErrorMessage("");
            }}
            className={`py-2 text-xs font-display font-bold rounded-lg transition-all ${
              !isLogin ? "bg-[#7A5CFF]/20 text-[#7A5CFF] border border-[#7A5CFF]/30 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            SIGN UP
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 text-xs text-red-400"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-display text-slate-400 tracking-wider">
              USERNAME
            </label>
            <div className="bg-black/50 border border-slate-900 focus-within:border-[#00C8FF]/50 rounded-xl px-4 py-3 flex items-center gap-3 transition">
              <User className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm text-white placeholder:text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-display text-slate-400 tracking-wider">
              PASSWORD
            </label>
            <div className="bg-black/50 border border-slate-900 focus-within:border-[#00C8FF]/50 rounded-xl px-4 py-3 flex items-center gap-3 transition">
              <Key className="w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm text-white placeholder:text-slate-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF2D95] via-[#7A5CFF] to-[#00C8FF] text-xs font-display font-black tracking-widest text-white rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? "AUTHORIZING..." : isLogin ? "REQUEST DECK ENTRY" : "CREATE NEW DECK ACCOUNT"}
          </button>
        </form>

        {/* Divider separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-[1px] bg-slate-900" />
          <span className="text-[9px] text-slate-500 font-display">OR</span>
          <div className="flex-1 h-[1px] bg-slate-900" />
        </div>

        {/* Guest direct access */}
        <button
          onClick={handleGuestLogin}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-display font-bold text-slate-300 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#F8C84A] animate-spin [animation-duration:10s]" />
          CONTINUE AS GUEST PREVIEW
        </button>

        {/* Bottom secure hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C8FF]" />
          <span>MILITARY-GRADE SYMMETRIC AUTHENTICATION</span>
        </div>
      </motion.div>
    </div>
  );
}
