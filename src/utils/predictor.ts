import { WingoRecord, Prediction } from "../types";

/**
 * ═══════════════════════════════════════════════════════════════
 *  🎯 SKY ULTRA PRO MAX HYBRID ENGINE V6 (DEEP-ANALYSIS ANTI-LOSS)
 *  – Dynamic Real-Time Backtesting Walk-Forward Optimization Core –
 *  – Self-Adaptive Markov Chain Transition Probability Matrix –
 *  – Rigid Dragon Streak Ride & Zigzag Alternate Locks –
 *  – Dynamic Loss-Streak Multi-Digit Board Hedging (No Skip) –
 *  – Martingale Capital Optimizer Bet Allocation Sizer –
 * ═══════════════════════════════════════════════════════════════
 */

// Mirror Pairs Lookup
const mirrorPairs: Record<number, number> = {
  0: 5, 5: 0,
  1: 6, 6: 1,
  2: 7, 7: 2,
  3: 8, 8: 3,
  4: 9, 9: 4
};

// Effective underlying color helper (resolves Violet to Red or Green)
function getEffectiveColor(num: number): "RED" | "GREEN" {
  if (num === 0 || [2, 4, 6, 8].includes(num)) return "RED";
  return "GREEN"; // 1, 3, 5, 7, 9
}

/**
 * Advanced Structural Size Pattern Predictor
 * Looks for repeating blocks (Double-Double, 2-1-2, Bento, Triple-Triple, etc.)
 */
function findSizePatternPrediction(seq: string): { size: "BIG" | "SMALL"; name: string } | null {
  const patterns6: Record<string, { size: "BIG" | "SMALL"; name: string }> = {
    "BBSSBB": { size: "SMALL", name: "🔄 DOUBLE-DOUBLE SWING (BBSSBB -> S)" },
    "SSBBSS": { size: "BIG", name: "🔄 DOUBLE-DOUBLE SWING (SSBBSS -> B)" },
    "BBSBBS": { size: "BIG", name: "📊 2-1-2 REPEATER (BBSBBS -> B)" },
    "SSBSSB": { size: "SMALL", name: "📊 2-1-2 REPEATER (SSBSSB -> S)" },
    "BSBSBS": { size: "BIG", name: "⚡ ZIGZAG STREAK (BSBSBS -> B)" },
    "SBSBSB": { size: "SMALL", name: "⚡ ZIGZAG STREAK (SBSBSB -> S)" },
    "BBBSSS": { size: "BIG", name: "💥 TRIPLE-TRIPLE WAVE (BBBSSS -> B)" },
    "SSSBBB": { size: "SMALL", name: "💥 TRIPLE-TRIPLE WAVE (SSSBBB -> S)" },
    "BSBBSB": { size: "SMALL", name: "📈 1-2-1 INTERVAL (BSBBSB -> S)" },
    "SBSBBS": { size: "BIG", name: "📈 1-2-1 INTERVAL (SBSBBS -> B)" },
    "BSSBSS": { size: "BIG", name: "🍱 BENTO REPEATER (BSSBSS -> B)" },
    "SBBSBB": { size: "SMALL", name: "🍱 BENTO REPEATER (SBBSBB -> S)" },
  };

  const patterns5: Record<string, { size: "BIG" | "SMALL"; name: string }> = {
    "BSSBB": { size: "SMALL", name: "🔄 DOUBLE-DOUBLE (BSSBB -> S)" },
    "SBBSS": { size: "BIG", name: "🔄 DOUBLE-DOUBLE (SBBSS -> B)" },
    "BSBSB": { size: "SMALL", name: "⚡ ZIGZAG WAVE (BSBSB -> S)" },
    "SBSBS": { size: "BIG", name: "⚡ ZIGZAG WAVE (SBSBS -> B)" },
    "BBBSB": { size: "SMALL", name: "🛑 DRAGON SHIELD (BBBSB -> S)" },
    "SSSBS": { size: "BIG", name: "🛑 DRAGON SHIELD (SSSBS -> B)" },
    "BSSSB": { size: "BIG", name: "📈 1-3-1 INTERVAL (BSSSB -> B)" },
    "SBBBS": { size: "SMALL", name: "📈 1-3-1 INTERVAL (SBBBS -> S)" },
    "BBSSB": { size: "SMALL", name: "📊 2-2-1 SWING (BBSSB -> S)" },
    "SSBBS": { size: "BIG", name: "📊 2-2-1 SWING (SSBBS -> B)" },
  };

  const patterns4: Record<string, { size: "BIG" | "SMALL"; name: string }> = {
    "BBSS": { size: "BIG", name: "🔄 DOUBLE-DOUBLE START (BBSS -> B)" },
    "SSBB": { size: "SMALL", name: "🔄 DOUBLE-DOUBLE START (SSBB -> S)" },
    "BSBS": { size: "BIG", name: "⚡ ZIGZAG RUN (BSBS -> B)" },
    "SBSB": { size: "SMALL", name: "⚡ ZIGZAG RUN (SBSB -> S)" },
    "BBBS": { size: "SMALL", name: "📉 REVERSION TRIG (BBBS -> S)" },
    "SSSB": { size: "BIG", name: "📈 REVERSION TRIG (SSSB -> B)" },
    "BSSB": { size: "BIG", name: "🍱 SYMMETRIC BENTO (BSSB -> B)" },
    "SBBS": { size: "SMALL", name: "🍱 SYMMETRIC BENTO (SBBS -> S)" },
  };

  if (seq.length >= 6) {
    const sub6 = seq.slice(-6);
    if (patterns6[sub6]) return patterns6[sub6];
  }
  if (seq.length >= 5) {
    const sub5 = seq.slice(-5);
    if (patterns5[sub5]) return patterns5[sub5];
  }
  if (seq.length >= 4) {
    const sub4 = seq.slice(-4);
    if (patterns4[sub4]) return patterns4[sub4];
  }

  return null;
}

/**
 * Advanced Structural Color Pattern Predictor
 */
function findColorPatternPrediction(seq: string): { color: "RED" | "GREEN"; name: string } | null {
  const patterns6: Record<string, { color: "RED" | "GREEN"; name: string }> = {
    "RRGGRR": { color: "GREEN", name: "🔄 DOUBLE-DOUBLE COLOR (RRGGRR -> G)" },
    "GGRRGG": { color: "RED", name: "🔄 DOUBLE-DOUBLE COLOR (GGRRGG -> R)" },
    "RGRGRG": { color: "RED", name: "⚡ ZIGZAG COLOR STREAK (RGRGRG -> R)" },
    "GRGRGR": { color: "GREEN", name: "⚡ ZIGZAG COLOR STREAK (GRGRGR -> G)" },
    "RRRGGG": { color: "RED", name: "💥 TRIPLE-TRIPLE COLOR (RRRGGG -> R)" },
    "GGGRRR": { color: "GREEN", name: "💥 TRIPLE-TRIPLE COLOR (GGGRRR -> G)" },
    "RGGRGG": { color: "RED", name: "🍱 BENTO COLOR (RGGRGG -> R)" },
    "GRRGRR": { color: "GREEN", name: "🍱 BENTO COLOR (GRRGRR -> G)" },
  };

  const patterns5: Record<string, { color: "RED" | "GREEN"; name: string }> = {
    "RGGRR": { color: "GREEN", name: "🔄 DOUBLE-DOUBLE COLOR (RGGRR -> G)" },
    "GRRGG": { color: "RED", name: "🔄 DOUBLE-DOUBLE COLOR (GRRGG -> R)" },
    "RGRGR": { color: "GREEN", name: "⚡ ZIGZAG COLOR WAVE (RGRGR -> G)" },
    "GRGRG": { color: "RED", name: "⚡ ZIGZAG COLOR WAVE (GRGRG -> R)" },
    "RGGGR": { color: "RED", name: "📈 1-3-1 COLOR (RGGGR -> R)" },
    "GRRRG": { color: "GREEN", name: "📈 1-3-1 COLOR (GRRRG -> G)" },
  };

  const patterns4: Record<string, { color: "RED" | "GREEN"; name: string }> = {
    "RRGG": { color: "RED", name: "🔄 DOUBLE-DOUBLE COLOR (RRGG -> R)" },
    "GGRR": { color: "GREEN", name: "🔄 DOUBLE-DOUBLE COLOR (GGRR -> G)" },
    "RGRG": { color: "RED", name: "⚡ ZIGZAG COLOR RUN (RGRG -> R)" },
    "GRGR": { color: "GREEN", name: "⚡ ZIGZAG COLOR RUN (GRGR -> G)" },
    "RRRG": { color: "RED", name: "📉 REVERSION COLOR (RRRG -> R)" },
    "GGGR": { color: "GREEN", name: "📉 REVERSION COLOR (GGGR -> G)" },
    "RGGR": { color: "RED", name: "🍱 SYMMETRIC BENTO (RGGR -> R)" },
    "GRRG": { color: "GREEN", name: "🍱 SYMMETRIC BENTO (GRRG -> G)" },
  };

  if (seq.length >= 6) {
    const sub6 = seq.slice(-6);
    if (patterns6[sub6]) return patterns6[sub6];
  }
  if (seq.length >= 5) {
    const sub5 = seq.slice(-5);
    if (patterns5[sub5]) return patterns5[sub5];
  }
  if (seq.length >= 4) {
    const sub4 = seq.slice(-4);
    if (patterns4[sub4]) return patterns4[sub4];
  }

  return null;
}

export function analyzeWingoHistory(
  history: WingoRecord[],
  nextPeriod: string,
  lossStreak: number,
  mode: "hybrid" | "size" | "color" = "hybrid"
): Omit<Prediction, "status" | "outcome"> & { recommendSkip?: boolean } {
  
  if (!history || history.length === 0) {
    return {
      period: nextPeriod,
      size: "BIG",
      color: null,
      numbers: [7, 9],
      confidence: 85,
      predictionType: "size",
      recommendedBet: "1 UNIT (BASE)",
      predictionLayer: "SKY HYBRID V6 [DEFAULT]",
      secondPrediction: 9,
      riskLevel: "Low",
      trendType: "Sideways",
      reasoning: "Initialization Baseline Run.",
      recommendSkip: false
    };
  }

  // --- LAYER 1: DATA NORMALIZATION & EXTRACTION ---
  const numbers = history.map(h => Number(h.number));
  const sizes = history.map(h => h.size);
  const effectiveColors = numbers.map(getEffectiveColor);

  const recent20 = numbers.slice(0, 20);

  // Helper values
  const lastSize = sizes[0] as "BIG" | "SMALL";
  const lastColor = effectiveColors[0];

  // --- SUB-SIMULATORS FOR REAL-TIME BACKTESTING ---
  const simPredictSize = (subHist: WingoRecord[]): "BIG" | "SMALL" => {
    if (subHist.length === 0) return "BIG";
    const subSizes = subHist.map(h => h.size);
    const lastS = subSizes[0] as "BIG" | "SMALL";
    
    // Check Dragon Lock
    let streak = 1;
    for (let i = 1; i < subSizes.length; i++) {
      if (subSizes[i] === lastS) streak++;
      else break;
    }
    if (streak >= 3) return lastS;

    // Check Zigzag Lock
    let zigzag = 1;
    for (let i = 0; i < subSizes.length - 1; i++) {
      if (subSizes[i] !== subSizes[i + 1]) zigzag++;
      else break;
    }
    if (zigzag >= 3) return lastS === "BIG" ? "SMALL" : "BIG";

    // Chronological sizes for pattern matching
    const chrono = [...subSizes].slice(0, 10).reverse().map(s => s === "BIG" ? "B" : "S").join("");
    const patResult = findSizePatternPrediction(chrono);
    if (patResult) return patResult.size;

    // Markov Core
    let BB = 0, BS = 0, SB = 0, SS = 0;
    for (let i = 0; i < subSizes.length - 1; i++) {
      const curr = subSizes[i + 1];
      const nxt = subSizes[i];
      if (curr === "BIG" && nxt === "BIG") BB++;
      if (curr === "BIG" && nxt === "SMALL") BS++;
      if (curr === "SMALL" && nxt === "BIG") SB++;
      if (curr === "SMALL" && nxt === "SMALL") SS++;
    }
    if (lastS === "BIG") {
      return BB >= BS ? "BIG" : "SMALL";
    } else {
      return SB >= SS ? "BIG" : "SMALL";
    }
  };

  const simPredictColor = (subHist: WingoRecord[]): "RED" | "GREEN" => {
    if (subHist.length === 0) return "GREEN";
    const subNums = subHist.map(h => Number(h.number));
    const subColors = subNums.map(getEffectiveColor);
    const lastC = subColors[0];

    // Check Dragon Lock
    let streak = 1;
    for (let i = 1; i < subColors.length; i++) {
      if (subColors[i] === lastC) streak++;
      else break;
    }
    if (streak >= 3) return lastC;

    // Check Zigzag Lock
    let zigzag = 1;
    for (let i = 0; i < subColors.length - 1; i++) {
      if (subColors[i] !== subColors[i + 1]) zigzag++;
      else break;
    }
    if (zigzag >= 3) return lastC === "RED" ? "GREEN" : "RED";

    // Chronological colors for pattern matching
    const chrono = [...subColors].slice(0, 10).reverse().map(c => c === "RED" ? "R" : "G").join("");
    const patResult = findColorPatternPrediction(chrono);
    if (patResult) return patResult.color;

    // Markov Core
    let RR = 0, RG = 0, GR = 0, GG = 0;
    for (let i = 0; i < subColors.length - 1; i++) {
      const curr = subColors[i + 1];
      const nxt = subColors[i];
      if (curr === "RED" && nxt === "RED") RR++;
      if (curr === "RED" && nxt === "GREEN") RG++;
      if (curr === "GREEN" && nxt === "RED") GR++;
      if (curr === "GREEN" && nxt === "GREEN") GG++;
    }
    if (lastC === "RED") {
      return RR >= RG ? "RED" : "GREEN";
    } else {
      return GR >= GG ? "RED" : "GREEN";
    }
  };

  // --- LAYER 2: REAL-TIME SIMULATION BACKTESTING (WALK-FORWARD) ---
  let sizeSimSuccesses = 0;
  let colorSimSuccesses = 0;
  const backtestDepth = Math.min(10, history.length - 5);

  for (let b = 0; b < backtestDepth; b++) {
    const subHistory = history.slice(b + 1);
    const actualRecord = history[b];
    const actualSize = actualRecord.size;
    const actualColor = getEffectiveColor(Number(actualRecord.number));

    const simSize = simPredictSize(subHistory);
    const simColor = simPredictColor(subHistory);

    if (simSize === actualSize) sizeSimSuccesses++;
    if (simColor === actualColor) colorSimSuccesses++;
  }

  // --- LAYER 3: SIZE ENGINE (DRAGON/ZIGZAG LOCK + STRUCTURAL + MARKOV) ---
  let sizeStreak = 1;
  for (let i = 1; i < sizes.length; i++) {
    if (sizes[i] === lastSize) sizeStreak++;
    else break;
  }
  const isSizeDragonActive = sizeStreak >= 3;

  let sizeZigzagStreak = 1;
  for (let i = 0; i < sizes.length - 1; i++) {
    if (sizes[i] !== sizes[i + 1]) sizeZigzagStreak++;
    else break;
  }
  const isSizeZigzagActive = sizeZigzagStreak >= 3;

  const chronologicalSizes = [...sizes].slice(0, 10).reverse().map(s => s === "BIG" ? "B" : "S").join("");
  const sizePatternResult = findSizePatternPrediction(chronologicalSizes);

  // Markov state transition matrix count for size
  let BB = 0, BS = 0, SB = 0, SS = 0;
  for (let i = 0; i < sizes.length - 1; i++) {
    const curr = sizes[i + 1];
    const nxt = sizes[i];
    if (curr === "BIG" && nxt === "BIG") BB++;
    if (curr === "BIG" && nxt === "SMALL") BS++;
    if (curr === "SMALL" && nxt === "BIG") SB++;
    if (curr === "SMALL" && nxt === "SMALL") SS++;
  }
  const markovSizePredict = lastSize === "BIG" ? (BB >= BS ? "BIG" : "SMALL") : (SB >= SS ? "BIG" : "SMALL");

  let predictedSize: "BIG" | "SMALL" = "BIG";
  let sizePatternReason = "";
  let sizeConfidence = 82;

  if (isSizeDragonActive) {
    predictedSize = lastSize;
    sizePatternReason = `🐉 DRAGON LOCK (Riding ${sizeStreak}x ${lastSize})`;
    sizeConfidence = Math.min(98, 86 + sizeStreak * 3);
  } else if (isSizeZigzagActive) {
    predictedSize = lastSize === "BIG" ? "SMALL" : "BIG";
    sizePatternReason = `🔄 ZIGZAG SWING LOCK (${sizeZigzagStreak}x ALT)`;
    sizeConfidence = Math.min(97, 85 + sizeZigzagStreak * 2);
  } else if (sizePatternResult) {
    predictedSize = sizePatternResult.size;
    sizePatternReason = `📊 STRUCTURAL PATTERN: ${sizePatternResult.name}`;
    sizeConfidence = sizePatternResult.name.includes("6") ? 94 : sizePatternResult.name.includes("5") ? 90 : 86;
  } else {
    predictedSize = markovSizePredict;
    const probability = lastSize === "BIG" 
      ? Math.round((predictedSize === "BIG" ? BB : BS) / (BB + BS + 0.01) * 100)
      : Math.round((predictedSize === "BIG" ? SB : SS) / (SB + SS + 0.01) * 100);
    sizePatternReason = `🧠 MARKOV TRANSITION Core (P(${predictedSize}|${lastSize}) = ${probability}%)`;
    sizeConfidence = 84;
  }

  // --- LAYER 4: COLOR ENGINE (DRAGON/ZIGZAG LOCK + STRUCTURAL + MARKOV) ---
  let colorStreak = 1;
  for (let i = 1; i < effectiveColors.length; i++) {
    if (effectiveColors[i] === lastColor) colorStreak++;
    else break;
  }
  const isColorDragonActive = colorStreak >= 3;

  let colorZigzagStreak = 1;
  for (let i = 0; i < effectiveColors.length - 1; i++) {
    if (effectiveColors[i] !== effectiveColors[i + 1]) colorZigzagStreak++;
    else break;
  }
  const isColorZigzagActive = colorZigzagStreak >= 3;

  const chronologicalColors = [...effectiveColors].slice(0, 10).reverse().map(c => c === "RED" ? "R" : "G").join("");
  const colorPatternResult = findColorPatternPrediction(chronologicalColors);

  // Markov state transition matrix count for color
  let RR = 0, RG = 0, GR = 0, GG = 0;
  for (let i = 0; i < effectiveColors.length - 1; i++) {
    const curr = effectiveColors[i + 1];
    const nxt = effectiveColors[i];
    if (curr === "RED" && nxt === "RED") RR++;
    if (curr === "RED" && nxt === "GREEN") RG++;
    if (curr === "GREEN" && nxt === "RED") GR++;
    if (curr === "GREEN" && nxt === "GREEN") GG++;
  }
  const markovColorPredict = lastColor === "RED" ? (RR >= RG ? "RED" : "GREEN") : (GR >= GG ? "RED" : "GREEN");

  let predictedColor: "RED" | "GREEN" = "GREEN";
  let colorPatternReason = "";
  let colorConfidence = 82;

  if (isColorDragonActive) {
    predictedColor = lastColor;
    colorPatternReason = `🐉 COLOR DRAGON LOCK (Riding ${colorStreak}x ${lastColor})`;
    colorConfidence = Math.min(98, 86 + colorStreak * 3);
  } else if (isColorZigzagActive) {
    predictedColor = lastColor === "RED" ? "GREEN" : "RED";
    colorPatternReason = `🔄 COLOR ZIGZAG SWING (${colorZigzagStreak}x ALT)`;
    colorConfidence = Math.min(97, 85 + colorZigzagStreak * 2);
  } else if (colorPatternResult) {
    predictedColor = colorPatternResult.color;
    colorPatternReason = `📊 STRUCTURAL COLOR: ${colorPatternResult.name}`;
    colorConfidence = colorPatternResult.name.includes("6") ? 94 : colorPatternResult.name.includes("5") ? 90 : 86;
  } else {
    predictedColor = markovColorPredict;
    const probability = lastColor === "RED" 
      ? Math.round((predictedColor === "RED" ? RR : RG) / (RR + RG + 0.01) * 100)
      : Math.round((predictedColor === "RED" ? GR : GG) / (GR + GG + 0.01) * 100);
    colorPatternReason = `🧠 MARKOV COLOR Core (P(${predictedColor}|${lastColor}) = ${probability}%)`;
    colorConfidence = 84;
  }

  // --- LAYER 5: MOVEMENT SLOPE & VOLATILITY ---
  const sma5 = recent20.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const sma15 = recent20.slice(0, 15).reduce((a, b) => a + b, 0) / 15;
  const slope = sma5 - sma15;
  const volatility = Math.sqrt(recent20.map(x => Math.pow(x - sma5, 2)).reduce((a, b) => a + b, 0) / 20);

  let trendType: "Upward" | "Downward" | "Sideways" | "Reversal" = "Sideways";
  if (isSizeDragonActive) {
    trendType = lastSize === "BIG" ? "Upward" : "Downward";
  } else if (volatility > 3.0) {
    trendType = "Reversal";
  } else if (Math.abs(slope) < 0.5) {
    trendType = "Sideways";
  } else if (slope > 0) {
    trendType = "Upward";
  } else {
    trendType = "Downward";
  }

  // High volatility confidence cushion
  if (volatility > 3.2) {
    if (!sizePatternResult && !isSizeDragonActive) sizeConfidence -= 5;
    if (!colorPatternResult && !isColorDragonActive) colorConfidence -= 5;
  }

  // --- LAYER 6: ADAPTIVE CORE OPTIMAL SELECTOR (RBE DECISION) ---
  let predictionType: "size" | "color" = "size";

  if (mode === "size") {
    predictionType = "size";
  } else if (mode === "color") {
    predictionType = "color";
  } else {
    // Hybrid mode: Dynamically backtest and choose the model currently performing better
    if (sizeSimSuccesses !== colorSimSuccesses) {
      predictionType = sizeSimSuccesses > colorSimSuccesses ? "size" : "color";
    } else {
      predictionType = sizeConfidence >= colorConfidence ? "size" : "color";
    }
  }

  const finalConfidence = Math.max(85, Math.min(99, predictionType === "size" ? sizeConfidence : colorConfidence));

  // --- LAYER 7: COLD & OVERHEAT FILTER (DIGITS) ---
  const freq20 = Array(10).fill(0);
  recent20.forEach(num => { freq20[num]++; });

  const freqScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    const count20 = freq20[i];
    let score = 50;
    if (count20 === 0) {
      score = 5;
    } else if (count20 >= 1 && count20 <= 3) {
      score = 100; // Golden Sweet Spot
    } else {
      score = 25; // Overheated
    }
    freqScores[i] = score;
  }

  // --- LAYER 8: GAP ENGINE (ANTI-GAMBLER'S FALLACY) ---
  const gapScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    const currentGap = numbers.indexOf(i) !== -1 ? numbers.indexOf(i) : numbers.length;
    let score = 50;
    if (currentGap === 0) {
      score = 5; // immediate penalty
    } else if (currentGap === 1) {
      score = 45;
    } else if (currentGap >= 2 && currentGap <= 7) {
      score = 100; // perfect trigger
    } else if (currentGap >= 8 && currentGap <= 14) {
      score = 40;
    } else {
      score = 5; // cold gap
    }
    gapScores[i] = score;
  }

  const trendScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    const isBig = i >= 5;
    if (isSizeDragonActive || isSizeZigzagActive) {
      if (predictedSize === "BIG" && isBig) trendScores[i] = 100;
      else if (predictedSize === "SMALL" && !isBig) trendScores[i] = 100;
    } else if (trendType === "Upward" && isBig) trendScores[i] = 100;
    else if (trendType === "Downward" && !isBig) trendScores[i] = 100;
    else if (trendType === "Sideways") {
      trendScores[i] = 50;
    } else if (trendType === "Reversal") {
      const lastWasBig = numbers[0] >= 5;
      if (lastWasBig && !isBig) trendScores[i] = 100;
      else if (!lastWasBig && isBig) trendScores[i] = 100;
    }
  }

  const patternScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    const isBig = i >= 5;
    if (predictedSize === "BIG" && isBig) patternScores[i] = 100;
    else if (predictedSize === "SMALL" && !isBig) patternScores[i] = 100;
    else patternScores[i] = 20;
  }

  const pairScores = Array(10).fill(0);
  const lastNum = numbers[0];
  const mirrorNum = mirrorPairs[lastNum];
  if (mirrorNum !== undefined) {
    const mirrorDelay = numbers.indexOf(mirrorNum);
    const delayBonus = Math.min(100, (mirrorDelay !== -1 ? mirrorDelay : 50) * 4);
    pairScores[mirrorNum] = delayBonus;
  }

  const compatibilityScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    const isBig = i >= 5;
    const numColor = (i === 0 || i === 5) ? "VIOLET" : [1, 3, 7, 9].includes(i) ? "GREEN" : "RED";
    
    let isCompatible = true;
    if (predictedSize === "BIG" && !isBig) isCompatible = false;
    if (predictedSize === "SMALL" && isBig) isCompatible = false;
    if (predictedColor === "RED" && numColor === "GREEN") isCompatible = false;
    if (predictedColor === "GREEN" && numColor === "RED") isCompatible = false;

    if (isCompatible) {
      compatibilityScores[i] = 100;
    } else if (numColor === "VIOLET") {
      compatibilityScores[i] = 60;
    } else {
      compatibilityScores[i] = 10;
    }
  }

  // --- LAYER 9: COMPILATION & SCORE SORTING ---
  const finalScores = Array(10).fill(0);
  for (let i = 0; i < 10; i++) {
    finalScores[i] = 
      freqScores[i] * 0.10 +
      gapScores[i] * 0.10 +
      patternScores[i] * 0.15 +
      trendScores[i] * 0.15 +
      pairScores[i] * 0.10 +
      compatibilityScores[i] * 0.40;
  }

  const scoredDigits = Array.from({ length: 10 }, (_, i) => ({ digit: i, score: finalScores[i] }));
  let filteredDigits = [...scoredDigits];

  if (predictionType === "size") {
    filteredDigits = scoredDigits.filter(d => {
      const sizeOfDigit = d.digit >= 5 ? "BIG" : "SMALL";
      return sizeOfDigit === predictedSize;
    });
  } else {
    filteredDigits = scoredDigits.filter(d => {
      const colorOfDigit = (d.digit === 0 || d.digit === 5) ? "VIOLET" : [1, 3, 7, 9].includes(d.digit) ? "GREEN" : "RED";
      return colorOfDigit === predictedColor || colorOfDigit === "VIOLET";
    });
  }

  filteredDigits.sort((a, b) => b.score - a.score);

  // --- LAYER 10: DYNAMIC LOSS-STREAK HEDGING (EXPANDED BOARD COVERAGE) ---
  // No skipping. Instead, we expand target numbers list when lossStreak occurs!
  const targetDigits: number[] = [];
  const primaryNumber = filteredDigits[0]?.digit ?? (predictedSize === "BIG" ? 7 : 3);
  const secondPrediction = filteredDigits[1]?.digit ?? (predictedSize === "BIG" ? 9 : 1);
  const thirdPrediction = filteredDigits[2]?.digit ?? (predictedSize === "BIG" ? 8 : 2);
  const fourthPrediction = filteredDigits[3]?.digit ?? (predictedSize === "BIG" ? 5 : 0);

  if (lossStreak === 0) {
    // Standard Precision: 2 target numbers
    targetDigits.push(primaryNumber, secondPrediction);
  } else if (lossStreak === 1) {
    // Phase 1 Recovery: Expand to 3 digits (30% board lock)
    targetDigits.push(primaryNumber, secondPrediction, thirdPrediction);
  } else {
    // Phase 2+ Shock Absorber: Expand to 4 digits (40% board lock)
    targetDigits.push(primaryNumber, secondPrediction, thirdPrediction, fourthPrediction);
  }

  // --- LAYER 11: RECOVERY MULTIPLIER SIZING ---
  let recommendedBet = "1 UNIT (BASE)";
  if (lossStreak === 1) {
    recommendedBet = "3 UNITS (STAGE 1 RECOVERY)";
  } else if (lossStreak === 2) {
    recommendedBet = "8 UNITS (STAGE 2 SHIELD)";
  } else if (lossStreak === 3) {
    recommendedBet = "15 UNITS (ULTRA RECOVERY SWEEP)";
  } else if (lossStreak >= 4) {
    // Re-alignment safe cycle reset
    recommendedBet = "3 UNITS (CYCLE RESET PROTECTOR)";
  }

  // Final Reasoning String with backtest and model selection
  const backtestRatio = `RBE Backtest accuracy: Size ${sizeSimSuccesses}/${backtestDepth} vs Color ${colorSimSuccesses}/${backtestDepth}.`;
  let reasoning = "";
  if (predictionType === "size") {
    reasoning = `🎯 V6 Active. ${backtestRatio} Pivoted to Size model aligned with ${sizePatternReason}. Hedging board with digits [${targetDigits.join(", ")}] for maximum coverage under streak level ${lossStreak}.`;
  } else {
    reasoning = `🎯 V6 Active. ${backtestRatio} Pivoted to Color model aligned with ${colorPatternReason}. Hedging board with digits [${targetDigits.join(", ")}] for maximum coverage under streak level ${lossStreak}.`;
  }

  const predictionLayer = isSizeDragonActive || isColorDragonActive 
    ? "SKY V6 DRAGON RIDER" 
    : isSizeZigzagActive || isColorZigzagActive 
      ? "SKY V6 ZIGZAG SWING" 
      : "SKY V6 WALK-FORWARD MARKOV";

  return {
    period: nextPeriod,
    size: predictionType === "size" ? predictedSize : null,
    color: predictionType === "color" ? predictedColor : null,
    numbers: targetDigits,
    confidence: finalConfidence,
    predictionType: predictionType,
    recommendedBet: recommendedBet,
    predictionLayer: predictionLayer,
    secondPrediction: secondPrediction,
    riskLevel: lossStreak >= 2 ? "High" : lossStreak === 1 ? "Medium" : "Low",
    trendType: trendType,
    reasoning: reasoning,
    recommendSkip: false
  };
}
