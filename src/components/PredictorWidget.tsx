import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coins, Clock, Copy, X, Zap, Sparkles, Lock, Shield, 
  CheckCircle, AlertCircle, Cpu, Database, ShoppingCart, 
  Crown, FileText, Check, RefreshCw, LogOut
} from "lucide-react";
import { User as AppUser, WingoRecord, Prediction, Transaction } from "../types";
import { playClickSound, playSuccessSound, playLossSound, playJackpotSound } from "../utils/audio";
import { analyzeWingoHistory } from "../utils/predictor";
import { apiFetch } from "../utils/apiClient";

interface PredictorWidgetProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export default function PredictorWidget({ currentUser, onLogout, onRefreshUser }: PredictorWidgetProps) {
  // Navigation & Panel States
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"predictor" | "store" | "payment" | "admin">("predictor");
  
  // Position of Floating Ball
  const [ballPos, setBallPos] = useState({ x: window.innerWidth - 85, y: window.innerHeight * 0.7 });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const ballStartPos = useRef({ x: 0, y: 0 });
  const ballRef = useRef<HTMLDivElement>(null);
  const pointerStartTimeRef = useRef(0);

  // Period & History Data
  const [history, setHistory] = useState<WingoRecord[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>("LOADING...");
  const [lastCheckedPeriod, setLastCheckedPeriod] = useState<string>("");

  // Predictions tracking
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [lastPredictionWasLoss, setLastPredictionWasLoss] = useState<boolean>(false);
  const [lossStreak, setLossStreak] = useState<number>(() => {
    const saved = localStorage.getItem("pt_loss_streak");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("pt_loss_streak", lossStreak.toString());
  }, [lossStreak]);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedPeriods, setGeneratedPeriods] = useState<Record<string, Prediction>>({});

  // Payment / Store States
  const [selectedPlan, setSelectedPlan] = useState<{ amount: number; coins: number; img: string } | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [activeTxn, setActiveTxn] = useState<Transaction | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Admin Panel states
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isSessionAdmin, setIsSessionAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [secureTapCount, setSecureTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Victory / Defeat Overlay Popups
  const [popupState, setPopupState] = useState<{
    show: boolean;
    type: "victory" | "defeat" | "jackpot";
    period: string;
    predictionSize?: string;
    predictionColor?: string;
    actualNumber?: number;
  } | null>(null);

  // --- BACKGROUND POLLING (Every 1 second for fresh live stream updates) ---
  useEffect(() => {
    fetchHistoryAndPeriod();
    const interval = setInterval(fetchHistoryAndPeriod, 1000);
    return () => clearInterval(interval);
  }, [currentPeriod, generatedPeriods, currentPrediction, lastCheckedPeriod]);

  // Robustly fetch past 100 history & current period
  const fetchHistoryAndPeriod = async () => {
    try {
      const json = await apiFetch("/api/wingo-history");
      if (json && json.success && json.data) {
        // Normalize any variation of API record response to standard WingoRecord format
        const rawList = Array.isArray(json.data) ? json.data : [];
        const normalizedList: WingoRecord[] = rawList.map((item: any) => {
          const period = String(item.period || item.issue || item.issueNumber || item.stageNumber || "");
          const numberVal = item.number !== undefined ? Number(item.number) : 
                            item.result !== undefined ? Number(item.result) :
                            item.openNumber !== undefined ? Number(item.openNumber) : 0;
          let size = String(item.size || "").toUpperCase();
          if (size !== "BIG" && size !== "SMALL") {
            size = numberVal >= 5 ? "BIG" : "SMALL";
          }
          let color = String(item.color || item.colour || "").toUpperCase();
          if (!color) {
            color = numberVal === 0 ? "RED-VIOLET" : numberVal === 5 ? "GREEN-VIOLET" : [1,3,7,9].includes(numberVal) ? "GREEN" : "RED";
          }
          return {
            period,
            number: numberVal,
            size: size as "BIG" | "SMALL",
            color,
            timestamp: item.timestamp || Date.now()
          };
        });

        setHistory(normalizedList);

        if (normalizedList.length > 0) {
          const lastResolvedPeriod = normalizedList[0].period;
          if (lastResolvedPeriod) {
            // Next period is the BigInt of the last period + 1
            const nextPeriodNum = (BigInt(lastResolvedPeriod) + 1n).toString();
            setCurrentPeriod(nextPeriodNum);
            
            // Check if we need to resolve pending predictions
            resolveCompletedPredictions(normalizedList);
          }
        }
      }
    } catch (e) {
      console.error("Failed parsing wingo records:", e);
    }
  };

  // Check if our predicted period now has a result in the history list
  const resolveCompletedPredictions = (latestHistory: WingoRecord[]) => {
    const updatedGeneratedPeriods = { ...generatedPeriods };
    let stateChanged = false;

    Object.keys(updatedGeneratedPeriods).forEach((period) => {
      const pred = updatedGeneratedPeriods[period];
      if (pred.status === "pending") {
        // Look for this period in the latest history list
        const match = latestHistory.find(h => h.period === period);
        if (match) {
          // Found the result! Resolve it
          pred.status = "resolved";
          pred.actualNumber = match.number;

          const sizeMatch = pred.size === match.size;
          const colorMatch = 
            (pred.color === "RED" && match.color.toUpperCase().includes("RED")) ||
            (pred.color === "GREEN" && match.color.toUpperCase().includes("GREEN"));
          
          const numberMatch = pred.numbers.includes(match.number);

          if (numberMatch) {
            pred.outcome = "jackpot";
            triggerPopup("jackpot", period, pred, match.number);
            setLastPredictionWasLoss(false);
            setLossStreak(0);
          } else if (sizeMatch || colorMatch) {
            pred.outcome = "win";
            triggerPopup("victory", period, pred, match.number);
            setLastPredictionWasLoss(false);
            setLossStreak(0);
          } else {
            pred.outcome = "loss";
            triggerPopup("defeat", period, pred, match.number);
            setLastPredictionWasLoss(true); // Sets the high probability next update flag!
            setLossStreak(prev => prev + 1);
          }
          
          updatedGeneratedPeriods[period] = pred;
          stateChanged = true;
        }
      }
    });

    if (stateChanged) {
      setGeneratedPeriods(updatedGeneratedPeriods);
    }
  };

  // Trigger popups and play Audio Synth
  const triggerPopup = (
    type: "victory" | "defeat" | "jackpot", 
    period: string, 
    pred: Prediction, 
    actualNum: number
  ) => {
    setTimeout(() => {
      if (type === "jackpot") {
        playJackpotSound();
      } else if (type === "victory") {
        playSuccessSound();
      } else {
        playLossSound();
      }
    }, 100);

    setPopupState({
      show: true,
      type,
      period,
      predictionSize: pred.size,
      predictionColor: pred.color,
      actualNumber: actualNum
    });
  };

  // --- POLLED TRANSACTION STATUS (When a payment is pending) ---
  useEffect(() => {
    if (!activeTxn) return;
    
    const interval = setInterval(async () => {
      try {
        const json = await apiFetch(`/api/payment/status?txnId=${activeTxn.id}`);
        if (json && json.success && json.transaction) {
          const updatedTxn: Transaction = json.transaction;
          setActiveTxn(updatedTxn);
          if (updatedTxn.status === "approved") {
            playSuccessSound();
            onRefreshUser(); 
            clearInterval(interval);
          } else if (updatedTxn.status === "rejected") {
            playLossSound();
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Error polling payment status:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTxn]);

  // --- FETCH ALL TRANSACTIONS FOR ADMIN PANEL ---
  const fetchTransactions = async () => {
    try {
      const json = await apiFetch("/api/admin/transactions");
      if (json && json.success && json.transactions) {
        setAllTransactions(json.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- SECURE TRIPLE TAP HANDLER ---
  const handleSecureClick = () => {
    const now = Date.now();
    if (now - lastTapTime < 500) {
      const newCount = secureTapCount + 1;
      setSecureTapCount(newCount);
      if (newCount >= 3) {
        playClickSound();
        setShowPasswordPrompt(true);
        setSecureTapCount(0);
      }
    } else {
      setSecureTapCount(1);
    }
    setLastTapTime(now);
  };

  useEffect(() => {
    if (activeTab === "admin" && currentUser?.uid !== "admin" && !currentUser?.isAdmin && !isSessionAdmin) {
      setActiveTab("predictor");
    }
  }, [activeTab, currentUser, isSessionAdmin]);

  useEffect(() => {
    if (activeTab === "admin" && (currentUser?.uid === "admin" || currentUser?.isAdmin || isSessionAdmin)) {
      fetchTransactions();
      const interval = setInterval(fetchTransactions, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser, isSessionAdmin]);

  // --- DRAG HANDLERS FOR THE FLOATING BALL ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    pointerStartTimeRef.current = Date.now();
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    ballStartPos.current = { x: ballPos.x, y: ballPos.y };
    setIsDragging(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    
    const deltaX = e.clientX - pointerStartPos.current.x;
    const deltaY = e.clientY - pointerStartPos.current.y;
    
    // Threshold of 15px to distinguish dragging from tapping/clicking on touch screens
    if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }

    if (isDraggingRef.current) {
      let newX = ballStartPos.current.x + deltaX;
      let newY = ballStartPos.current.y + deltaY;

      newX = Math.max(10, Math.min(window.innerWidth - 75, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 75, newY));

      setBallPos({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const duration = Date.now() - pointerStartTimeRef.current;
    // Tap condition: either no drag was registered OR duration was very quick (< 300ms)
    if (!isDraggingRef.current || duration < 300) {
      playClickSound();
      setIsOpen(true);
    }
  };

  const copyPeriodNumber = () => {
    playClickSound();
    navigator.clipboard.writeText(currentPeriod);
  };

  // --- GENERATE PREDICTION LOGIC ---
  const handleGeneratePrediction = async () => {
    if (!currentUser) return;
    playClickSound();
    setErrorMsg("");

    if (currentUser.coins <= 0 && currentUser.uid !== "admin") {
      setErrorMsg("Insufficient Coins! Please recharge in the Store.");
      setActiveTab("store");
      return;
    }

    // Lock system: One prediction per period maximum
    if (generatedPeriods[currentPeriod]) {
      setErrorMsg("Prediction already completed for this period!");
      return;
    }

    setGenerating(true);

    try {
      const json = await apiFetch("/api/user/deduct-coin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: currentUser.uid })
      });
      if (!json || !json.success) {
        setErrorMsg((json && json.message) || "Failed to deduct coin.");
        setGenerating(false);
        return;
      }
      onRefreshUser();
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error. Please try again.");
      setGenerating(false);
      return;
    }

    // Pattern analysis trigger
    setTimeout(() => {
      const result = analyzeWingoHistory(history, currentPeriod, lossStreak);
      
      const newPrediction: Prediction = {
        ...result,
        status: "pending",
        outcome: null
      };

      setGeneratedPeriods(prev => ({
        ...prev,
        [currentPeriod]: newPrediction
      }));
      setCurrentPrediction(newPrediction);
      setGenerating(false);
      playSuccessSound();
    }, 1100);
  };

  // --- RECHARGE PLAN SELECTOR ---
  const handleSelectPlan = (amount: number, coins: number, img: string) => {
    playClickSound();
    setSelectedPlan({ amount, coins, img });
    setUtrInput("");
    setActiveTxn(null);
    setActiveTab("payment");
  };

  // --- SUBMIT TRANSACTION TO SERVER ---
  const handleSubmitPayment = async () => {
    if (!currentUser || !selectedPlan || !utrInput.trim()) return;
    if (utrInput.trim().length < 6) {
      alert("Please enter a valid 12-Digit UTR Number");
      return;
    }
    
    playClickSound();
    setSubmittingPayment(true);

    try {
      const json = await apiFetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          utr: utrInput.trim(),
          amount: selectedPlan.amount,
          coins: selectedPlan.coins,
          planImg: selectedPlan.img
        })
      });
      if (json && json.success && json.transaction) {
        setActiveTxn(json.transaction);
        playSuccessSound();
      } else {
        alert((json && json.message) || "Transaction failed on server. Try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Network issue. Check your connection.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // --- ADMIN DECK APPROVALS ---
  const handleApproveTransaction = async (txnId: string) => {
    playClickSound();
    try {
      const json = await apiFetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId })
      });
      if (json && json.success) {
        fetchTransactions();
        onRefreshUser();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectTransaction = async (txnId: string) => {
    playClickSound();
    try {
      const json = await apiFetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId })
      });
      if (json && json.success) {
        fetchTransactions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Counting pending requests for the left card
  const pendingRequestsCount = allTransactions.filter(t => t.status === "pending").length;
  const formattedPendingCount = pendingRequestsCount < 10 ? `0${pendingRequestsCount}` : `${pendingRequestsCount}`;

  return (
    <>
      {/* 3D CSS Core Styles for Cyberpunk UI */}
      <style>{`
        @keyframes floatBall {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 15px rgba(0,200,255,0.6)); }
          50% { transform: translateY(-8px) scale(1.03); filter: drop-shadow(0 0 25px rgba(255,45,149,0.8)); }
        }
        @keyframes spinRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes radarScan {
          0% { transform: rotate(0deg); opacity: 0.2; }
          50% { opacity: 0.6; }
          100% { transform: rotate(360deg); opacity: 0.2; }
        }
        @keyframes holographicGrid {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes cylinderRotation {
          0% { transform: rotateY(0deg) rotateX(20deg); }
          100% { transform: rotateY(360deg) rotateX(20deg); }
        }
        
        .floating-ball-glow {
          animation: floatBall 3s infinite ease-in-out;
        }
        
        .cyber-grid-overlay {
          background-size: 20px 20px;
          background-image: linear-gradient(to right, rgba(0, 200, 255, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 200, 255, 0.05) 1px, transparent 1px);
          animation: holographicGrid 10s linear infinite;
        }

        /* 3D Holographic Server Cube */
        .hologram-cube-wrapper {
          perspective: 1000px;
          transform-style: preserve-3d;
        }

        .hologram-cube {
          width: 50px;
          height: 50px;
          position: relative;
          transform-style: preserve-3d;
          animation: cylinderRotation 6s linear infinite;
        }

        .cube-face {
          position: absolute;
          width: 50px;
          height: 50px;
          background: rgba(0, 200, 255, 0.15);
          border: 1.5px solid rgba(0, 200, 255, 0.7);
          box-shadow: 0 0 15px rgba(0, 200, 255, 0.3);
          backdrop-filter: blur(2px);
        }

        .cube-face-front  { transform: translateZ(25px); }
        .cube-face-back   { transform: rotateY(180deg) translateZ(25px); }
        .cube-face-left   { transform: rotateY(-90deg) translateZ(25px); }
        .cube-face-right  { transform: rotateY(90deg) translateZ(25px); }
        .cube-face-top    { transform: rotateX(90deg) translateZ(25px); background: rgba(122, 92, 255, 0.25); }
        .cube-face-bottom { transform: rotateX(-90deg) translateZ(25px); }
      `}</style>

      {/* 1. FLOATING NEURAL BALL CONTROLLER */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            ref={ballRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              left: ballPos.x,
              top: ballPos.y,
              position: "fixed",
              zIndex: 999
            }}
            className="w-16 h-16 cursor-pointer touch-none flex items-center justify-center select-none floating-ball-glow"
          >
            {/* Cyberpunk Interactive Sphere */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black via-[#070A12] to-slate-900 border-2 border-[#00C8FF] flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(0,200,255,0.5)]">
              {/* Internal Holographic Grid rings */}
              <div className="absolute w-full h-full border border-dashed border-[#FF2D95]/40 rounded-full animate-spin [animation-duration:6s]" />
              <div className="absolute w-4/5 h-4/5 border border-dashed border-[#00C8FF]/30 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse]" />
              
              {/* Laser Beam glowing core */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <Cpu className="w-5 h-5 text-[#00C8FF] animate-pulse" />
                <span className="text-[7px] font-display font-black tracking-wider text-[#FF2D95] mt-0.5">AUTO</span>
              </div>

              {/* Glossy Refraction line */}
              <div className="absolute top-1 left-2 w-10 h-3 bg-white/10 rounded-full blur-[0.5px] rotate-[-25deg]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MODAL BACKDROP BACKPLANE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playClickSound();
              setIsOpen(false);
            }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[1000]"
          />
        )}
      </AnimatePresence>

      {/* 3. CORE WINGO PRO AUTO SYSTEM HUD */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
            exit={{ scale: 0.92, opacity: 0, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            style={{
              left: "50%",
              top: "50%",
              width: "370px",
              maxWidth: "96vw"
            }}
            className="fixed h-[640px] max-h-[96vh] bg-[#070A12] border-2 border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,200,255,0.25)] z-[1001] overflow-hidden flex flex-col font-sans text-white select-none"
          >
            {/* Cyber Symmetrical Corner Notches */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00C8FF] rounded-tl-3xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#FF2D95] rounded-tr-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00C8FF] rounded-bl-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#FF2D95] rounded-br-3xl pointer-events-none" />
            
            {/* Subtle Neon Glow Borders (Left cyan, Right magenta) */}
            <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-[#00C8FF] via-[#7A5CFF]/30 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-[#FF2D95] via-[#7A5CFF]/30 to-transparent" />

            {/* Glowing red & blue lateral status LED indicators */}
            <div className="absolute top-1/4 left-1 w-1.5 h-3 bg-[#00C8FF] rounded-r animate-pulse" />
            <div className="absolute top-1/3 left-1 w-1 h-2 bg-[#00C8FF] rounded-r opacity-50" />
            <div className="absolute top-1/4 right-1 w-1.5 h-3 bg-[#FF2D95] rounded-l animate-pulse [animation-delay:1s]" />
            <div className="absolute top-1/3 right-1 w-1 h-2 bg-[#FF2D95] rounded-l opacity-50" />

            {/* Background cyber grid lines layer */}
            <div className="absolute inset-0 cyber-grid-overlay opacity-30 pointer-events-none" />

            {/* HEADER DESIGN (AAA Game Level) */}
            <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800/60 sticky top-0 bg-[#070A12]/95 z-20">
              <div className="flex items-center gap-3">
                {/* Custom glowing Wing geometric logo */}
                <div className="relative w-12 h-10 flex items-center justify-center bg-gradient-to-tr from-[#00C8FF]/10 to-[#FF2D95]/10 rounded-lg border border-slate-700/60">
                  <svg className="w-10 h-8" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 20 L40 50 L50 40 L60 50 L90 20" stroke="url(#wingGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M25 35 L45 55 L50 48 L55 55 L75 35" stroke="url(#wingGradient)" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M40 60 L50 70 L60 60" stroke="#7A5CFF" strokeWidth="3" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="wingGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00C8FF" />
                        <stop offset="50%" stopColor="#7A5CFF" />
                        <stop offset="100%" stopColor="#FF2D95" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute -bottom-0.5 w-4 h-0.5 bg-[#00C8FF]" />
                </div>
                <div>
                  <h1 className="font-display font-black text-sm tracking-widest bg-gradient-to-r from-[#00C8FF] via-white to-[#FF2D95] bg-clip-text text-transparent">
                    WINGO PRO AUTO
                  </h1>
                  <p className="text-[8px] font-display font-bold tracking-widest text-[#7A5CFF] uppercase">
                    ADVANCED PREDICTION SYSTEM
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  playClickSound();
                  setIsOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2D95] flex items-center justify-center text-slate-400 hover:text-[#FF2D95] transition active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* TOP NAVIGATION SEGMENTED BUTTONS BAR */}
            <div className="px-5 py-3 border-b border-slate-800/40 flex items-center justify-between gap-2 bg-[#070A12]/50 z-10">
              {/* Segment 1: Coin Balance */}
              <button 
                onClick={() => {
                  playClickSound();
                  setActiveTab("store");
                }}
                className="flex items-center gap-1.5 bg-[#F8C84A]/10 border border-[#F8C84A]/30 rounded-lg px-2.5 py-2 hover:bg-[#F8C84A]/25 transition active:scale-95 text-left flex-1"
              >
                <Coins className="w-4 h-4 text-[#F8C84A] animate-bounce" />
                <div className="flex flex-col">
                  <span className="text-[6px] font-display text-[#F8C84A]/60 font-black">COINS</span>
                  <span className="text-[10px] font-display font-black text-[#F8C84A]">
                    {currentUser?.coins !== undefined && currentUser.coins > 99999 ? "∞" : (currentUser?.coins ?? 0)}
                  </span>
                </div>
              </button>

              {/* Segment 2: Predictor Tab Button */}
              <button
                onClick={() => {
                  playClickSound();
                  setActiveTab("predictor");
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border font-display font-black text-[10px] transition flex-1 ${
                  activeTab === "predictor" 
                    ? "bg-[#00C8FF]/10 text-[#00C8FF] border-[#00C8FF] shadow-[0_0_10px_rgba(0,200,255,0.2)]" 
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-[#00C8FF]"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>PREDICTOR</span>
              </button>

              {/* Segment 3: Store Tab Button */}
              <button
                onClick={() => {
                  playClickSound();
                  setActiveTab("store");
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border font-display font-black text-[10px] transition flex-1 ${
                  activeTab === "store" || activeTab === "payment"
                    ? "bg-[#7A5CFF]/10 text-[#7A5CFF] border-[#7A5CFF] shadow-[0_0_10px_rgba(122,92,255,0.2)]" 
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-[#7A5CFF]"
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>STORE</span>
              </button>

              {/* Segment 4: Admin Deck Tab Button (Red Premium Active Style) */}
              {(currentUser?.uid === "admin" || currentUser?.isAdmin || isSessionAdmin) && (
                <button
                  onClick={() => {
                    playClickSound();
                    setActiveTab("admin");
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border font-display font-black text-[10px] transition flex-1 ${
                    activeTab === "admin" 
                      ? "bg-[#FF355E]/10 text-[#FF355E] border-[#FF355E] shadow-[0_0_10px_rgba(255,53,94,0.3)]" 
                      : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-[#FF355E]"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>ADMIN DECK</span>
                </button>
              )}
            </div>

            {/* BODY SECTION SCROLL CANVAS */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* TAB 1: PREDICTOR INTERFACE */}
              {activeTab === "predictor" && (
                <div className="space-y-4 flex flex-col justify-between h-full min-h-[380px]">
                  {/* Current Period Block */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C8FF]/40 to-transparent" />
                    <span className="text-[9px] tracking-[4px] font-display text-slate-400 block mb-1">
                      CURRENT PERIOD
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-display font-black text-[#00C8FF] tracking-widest drop-shadow-[0_0_10px_rgba(0,200,255,0.5)]">
                        {currentPeriod}
                      </span>
                      <button 
                        onClick={copyPeriodNumber}
                        className="w-6 h-6 rounded bg-[#00C8FF]/10 border border-[#00C8FF]/30 flex items-center justify-center text-[#00C8FF] hover:bg-[#00C8FF]/20 transition active:scale-95"
                        title="Copy Period Number"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Mode badge live stream status */}
                  <div className="bg-[#070A12] border border-slate-800/80 rounded-xl py-3 px-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300 font-display font-bold">
                      <Clock className="w-4 h-4 text-[#00C8FF]" />
                      <span>WINGO 100 API MODE</span>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] font-display font-black border border-[#10B981]/30 animate-pulse tracking-wider">
                      LIVE STREAM
                    </span>
                  </div>

                  {/* Generated Lock Warning */}
                  {generatedPeriods[currentPeriod] && (
                    <div className="flex items-center gap-2 bg-[#FF355E]/10 border border-[#FF355E]/20 rounded-xl p-3 text-xs text-[#FF355E] justify-center">
                      <Lock className="w-4 h-4 animate-bounce" />
                      <span className="font-display font-bold tracking-wider text-[10px]">PREDICTION COMPLETED FOR THIS PERIOD</span>
                    </div>
                  )}

                  {/* Main holographic HUD prediction panel screen */}
                  <div className="relative bg-black/80 rounded-2xl border border-slate-800/80 min-h-36 py-5 px-4 flex flex-col items-center justify-center overflow-hidden">
                    {/* Secure Hidden Admin Activator Button (25% opacity) */}
                    <button
                      onClick={handleSecureClick}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full border border-slate-800/40 text-slate-500 hover:text-slate-300 opacity-25 hover:opacity-100 transition duration-200 z-30"
                      title="System Integrity"
                      style={{ touchAction: "none" }}
                    >
                      <Shield className="w-3 h-3" />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7A5CFF]/10 via-transparent to-transparent pointer-events-none" />
                    
                    {generating ? (
                      <div className="flex flex-col items-center gap-3 relative z-10">
                        <RefreshCw className="w-8 h-8 text-[#FF2D95] animate-spin" />
                        <span className="text-[9px] text-[#00C8FF] font-display tracking-widest animate-pulse font-black">
                          GENERATING NEURAL SEED...
                        </span>
                      </div>
                    ) : generatedPeriods[currentPeriod] ? (
                      <div className="w-full flex flex-col items-center gap-1.5 relative z-10 text-center">
                        {/* Display Prediction */}
                        <div className="flex items-center gap-2">
                          {generatedPeriods[currentPeriod].size ? (
                            <span className={`text-5xl font-display font-black tracking-widest ${
                              generatedPeriods[currentPeriod].size === "BIG" ? "text-[#FF2D95] drop-shadow-[0_0_15px_rgba(255,45,149,0.7)]" : "text-[#00C8FF] drop-shadow-[0_0_15px_rgba(0,200,255,0.7)]"
                            }`}>
                              {generatedPeriods[currentPeriod].size}
                            </span>
                          ) : (
                            <span className={`text-5xl font-display font-black tracking-widest ${
                              generatedPeriods[currentPeriod].color === "RED" ? "text-[#FF355E] drop-shadow-[0_0_15px_rgba(255,53,94,0.7)]" : "text-[#10B981] drop-shadow-[0_0_15px_rgba(16,185,129,0.7)]"
                            }`}>
                              {generatedPeriods[currentPeriod].color}
                            </span>
                          )}
                        </div>
                        
                        {/* Target Wingo Numbers */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 font-display font-bold tracking-wider">TARGET NUMBERS:</span>
                          <div className="flex gap-1.5">
                            {generatedPeriods[currentPeriod].numbers.map(n => (
                              <span key={n} className="w-6 h-6 rounded-full bg-slate-900 text-xs font-display font-black text-white flex items-center justify-center border border-slate-800 shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Hybrid Core Multi-Metrics HUD */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full max-w-xs mt-3 pt-3 border-t border-slate-900/80 text-left">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Prediction</span>
                            <span className="text-[11px] font-mono font-black text-white">{generatedPeriods[currentPeriod].numbers[0]}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Second Pred</span>
                            <span className="text-[11px] font-mono font-black text-[#00C8FF]">{generatedPeriods[currentPeriod].secondPrediction ?? generatedPeriods[currentPeriod].numbers[1]}</span>
                          </div>
                          
                          {generatedPeriods[currentPeriod].predictionType === "color" ? (
                            <div className="flex flex-col">
                              <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Predicted Color</span>
                              <span className={`text-[11px] font-display font-black ${generatedPeriods[currentPeriod].color === 'RED' ? 'text-[#FF355E]' : 'text-[#10B981]'}`}>{generatedPeriods[currentPeriod].color}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Predicted Size</span>
                              <span className={`text-[11px] font-display font-black ${generatedPeriods[currentPeriod].size === 'BIG' ? 'text-[#FF2D95]' : 'text-[#00C8FF]'}`}>{generatedPeriods[currentPeriod].size}</span>
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Trend</span>
                            <span className="text-[11px] font-display font-black text-[#F8C84A]">{generatedPeriods[currentPeriod].trendType || 'Upward'}</span>
                          </div>

                          <div className="flex flex-col col-span-2 mt-1 pt-1 border-t border-slate-900/30">
                            <span className="text-[8px] text-slate-500 font-display font-black uppercase tracking-wider">Risk Filter</span>
                            <span className={`text-[10px] font-display font-black tracking-wide uppercase ${generatedPeriods[currentPeriod].riskLevel === 'High' ? 'text-[#FF355E] animate-pulse' : 'text-[#10B981]'}`}>{generatedPeriods[currentPeriod].riskLevel || 'Low'}</span>
                          </div>
                        </div>

                        {generatedPeriods[currentPeriod].reasoning && (
                          <div className="mt-2 text-[8px] text-slate-400 font-display tracking-wide italic max-w-xs">
                            Reason: {generatedPeriods[currentPeriod].reasoning}
                          </div>
                        )}

                        {/* Layer and Recommended Bet Info */}
                        <div className="flex flex-col gap-1 items-center mt-3 pt-2 border-t border-slate-900/40 w-full max-w-xs">
                          {generatedPeriods[currentPeriod].predictionLayer && (
                            <span className="text-[8px] font-display font-black tracking-widest text-[#7A5CFF] uppercase bg-[#7A5CFF]/10 px-2.5 py-0.5 rounded border border-[#7A5CFF]/20">
                              ENGINE: {generatedPeriods[currentPeriod].predictionLayer}
                            </span>
                          )}
                          {generatedPeriods[currentPeriod].recommendedBet && (
                            <span className="text-[8px] font-display font-black tracking-widest text-[#F8C84A] uppercase bg-[#F8C84A]/10 px-2.5 py-0.5 rounded border border-[#F8C84A]/20 animate-pulse">
                              BET: {generatedPeriods[currentPeriod].recommendedBet}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-500 relative z-10 text-center px-4">
                        <Zap className="w-6 h-6 mb-1 text-[#7A5CFF] animate-pulse" />
                        <span className="text-xs font-display font-black tracking-widest text-[#00C8FF]">
                          PREDICTOR READY
                        </span>
                        <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                          Click Generate Prediction to analyze Wingo records under the SKY ULTRA PRO MAX HYBRID ENGINE V1.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Prediction confidence gauge */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-display font-black tracking-wider">
                      <span className="text-slate-400">AI PREDICTION CONFIDENCE</span>
                      <span className="text-[#00C8FF]">
                        {generatedPeriods[currentPeriod] ? `${generatedPeriods[currentPeriod].confidence}%` : "--%"}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: generatedPeriods[currentPeriod] 
                            ? `${generatedPeriods[currentPeriod].confidence}%` 
                            : "0%" 
                        }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#FF2D95] via-[#7A5CFF] to-[#00C8FF] shadow-[0_0_8px_rgba(0,200,255,0.5)]"
                      />
                    </div>
                  </div>

                  {/* Error / Status Alert Banner */}
                  {errorMsg && (
                    <div className="flex items-center gap-2 bg-[#FF355E]/15 border border-[#FF355E]/30 rounded-xl p-3 text-xs text-[#FF355E] justify-center shadow-[0_0_15px_rgba(255,53,94,0.1)]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                      <span className="font-display font-bold tracking-wider text-[10px]">{errorMsg}</span>
                    </div>
                  )}

                  {/* Core Interactive prediction generator button */}
                  <div>
                    {generatedPeriods[currentPeriod] ? (
                      <button 
                        disabled
                        className="w-full py-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs font-display font-black text-slate-500 flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 text-slate-600" />
                        WAITING FOR RESULT RELEASE...
                      </button>
                    ) : (
                      <button 
                        onClick={handleGeneratePrediction}
                        disabled={generating || currentPeriod === "LOADING..."}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF2D95] via-[#7A5CFF] to-[#00C8FF] hover:brightness-110 text-xs font-display font-black text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,45,149,0.3)] transition active:scale-[0.98] disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                        GENERATE PREDICTION
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: STORE */}
              {activeTab === "store" && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#F8C84A]/10 flex items-center justify-center border border-[#F8C84A]/30">
                      <Coins className="w-6 h-6 text-[#F8C84A]" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 block font-display font-black">CURRENT WALLET</span>
                      <span className="text-lg font-display font-black text-[#F8C84A]">
                        {currentUser?.coins !== undefined && currentUser.coins > 99999 ? "INFINITY" : (currentUser?.coins ?? 0)} <span className="text-xs text-slate-400">Coins</span>
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-display text-[#7A5CFF] block font-black uppercase tracking-widest mb-1">
                    CHOOSE COIN RECHARGE PLAN
                  </span>

                  {/* GRID OF PLANS (images / representations inside cards nicely formatted) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { amount: 50, coins: 15, name: "Bronze Pack", img: "304.png", color: "from-cyan-900/40" },
                      { amount: 100, coins: 30, name: "Silver Pack", img: "305.png", color: "from-[#7A5CFF]/10" },
                      { amount: 250, coins: 75, name: "Gold Pack", img: "306.png", color: "from-[#FF2D95]/10" },
                      { amount: 500, coins: 200, name: "Platinum Pack", img: "307.png", color: "from-emerald-950/20" },
                      { amount: 1000, coins: 500, name: "Ultimate Pack", img: "308.png", color: "from-[#FF355E]/10" },
                      { amount: 2500, coins: 999999, name: "Infinite Pack", img: "309.png", color: "from-[#F8C84A]/10" }
                    ].map((plan, index) => (
                      <div 
                        key={index}
                        className={`bg-slate-950/90 border border-slate-900 hover:border-[#7A5CFF]/60 rounded-2xl overflow-hidden flex flex-col items-center justify-between transition group`}
                      >
                        {/* Premium Visual Indicator */}
                        <div className="p-4 flex-1 flex flex-col items-center justify-center gap-1">
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition duration-300">
                            <Coins className={`w-5 h-5 ${
                              plan.amount >= 1000 ? "text-[#FF355E] animate-pulse" :
                              plan.amount >= 250 ? "text-[#FF2D95]" : "text-[#00C8FF]"
                            }`} />
                          </div>
                          <span className="text-[9px] font-display font-black text-slate-300 tracking-wide mt-1">
                            {plan.coins > 99999 ? "∞ Coins" : `+${plan.coins}`}
                          </span>
                        </div>

                        {/* Order button */}
                        <button 
                          onClick={() => handleSelectPlan(plan.amount, plan.coins, plan.img)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-[10px] font-display font-black text-white text-center border-t border-slate-800 hover:text-[#00C8FF] transition"
                        >
                          ₹{plan.amount}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENT SCREEN */}
              {activeTab === "payment" && selectedPlan && (
                <div className="space-y-4">
                  {/* Selected Plan Details */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-[#7A5CFF] block font-display font-bold uppercase">SELECTED RECHARGE</span>
                      <span className="text-xl font-display font-black text-white">
                        ₹{selectedPlan.amount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#00C8FF] bg-[#00C8FF]/10 border border-[#00C8FF]/30 px-3 py-1.5 rounded-full">
                      <Coins className="w-3.5 h-3.5 animate-spin" />
                      <span className="font-display font-black">+{selectedPlan.coins > 99999 ? "∞" : selectedPlan.coins} Coins</span>
                    </div>
                  </div>

                  {!activeTxn ? (
                    <div className="space-y-4">
                      {/* Interactive Holographic Scanner Vector */}
                      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 text-center flex flex-col items-center relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF2D95]/40 to-transparent" />
                        <span className="text-[9px] tracking-widest text-slate-400 font-display font-bold block mb-3">
                          OFFICIAL SCANNER DECK
                        </span>
                        
                        {/* 100% Vector geometric scanner graphic with real custom qr.png image overlay */}
                        <div className="w-32 h-32 bg-white p-1 rounded-2xl border-2 border-[#00C8FF] relative flex items-center justify-center shadow-[0_0_20px_rgba(0,200,255,0.2)] overflow-hidden">
                          <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#FF2D95] z-10" />
                          <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#FF2D95] z-10" />
                          <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#FF2D95] z-10" />
                          <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#FF2D95] z-10" />
                          
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=perfect.k@ptyes&pn=Wingo%20Predictor&am=${selectedPlan.amount}&cu=INR`)}`}
                            alt="Payment QR" 
                            className="w-full h-full object-contain relative z-0 p-1 bg-white" 
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Pulsing scanning bar line */}
                          <div className="absolute left-1 right-1 h-[2px] bg-[#00C8FF] shadow-[0_0_8px_#00C8FF] animate-bounce z-10 top-1/2" />
                        </div>

                        {/* UPI Copy Box */}
                        <div className="mt-4 w-full flex items-center justify-between bg-black/60 border border-slate-900 rounded-xl py-2 px-3 text-[10px]">
                          <span className="text-slate-400 font-mono font-bold">perfect.k@ptyes</span>
                          <button 
                            onClick={() => {
                              playClickSound();
                              navigator.clipboard.writeText("perfect.k@ptyes");
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                            }}
                            className="text-[#00C8FF] font-display font-bold hover:underline"
                          >
                            {copiedUpi ? "COPIED" : "COPY ID"}
                          </button>
                        </div>
                      </div>

                      {/* Manual submission */}
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className="text-[9px] text-[#7A5CFF] font-display font-black block uppercase tracking-widest">
                            SUBMIT 12-DIGIT UPI UTR / TRANSACTION ID
                          </span>
                        </div>
                        <div className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 flex items-center justify-between">
                          <input 
                            type="text" 
                            placeholder="Enter 12-Digit UTR ID"
                            value={utrInput}
                            onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ""))}
                            maxLength={12}
                            className="flex-1 bg-transparent border-none outline-none text-white text-xs font-mono font-bold py-1 placeholder:text-slate-700"
                          />
                          <Lock className="w-4 h-4 text-slate-600" />
                        </div>
                        
                        <button
                          onClick={handleSubmitPayment}
                          disabled={submittingPayment || utrInput.trim().length < 6}
                          className="w-full py-4 bg-gradient-to-r from-[#FF2D95] via-[#7A5CFF] to-[#00C8FF] text-xs font-display font-black text-white text-center rounded-xl hover:shadow-[0_0_15px_rgba(0,200,255,0.3)] transition active:scale-95 disabled:opacity-40"
                        >
                          {submittingPayment ? "SUBMITTING..." : "SUBMIT PAYMENT SECURELY"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* PENDING APPROVAL SUBMITTED VIEW */
                    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-[#FF355E]/10 border border-[#FF355E]/30 flex items-center justify-center mx-auto animate-pulse">
                        <Clock className="w-6 h-6 text-[#FF355E]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-display font-black text-[#FF355E] tracking-widest uppercase">
                          APPROVAL PENDING
                        </h4>
                        <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                          TXN ID: {activeTxn.id}
                        </span>
                      </div>
                      
                      {/* Pending status message */}
                      <div className="bg-black/60 border border-slate-900 rounded-xl p-4 text-xs font-display">
                        {activeTxn.status === "pending" && (
                          <div className="flex items-center justify-center gap-2 text-[#F8C84A]">
                            <RefreshCw className="w-4 h-4 animate-spin text-[#F8C84A]" />
                            <span className="tracking-wide">WAITING ON SECURE APPROVAL</span>
                          </div>
                        )}
                        {activeTxn.status === "approved" && (
                          <div className="flex items-center justify-center gap-2 text-[#10B981] font-black">
                            <CheckCircle className="w-4 h-4 text-[#10B981]" />
                            <span>COINS CREDITED SUCCESS!</span>
                          </div>
                        )}
                        {activeTxn.status === "rejected" && (
                          <div className="flex items-center justify-center gap-2 text-[#FF355E] font-black">
                            <AlertCircle className="w-4 h-4 text-[#FF355E]" />
                            <span>TRANSACTION REJECTED</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[9px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Secure database validation usually takes up to 60 seconds. You can instantly approve this yourself by shifting to the <span className="text-[#00C8FF] font-bold">ADMIN DECK</span> tab!
                      </div>

                      {activeTxn.status === "approved" ? (
                        <button
                          onClick={() => {
                            playClickSound();
                            setActiveTab("predictor");
                          }}
                          className="w-full py-3 bg-[#10B981] text-xs font-display font-black text-white rounded-xl transition hover:brightness-110"
                        >
                          PROCEED TO PREDICTOR
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            playClickSound();
                            setActiveTab("store");
                          }}
                          className="w-full py-3 bg-slate-900 text-xs font-display font-black text-slate-400 rounded-xl transition hover:text-white"
                        >
                          CHOOSE ANOTHER PLAN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ADMIN PANEL (Matches screenshot perfectly) */}
              {activeTab === "admin" && (currentUser?.isAdmin || isSessionAdmin) && (
                <div className="space-y-4">
                  {/* Symmetrical Grid Header with Left Card and Right Card */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* LEFT CARD: RECHARGE REQUESTS DECK */}
                    <div className="bg-slate-950 border border-[#FF2D95]/30 rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
                      {/* subtle laser lines */}
                      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF2D95]/40 to-transparent" />
                      <div>
                        <span className="text-[7px] font-display font-black text-slate-400 block tracking-wider uppercase">
                          RECHARGE REQUESTS
                        </span>
                        <span className="text-[9px] font-display font-black text-[#FF2D95] block tracking-widest mt-0.5">
                          DECK
                        </span>
                        
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-display font-black text-white drop-shadow-[0_0_10px_rgba(255,45,149,0.5)]">
                            {formattedPendingCount}
                          </span>
                          <span className="text-[7px] font-display font-black text-slate-500 uppercase">PENDING</span>
                        </div>
                      </div>

                      {/* Circular holographic document icon */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF2D95]/10 to-[#00C8FF]/10 border border-[#FF2D95]/40 flex items-center justify-center relative shadow-[0_0_10px_rgba(255,45,149,0.2)]">
                        <FileText className="w-4 h-4 text-[#FF2D95]" />
                        <div className="absolute inset-0.5 rounded-full border border-dashed border-[#00C8FF]/20 animate-spin [animation-duration:8s]" />
                      </div>
                    </div>

                    {/* RIGHT CARD: ADMIN PRIVILEGES */}
                    <div className="bg-slate-950 border border-[#00C8FF]/20 rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* radar circular scanning effect */}
                        <div className="absolute w-24 h-24 -right-6 -bottom-6 rounded-full border border-dashed border-[#00C8FF]/20 animate-spin [animation-duration:15s]" />
                        <div className="absolute w-24 h-24 -right-6 -bottom-6 rounded-full bg-gradient-to-tr from-[#00C8FF]/5 to-transparent origin-center animate-spin [animation-duration:4s]" />
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-1.5 text-[7px] font-display font-black text-slate-400 uppercase tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-[#FF2D95]" />
                          <span>ADMIN PRIVILEGES</span>
                        </div>
                        <span className="text-[9px] font-display font-black text-[#10B981] block tracking-widest mt-4">
                          FULL ACCESS GRANTED
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* CENTER PANEL: HOLOGRAM DATA MATRIX OR REQUESTS LIST */}
                  <div className="relative bg-black/80 rounded-2xl border border-slate-900 min-h-[190px] p-4 flex flex-col">
                    
                    {/* Background visual elements: Holographic rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="absolute w-36 h-36 border border-dashed border-[#00C8FF]/20 rounded-full animate-spin [animation-duration:20s]" />
                      <div className="absolute w-28 h-28 border border-[#7A5CFF]/15 rounded-full animate-spin [animation-duration:10s] [animation-direction:reverse]" />
                      {/* Energy Grid Floor Ring */}
                      <div className="absolute w-44 h-12 border-2 border-[#00C8FF]/30 rounded-full transform rotateX(65deg) translate-y-12 shadow-[0_0_20px_rgba(0,200,255,0.4)]" />
                    </div>

                    {allTransactions.length === 0 ? (
                      /* NO TRANSACTIONS YET - SHOW CYBER SERVER CUBE */
                      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 py-6">
                        {/* 3D Rotating Server Cube */}
                        <div className="hologram-cube-wrapper w-16 h-16 mb-4 flex items-center justify-center">
                          <div className="hologram-cube">
                            <div className="cube-face cube-face-front" />
                            <div className="cube-face cube-face-back" />
                            <div className="cube-face cube-face-left" />
                            <div className="cube-face cube-face-right" />
                            <div className="cube-face cube-face-top" />
                            <div className="cube-face cube-face-bottom" />
                          </div>
                        </div>

                        <span className="text-[10px] font-display font-black text-white tracking-widest uppercase block">
                          NO TRANSACTIONS YET
                        </span>
                        <span className="text-[8px] text-slate-500 font-display font-bold uppercase tracking-wider mt-1 block">
                          Submitted requests will appear here
                        </span>
                      </div>
                    ) : (
                      /* LIST OF TRANSACTIONS FOR IMMEDIATE APPROVALS */
                      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[190px] relative z-10 pr-1">
                        <div className="text-[8px] font-display font-black text-[#7A5CFF] tracking-widest uppercase mb-1">
                          LIVE TRANSACTION QUEUE
                        </div>
                        {allTransactions.map((txn) => (
                          <div 
                            key={txn.id} 
                            className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between text-[8px] font-display font-black tracking-wider">
                              <span className="text-[#00C8FF] uppercase">
                                {txn.username}
                              </span>
                              <span className={`px-2 py-0.5 rounded ${
                                txn.status === "approved" ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30" :
                                txn.status === "rejected" ? "bg-[#FF355E]/15 text-[#FF355E] border border-[#FF355E]/30" :
                                "bg-[#F8C84A]/15 text-[#F8C84A] border border-[#F8C84A]/30 animate-pulse"
                              }`}>
                                {txn.status.toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[9px] bg-[#070A12] p-2 rounded-lg border border-slate-900 font-mono">
                              <div>
                                <span className="text-slate-500 text-[7px] block uppercase font-display font-bold">UTR NO</span>
                                <span className="text-slate-300 font-bold">{txn.utr}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500 text-[7px] block uppercase font-display font-bold">AMOUNT</span>
                                <span className="text-[#F8C84A] font-bold">₹{txn.amount} ({txn.coins > 99999 ? "∞" : txn.coins} C)</span>
                              </div>
                            </div>

                            {txn.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveTransaction(txn.id)}
                                  className="flex-1 py-1.5 bg-[#10B981]/80 hover:bg-[#10B981] text-[9px] font-display font-black text-white rounded-lg transition active:scale-95"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => handleRejectTransaction(txn.id)}
                                  className="flex-1 py-1.5 bg-[#FF355E]/80 hover:bg-[#FF355E] text-[9px] font-display font-black text-white rounded-lg transition active:scale-95"
                                >
                                  REJECT
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* BOTTOM FOUR FEATURE CARDS */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: <Zap className="w-4 h-4 text-[#00C8FF]" />, title: "REAL TIME", sub: "SYNC", glow: "hover:shadow-[0_0_12px_rgba(0,200,255,0.3)] hover:border-[#00C8FF]/40" },
                      { icon: <Shield className="w-4 h-4 text-[#7A5CFF]" />, title: "100%", sub: "SECURE", glow: "hover:shadow-[0_0_12px_rgba(122,92,255,0.3)] hover:border-[#7A5CFF]/40" },
                      { icon: <Sparkles className="w-4 h-4 text-[#FF2D95]" />, title: "ULTRA", sub: "FAST", glow: "hover:shadow-[0_0_12px_rgba(255,45,149,0.3)] hover:border-[#FF2D95]/40" },
                      { icon: <Lock className="w-4 h-4 text-[#FF355E]" />, title: "ENCRYPTED", sub: "DATA", glow: "hover:shadow-[0_0_12px_rgba(255,53,94,0.3)] hover:border-[#FF355E]/40" }
                    ].map((feat, i) => (
                      <div 
                        key={i}
                        className={`bg-slate-950/80 border border-slate-900 rounded-xl p-2 text-center flex flex-col items-center justify-center transition duration-300 ${feat.glow}`}
                      >
                        {feat.icon}
                        <span className="text-[7px] font-display font-black text-white block mt-1 tracking-wide leading-none">{feat.title}</span>
                        <span className="text-[6px] font-display text-slate-500 block tracking-wider leading-none mt-0.5">{feat.sub}</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

            {/* BOTTOM BAR WATERMARK BRANDING */}
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-900 text-center text-[8px] text-slate-500 font-display flex items-center justify-center gap-1.5 flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#00C8FF] animate-pulse" />
              <span className="tracking-widest uppercase">POWERED BY SECURE WINGO NEURAL GRID</span>
            </div>

            {/* PASSWORD LOGIN LAUNCHER BUTTON (Gigantic Crimson bottom bar button) */}
            <div className="px-5 pb-5 pt-1 flex-shrink-0">
              <button 
                onClick={() => {
                  playClickSound();
                  onLogout();
                }}
                className="w-full h-12 bg-gradient-to-r from-[#FF355E] via-[#FF2D95] to-[#7A5CFF] rounded-2xl flex items-center justify-between px-4 relative overflow-hidden group shadow-[0_0_20px_rgba(255,53,94,0.4)] hover:brightness-110 active:scale-[0.98] transition border border-[#FF355E]/50"
              >
                {/* Diagonal hazard stripes on the right */}
                <div className="absolute right-0 top-0 bottom-0 w-24 opacity-20 pointer-events-none bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff)] bg-[size:15px_15px]" />
                
                <div className="flex items-center gap-2.5 relative z-10">
                  <Lock className="w-4 h-4 text-white group-hover:rotate-12 transition duration-300" />
                  <span className="text-xs font-display font-black tracking-widest text-white uppercase">
                    PASSWORD LOGIN
                  </span>
                </div>

                <span className="text-[8px] font-display font-bold tracking-widest text-white/70 relative z-10 bg-black/30 px-2.5 py-1 rounded-full uppercase">
                  EXIT TO SYSTEM
                </span>
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. PREMIUM OUTCOME DIALOG OVERLAY POPUPS (Victory, Defeat, Jackpot) */}
      <AnimatePresence>
        {popupState?.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none"
          >
            {popupState.type === "jackpot" && (
              /* A. JACKPOT PREMIUM GRAND POPUP */
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                className="w-full max-w-sm bg-gradient-to-b from-[#F8C84A]/25 via-[#1A1405] to-[#070A12] border-2 border-[#F8C84A] rounded-3xl p-6 text-center shadow-[0_0_100px_rgba(248,200,74,0.8)] relative overflow-hidden"
              >
                {/* Rotating luxury sunburst bg rays */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(248,200,74,0.2)_0%,transparent_60%)] pointer-events-none" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-x-0 top-[-50%] aspect-square bg-[radial-gradient(ellipse_at_center,rgba(248,200,74,0.06)_10%,transparent_70%)] pointer-events-none"
                />
                
                {/* Diagonal glowing golden lines */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#F8C84A]/5 to-transparent animate-pulse pointer-events-none" />

                {/* Top luxury line */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-[#F8C84A] to-transparent" />
                
                {/* Pulsing crown/sparkle jackpot logo container */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {/* Outer pulsating glowing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#F8C84A] opacity-50 animate-ping" />
                  {/* Inner golden ring with crown */}
                  <div className="absolute inset-1.5 rounded-full bg-gradient-to-b from-[#F8C84A] to-amber-600 border border-amber-300 flex items-center justify-center shadow-[0_0_20px_rgba(248,200,74,0.5)]">
                    <Crown className="w-9 h-9 text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                  </div>
                  {/* Sparkles on the sides */}
                  <div className="absolute -top-1 -right-1 animate-pulse">
                    <Sparkles className="w-5 h-5 text-[#F8C84A]" />
                  </div>
                  <div className="absolute -bottom-1 -left-1 animate-pulse delay-75">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                </div>

                <h2 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-[#F8C84A] to-amber-500 tracking-widest drop-shadow-[0_0_15px_rgba(248,200,74,0.6)] uppercase">
                  GRAND JACKPOT!
                </h2>
                
                <p className="text-[10px] text-amber-200 mt-2 font-display uppercase tracking-[2px] font-bold">
                  PERIOD: {popupState.period}
                </p>

                {/* Details container */}
                <div className="grid grid-cols-2 gap-3 mt-4 bg-black/80 border border-[#F8C84A]/30 rounded-2xl p-4 relative z-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <div className="text-left">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">PREDICTED DETAILS</span>
                    <span className="text-xs font-display font-black text-amber-200">
                      {popupState.predictionSize || popupState.predictionColor}
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">WINNING NUMBER</span>
                    <span className="text-xl font-display font-black text-[#F8C84A] drop-shadow-[0_0_8px_rgba(248,200,74,0.8)] animate-pulse">
                      {popupState.actualNumber}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3 relative z-10">
                  <span className="text-[11px] text-[#F8C84A] font-display font-black block animate-pulse uppercase tracking-widest bg-amber-500/10 py-1.5 px-3 rounded-full border border-amber-500/20">
                    👑 EXACT NUMBER JACKPOT MATCHED!
                  </span>
                  
                  <button
                    onClick={() => {
                      playClickSound();
                      setPopupState(null);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-[#F8C84A] via-amber-500 to-yellow-600 rounded-xl text-xs font-display font-black text-black hover:brightness-110 shadow-[0_0_25px_rgba(248,200,74,0.4)] active:scale-95 transition cursor-pointer hover:scale-[1.02]"
                  >
                    CLAIM GRAND REWARDS
                  </button>
                </div>
              </motion.div>
            )}

            {popupState.type === "victory" && (
              /* B. STANDARD VICTORY POPUP */
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                className="w-full max-w-sm bg-gradient-to-b from-[#10B981]/20 to-[#070A12] border-2 border-[#10B981] rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(16,185,129,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent" />
                <div className="w-14 h-14 rounded-full bg-[#10B981]/10 border-2 border-[#10B981] flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="w-7 h-7 text-[#10B981]" />
                </div>

                <h2 className="text-xl font-display font-black text-[#10B981] tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                  VICTORY UNLOCKED
                </h2>
                
                <p className="text-[9px] text-slate-400 mt-2 font-display uppercase tracking-[2px]">
                  PERIOD: {popupState.period}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 bg-black/60 border border-[#10B981]/20 rounded-2xl p-4">
                  <div className="text-left">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">PREDICTION</span>
                    <span className="text-xs font-display font-extrabold text-[#10B981]">
                      {popupState.predictionSize || popupState.predictionColor}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">RESULT NUMBER</span>
                    <span className="text-lg font-display font-black text-[#10B981]">
                      {popupState.actualNumber}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => {
                      playClickSound();
                      setPopupState(null);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-[#10B981] to-teal-600 rounded-xl text-xs font-display font-black text-white hover:brightness-110 active:scale-95 transition"
                  >
                    COLLECT COIN REWARDS
                  </button>
                </div>
              </motion.div>
            )}

            {popupState.type === "defeat" && (
              /* C. DEFEAT POPUP (RED BACKGROUND, PREMIUM REVERSAL LOCK INFO) */
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                className="w-full max-w-sm bg-gradient-to-b from-[#FF355E]/20 to-[#070A12] border-2 border-[#FF355E]/30 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(255,53,94,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF355E] to-transparent" />
                <div className="w-14 h-14 rounded-full bg-[#FF355E]/10 border-2 border-[#FF355E]/30 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-[#FF355E] animate-pulse" />
                </div>

                <h2 className="text-lg font-display font-black text-slate-300 tracking-widest uppercase">
                  PATTERN DEFLECTION
                </h2>
                
                <p className="text-[9px] text-slate-500 mt-2 font-display uppercase tracking-[2px]">
                  PERIOD: {popupState.period}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 bg-black/60 border border-slate-900 rounded-2xl p-4">
                  <div className="text-left">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">PREDICTION</span>
                    <span className="text-xs font-display font-bold text-slate-400">
                      {popupState.predictionSize || popupState.predictionColor}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 block uppercase font-display font-bold">ACTUAL RESULT</span>
                    <span className="text-lg font-display font-black text-[#FF355E]">
                      {popupState.actualNumber}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <span className="text-[9px] text-[#00C8FF] font-display font-black block uppercase tracking-wider">
                    ⚡ ADAPTIVE NEURAL ALGORITHM LOCKING IN
                  </span>
                  
                  <button
                    onClick={() => {
                      playClickSound();
                      setPopupState(null);
                    }}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-xs font-display font-black text-slate-300 rounded-xl transition active:scale-95"
                  >
                    CONTINUE NEXT PATTERN
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. SECURE ADMIN PASSWORD PROMPT */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md select-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xs bg-[#070A12] border border-slate-800 rounded-2xl p-5 text-center shadow-[0_0_45px_rgba(255,45,149,0.25)] relative overflow-hidden"
            >
              {/* Subtle top glowing accent */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF2D95] to-transparent" />
              
              <div className="w-12 h-12 rounded-full bg-[#FF2D95]/10 border border-[#FF2D95]/30 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-[#FF2D95] animate-pulse" />
              </div>

              <h3 className="text-xs font-display font-black text-white tracking-widest uppercase">
                SECURE DECK ENTRY
              </h3>
              <p className="text-[8px] text-slate-500 font-display font-bold tracking-wider mt-1 uppercase">
                RESTRICTED ACCESS ONLY
              </p>

              {/* Password Input field */}
              <div className="mt-4 space-y-3">
                <div className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 flex items-center justify-between">
                  <input 
                    type="password" 
                    placeholder="ENTER DECK KEY"
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Trigger authentication on enter
                        playClickSound();
                        if (adminPasswordInput === "sky4567") {
                          setIsSessionAdmin(true);
                          setActiveTab("admin");
                          setShowPasswordPrompt(false);
                          setAdminPasswordInput("");
                          setPasswordError("");
                          playSuccessSound();
                        } else {
                          setPasswordError("ACCESS DENIED: INVALID KEY");
                          playLossSound();
                        }
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-white text-xs font-mono font-bold py-1 placeholder:text-slate-800 text-center tracking-widest uppercase"
                    autoFocus
                  />
                </div>

                {passwordError && (
                  <span className="text-[8px] font-display font-bold text-[#FF355E] block uppercase tracking-wider animate-shake">
                    {passwordError}
                  </span>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      playClickSound();
                      setShowPasswordPrompt(false);
                      setAdminPasswordInput("");
                      setPasswordError("");
                    }}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-[10px] font-display font-black text-slate-500 rounded-xl transition"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      if (adminPasswordInput === "sky4567") {
                        setIsSessionAdmin(true);
                        setActiveTab("admin");
                        setShowPasswordPrompt(false);
                        setAdminPasswordInput("");
                        setPasswordError("");
                        playSuccessSound();
                      } else {
                        setPasswordError("ACCESS DENIED: INVALID KEY");
                        playLossSound();
                      }
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-[#FF2D95] to-[#7A5CFF] text-[10px] font-display font-black text-white rounded-xl transition hover:brightness-110 active:scale-95"
                  >
                    ACCESS
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
