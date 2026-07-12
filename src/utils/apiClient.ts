import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs, 
  orderBy 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Transaction } from "../types";

interface ClientUser extends User {
  passwordHash?: string;
}

// Initialize client-side Firebase fallback
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Check if running on Netlify or other static hosts
const isStaticHost = 
  window.location.hostname.includes("netlify.app") || 
  window.location.hostname.includes("localhost") === false && 
  !window.location.hostname.includes("run.app") &&
  !window.location.hostname.includes("studio") &&
  !window.location.hostname.includes("preview");

// Deterministic seed-based random generator to sync Netlify clients
function seedRandom(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(Math.sin(hash) * 1000) % 1;
}

export const apiFetch = async (url: string, options?: RequestInit): Promise<any> => {
  const isGet = !options || !options.method || options.method.toUpperCase() === "GET";

  // If we are on a known server-hosting domain, try server-side API first
  if (!isStaticHost) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      console.warn("Server API failed, falling back to client-side database:", e);
    }
  }

  // --- CLIENT-SIDE FALLBACK IMPLEMENTATION FOR NETLIFY ---
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;

  // 1. Wingo History & Current Period
  if (path === "/api/wingo-history") {
    try {
      // Try to fetch external API directly (in case CORS is open)
      const targetUrl = "https://sky-predictor-1012593186417.asia-southeast1.run.app/api/wingo-history-100";
      const response = await fetch(targetUrl, { headers: { "Accept": "application/json" } });
      if (response.ok) {
        const rawData = await response.json();
        let records = [];
        if (Array.isArray(rawData)) {
          records = rawData;
        } else if (rawData && Array.isArray(rawData.data)) {
          records = rawData.data;
        } else if (rawData && rawData.data && Array.isArray(rawData.data.list)) {
          records = rawData.data.list;
        } else if (rawData && Array.isArray(rawData.list)) {
          records = rawData.list;
        }
        if (records.length > 0) {
          return { success: true, data: records };
        }
      }
    } catch (e) {
      console.warn("Direct Wingo history fetch failed, generating synchronized mock records:", e);
    }

    // Direct client fallback: Generate deterministic time-synced history
    const mockHistory = [];
    const now = Date.now();
    // 30 seconds interval is Wingo 30s
    const currentInterval = BigInt(Math.floor(now / 30000));
    
    for (let i = 0; i < 100; i++) {
      const periodVal = (currentInterval - BigInt(i)).toString();
      const seed = seedRandom(periodVal);
      const num = Math.floor(seed * 10);
      const size = num >= 5 ? "BIG" : "SMALL";
      const color = num === 0 ? "RED-VIOLET" : num === 5 ? "GREEN-VIOLET" : [1,3,7,9].includes(num) ? "GREEN" : "RED";
      
      mockHistory.push({
        period: periodVal,
        number: num,
        size,
        color,
        timestamp: now - i * 30000
      });
    }
    return { success: true, data: mockHistory, isFallback: true };
  }

  // 2. User Profile Fetch / Sync
  if (path === "/api/user/profile") {
    const uid = urlObj.searchParams.get("uid");
    if (!uid) return { success: false, message: "User ID is required" };
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      let userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        if (cleanUid.startsWith("guest_")) {
          const guestUser: ClientUser = {
            uid: cleanUid,
            username: "Guest User",
            passwordHash: "",
            coins: 0, 
            isAdmin: false
          };
          await setDoc(userRef, guestUser);
          userSnap = await getDoc(userRef);
        } else {
          return { success: false, message: "User not found" };
        }
      }

      const user = userSnap.data() as ClientUser;
      return {
        success: true,
        user: {
          uid: user.uid,
          username: user.username,
          coins: user.coins,
          isAdmin: user.isAdmin
        }
      };
    } catch (e: any) {
      console.error("Client profile fetch error:", e);
      return { success: false, message: "Profile fetch failed: " + e.message };
    }
  }

  // 3. User Register
  if (path === "/api/auth/register") {
    const { username, password } = JSON.parse(options?.body as string || "{}");
    if (!username || !password) {
      return { success: false, message: "Username and password are required" };
    }
    const cleanUsername = username.trim().toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { success: false, message: "Username already exists" };
      }

      const newUser: ClientUser = {
        uid: cleanUsername,
        username: username.trim(),
        passwordHash: password,
        coins: 0,
        isAdmin: false
      };
      await setDoc(userRef, newUser);
      return { success: true, message: "Registration successful" };
    } catch (e: any) {
      console.error("Client registration error:", e);
      return { success: false, message: "Registration failed: " + e.message };
    }
  }

  // 4. User Login
  if (path === "/api/auth/login") {
    const { username, password } = JSON.parse(options?.body as string || "{}");
    if (!username || !password) {
      return { success: false, message: "Username and password are required" };
    }
    const cleanUsername = username.trim().toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "User does not exist" };
      }

      const user = userSnap.data() as ClientUser;
      if (user.passwordHash !== password) {
        return { success: false, message: "Incorrect password" };
      }

      return {
        success: true,
        user: {
          uid: user.uid,
          username: user.username,
          coins: user.coins,
          isAdmin: user.isAdmin
        }
      };
    } catch (e: any) {
      console.error("Client login error:", e);
      return { success: false, message: "Login failed: " + e.message };
    }
  }

  // 5. Deduct Coin
  if (path === "/api/user/deduct-coin") {
    const { uid } = JSON.parse(options?.body as string || "{}");
    if (!uid) return { success: false, message: "User ID is required" };
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "User not found" };
      }

      const user = userSnap.data() as User;
      if (user.coins <= 0 && !user.isAdmin) {
        return { success: false, message: "Insufficient coins" };
      }

      let updatedCoins = user.coins;
      if (!user.isAdmin) {
        updatedCoins = user.coins - 1;
        await updateDoc(userRef, { coins: updatedCoins });
      }

      return {
        success: true,
        coins: updatedCoins
      };
    } catch (e: any) {
      console.error("Client deduct coin error:", e);
      return { success: false, message: "Coin deduction failed: " + e.message };
    }
  }

  // 6. Submit Payment Transaction
  if (path === "/api/payment/submit") {
    const { uid, utr, amount, coins, planImg } = JSON.parse(options?.body as string || "{}");
    if (!uid || !utr || !amount || !coins) {
      return { success: false, message: "Missing payment details" };
    }
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "User not found" };
      }

      const user = userSnap.data() as User;
      const txnId = "txn_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      const newTxn: Transaction = {
        id: txnId,
        userId: user.uid,
        username: user.username,
        utr,
        amount,
        coins,
        planImg: planImg || "306.png",
        status: "pending",
        coinsCredited: false,
        timestamp: Date.now()
      };
      
      await setDoc(doc(db, "transactions", txnId), newTxn);
      return { success: true, txnId, transaction: newTxn };
    } catch (e: any) {
      console.error("Client payment submission error:", e);
      return { success: false, message: "Payment submission failed: " + e.message };
    }
  }

  // 7. Get Payment Transaction Status
  if (path === "/api/payment/status") {
    const txnId = urlObj.searchParams.get("txnId");
    if (!txnId) return { success: false, message: "Transaction ID is required" };

    try {
      const txnRef = doc(db, "transactions", txnId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return { success: false, message: "Transaction not found" };
      }
      return { success: true, transaction: txnSnap.data() };
    } catch (e: any) {
      console.error("Client transaction status error:", e);
      return { success: false, message: "Failed to get status: " + e.message };
    }
  }

  // 8. Admin Get All Transactions
  if (path === "/api/admin/transactions") {
    try {
      const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => doc.data() as Transaction);
      return { success: true, transactions: list };
    } catch (e: any) {
      console.error("Client admin transactions error:", e);
      return { success: false, message: "Failed to get transactions: " + e.message };
    }
  }

  // 9. Admin Approve
  if (path === "/api/admin/approve") {
    const { txnId } = JSON.parse(options?.body as string || "{}");
    if (!txnId) return { success: false, message: "Transaction ID is required" };

    try {
      const txnRef = doc(db, "transactions", txnId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return { success: false, message: "Transaction not found" };
      }
      const txn = txnSnap.data() as Transaction;
      if (txn.status !== "pending") {
        return { success: false, message: "Transaction is already " + txn.status };
      }

      await updateDoc(txnRef, { status: "approved" });
      
      if (!txn.coinsCredited) {
        const userRef = doc(db, "users", txn.userId.toLowerCase());
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as User;
          const newCoins = user.coins + txn.coins;
          await updateDoc(userRef, { coins: newCoins });
          await updateDoc(txnRef, { coinsCredited: true });
          txn.coinsCredited = true;
        }
      }
      txn.status = "approved";
      return { success: true, message: "Transaction approved and coins credited", transaction: txn };
    } catch (e: any) {
      console.error("Client approve transaction error:", e);
      return { success: false, message: "Approval failed: " + e.message };
    }
  }

  // 10. Admin Reject
  if (path === "/api/admin/reject") {
    const { txnId } = JSON.parse(options?.body as string || "{}");
    if (!txnId) return { success: false, message: "Transaction ID is required" };

    try {
      const txnRef = doc(db, "transactions", txnId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return { success: false, message: "Transaction not found" };
      }
      await updateDoc(txnRef, { status: "rejected" });
      const txn = txnSnap.data() as Transaction;
      txn.status = "rejected";
      return { success: true, message: "Transaction rejected", transaction: txn };
    } catch (e: any) {
      console.error("Client reject transaction error:", e);
      return { success: false, message: "Rejection failed: " + e.message };
    }
  }

  return { success: false, message: "Unknown API endpoint called" };
};
