import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User as UserIcon, Coins, Cpu, ShieldCheck } from "lucide-react";
import AuthPanel from "./components/AuthPanel";
import PredictorWidget from "./components/PredictorWidget";
import { User } from "./types";
import { playClickSound, playSuccessSound } from "./utils/audio";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloned, setIsCloned] = useState(false);

  // Active anti-cracking domain verification & anti-debugging shield
  useEffect(() => {
    const hn = window.location.hostname.toLowerCase();
    const allowed = hn === "localhost" ||
      hn === "127.0.0.1" ||
      hn.endsWith(".run.app") ||
      hn.includes(".run.app") ||
      hn.includes("google.com") ||
      hn.includes("googleusercontent.com");
    if (!allowed) {
      setIsCloned(true);
    }

    // Anti-Debugging Guard Loop
    if (hn !== "localhost" && hn !== "127.0.0.1") {
      const interval = setInterval(() => {
        const start = Date.now();
        // Trigger breakpoint to pause reverse-engineering tools
        debugger;
        if (Date.now() - start > 1000) {
          console.clear();
          document.body.innerHTML = `
            <div style="background:#070A12;color:#FF355E;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;user-select:none;">
              <div style="border:2px solid #FF355E;background:rgba(255,53,94,0.1);padding:30px;border-radius:20px;max-width:400px;box-shadow:0 0 30px rgba(255,53,94,0.3)">
                <h1 style="font-size:22px;letter-spacing:2px;font-weight:900;margin:0 0 10px 0;color:#FF355E;">DEBUGGER INTERCEPTED</h1>
                <p style="font-size:11px;color:#94A3B8;letter-spacing:1px;line-height:1.6;margin:0 0 15px 0;">
                  Reverse engineering tools detected. Execution terminated instantly to secure proprietary Wingo Neural patterns.
                </p>
                <span style="font-size:9px;color:#7A5CFF;font-weight:bold;letter-spacing:2px;">SECURITY PROTOCOL ACTIVE</span>
              </div>
            </div>
          `;
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Read login state from localStorage on mount
  useEffect(() => {
    if (isCloned) return;
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
  }, [isCloned]);

  // Fetch / Sync profile from backend
  const fetchUserProfile = async (uid: string) => {
    try {
      const res = await fetch(`/api/user/profile?uid=${uid}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setCurrentUser(json.user);
          localStorage.setItem("pt_logged_user", JSON.stringify(json.user));
        }
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

  // Render Clone Lockout
  if (isCloned) {
    return (
      <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden">
        {/* Neon warning radial background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,53,94,0.15)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Holographic scanner border overlay */}
        <div className="absolute inset-0 border-[3px] border-[#FF355E]/20 pointer-events-none m-4 rounded-3xl" />
        
        <div className="relative z-10 max-w-sm w-full bg-black/80 border border-[#FF355E] rounded-3xl p-6 shadow-[0_0_50px_rgba(255,53,94,0.3)]">
          <div className="w-16 h-16 rounded-full bg-[#FF355E]/15 border-2 border-[#FF355E] flex items-center justify-center mx-auto mb-5 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-[#FF355E]" />
          </div>
          
          <h1 className="text-lg font-display font-black tracking-widest text-[#FF355E] uppercase">
            INTEGRITY VIOLATION
          </h1>
          <p className="text-[10px] text-[#7A5CFF] font-display font-bold tracking-widest uppercase mt-1">
            SOURCE CODE CLONE PROTECTED
          </p>
          
          <div className="my-5 border border-slate-900 bg-slate-950 p-4 rounded-2xl text-left space-y-2 font-mono text-[10px] text-slate-400">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-600 uppercase">SECURITY STATUS</span>
              <span className="text-[#FF355E] font-bold">LOCKED_SHIELD</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-600 uppercase">HOST HOSTNAME</span>
              <span className="text-white font-bold truncate max-w-[150px]">{window.location.hostname || "UNKNOWN"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-600 uppercase">INTEGRITY LOCK</span>
              <span className="text-[#7A5CFF] font-bold">SHA-256_ACTIVE</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-normal font-sans pt-1">
              Unauthorized copying, hosting, or redistribution of this application has been detected. All core prediction engines have been self-terminated to secure our intellectual property.
            </p>
          </div>
          
          <span className="text-[9px] text-slate-500 font-display uppercase tracking-widest block mt-4">
            CONTACT ADMIN TO AUTHORIZE LICENSE
          </span>
        </div>
      </div>
    );
  }

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
