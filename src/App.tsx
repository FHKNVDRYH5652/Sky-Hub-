import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User as UserIcon, Coins, Cpu } from "lucide-react";
import AuthPanel from "./components/AuthPanel";
import PredictorWidget from "./components/PredictorWidget";
import { User } from "./types";
import { playClickSound, playSuccessSound } from "./utils/audio";
import { apiFetch } from "./utils/apiClient";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Read login state from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("pt_logged_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        fetchUserProfile(parsed.uid);
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch / Sync profile from backend
  const fetchUserProfile = async (uid: string) => {
    try {
      const json = await apiFetch(`/api/user/profile?uid=${uid}`);
      if (json && json.success && json.user) {
        setCurrentUser(json.user);
        localStorage.setItem("pt_logged_user", JSON.stringify(json.user));
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("pt_logged_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    playClickSound();
    setCurrentUser(null);
    localStorage.removeItem("pt_logged_user");
  };

  // Render Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Cpu className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <span className="text-xs font-display tracking-widest text-slate-400 uppercase animate-pulse">
          INITIALIZING SECURE SYSTEMS...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 select-none overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthPanel onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col"
          >
            {/* Top Sleek HUD bar */}
            <header className="bg-slate-950 border-b border-purple-500/20 px-4 py-3 flex items-center justify-between relative z-10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-display font-black tracking-widest text-white uppercase">
                  Wingo Neural Deck
                </span>
              </div>

              {/* Center User details */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900 border border-white/5 rounded-full px-3 py-1">
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300 font-bold">{currentUser.username}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs">
                  <Coins className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span className="text-amber-300 font-display font-black">
                    {currentUser.coins > 99999 ? "∞" : currentUser.coins}
                  </span>
                </div>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xs:inline">Exit</span>
                </button>
              </div>
            </header>

            {/* Core Embedded Game IFrame */}
            <div className="flex-1 w-full h-full relative bg-slate-900">
              <iframe
                id="game-frame"
                src="https://13lwin17.com/register?inviteCode=87R5KDN&from=web"
                className="w-full h-full border-none relative z-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                referrerPolicy="no-referrer"
              />

              {/* Floating predictive neural widget overlay */}
              <PredictorWidget
                currentUser={currentUser}
                onLogout={handleLogout}
                onRefreshUser={() => fetchUserProfile(currentUser.uid)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
