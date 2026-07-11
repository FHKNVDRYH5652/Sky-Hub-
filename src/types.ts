export interface User {
  uid: string;
  username: string;
  coins: number;
  isAdmin: boolean;
}

export interface WingoRecord {
  period: string;
  number: number;
  size: "BIG" | "SMALL";
  color: string;
  timestamp?: number;
}

export interface Prediction {
  period: string;
  size?: "BIG" | "SMALL" | null;
  color?: "RED" | "GREEN" | null;
  numbers: number[];
  status: "pending" | "resolved";
  outcome: "win" | "loss" | "jackpot" | null;
  actualNumber?: number;
  confidence: number;
  predictionType?: "size" | "color";
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  utr: string;
  amount: number;
  coins: number;
  planImg: string;
  status: "pending" | "approved" | "rejected";
  coinsCredited: boolean;
  timestamp: number;
}
