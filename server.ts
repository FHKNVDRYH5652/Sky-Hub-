import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
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

interface Transaction {
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

interface User {
  uid: string;
  username: string;
  passwordHash: string;
  coins: number;
  isAdmin: boolean;
}

// Read Firebase configuration dynamically
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  throw new Error(`Firebase config file not found at ${configPath}`);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Invalid Firebase configuration in firebase-applet-config.json");
}

// Initialize Firebase SDK on server-side (using API key and named database to bypass IAM restrictions)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Seed starting admin and demo accounts in Firestore
async function seedDatabase() {
  try {
    const adminRef = doc(db, "users", "admin");
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: "admin",
        username: "admin",
        passwordHash: "admin123",
        coins: 999999,
        isAdmin: true
      });
      console.log("Admin seeded in Firestore successfully!");
    }

    const demoRef = doc(db, "users", "demo");
    const demoSnap = await getDoc(demoRef);
    if (!demoSnap.exists()) {
      await setDoc(demoRef, {
        uid: "demo",
        username: "demo",
        passwordHash: "demo123",
        coins: 0,
        isAdmin: false
      });
      console.log("Demo user seeded in Firestore successfully!");
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}

async function startServer() {
  // Run seeding
  await seedDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- INTEGRITY DOMAIN FILTER MIDDLEWARE ---
  app.use((req, res, next) => {
    const host = (req.headers.host || "").toLowerCase();
    const forwardedHost = (req.headers["x-forwarded-host"] as string || "").toLowerCase();
    
    const checkAllowed = (h: string) => {
      if (!h) return false;
      const cleanH = h.split(":")[0].trim();
      return (
        cleanH === "localhost" || 
        cleanH === "127.0.0.1" || 
        cleanH.endsWith(".run.app") || 
        cleanH.includes(".run.app") || 
        cleanH.includes("google.com") || 
        cleanH.includes("googleusercontent.com")
      );
    };

    const isAllowed = checkAllowed(host) || (forwardedHost ? checkAllowed(forwardedHost) : true);
      
    if (!isAllowed) {
      console.warn(`SECURITY LOCKOUT: Blocked request from unauthorized host: "${host}" (Forwarded: "${forwardedHost}")`);
      return res.status(403).json({ 
        success: false, 
        message: "INTEGRITY SHIELD LOCKED: Unauthorized source copy or hosting detected." 
      });
    }
    next();
  });

  // --- API ROUTES ---

  // Proxy Wingo History API
  app.get("/api/wingo-history", async (req, res) => {
    try {
      const targetUrl = "https://sky-predictor-1012593186417.asia-southeast1.run.app/api/wingo-history-100";
      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`External API returned status ${response.status}`);
      }
      const data = await response.json();
      
      let records = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (data && Array.isArray(data.data)) {
        records = data.data;
      } else if (data && data.data && Array.isArray(data.data.list)) {
        records = data.data.list;
      } else if (data && Array.isArray(data.list)) {
        records = data.list;
      } else if (data && typeof data === 'object') {
        const foundArray = Object.values(data).find(v => Array.isArray(v));
        if (foundArray) {
          records = foundArray as any[];
        } else {
          records = [];
        }
      }
      
      res.json({ success: true, data: records });
    } catch (error: any) {
      console.error("Error fetching wingo history:", error.message);
      const mockHistory = [];
      const now = Date.now();
      let periodBase = BigInt("20260710100000");
      for (let i = 0; i < 100; i++) {
        const num = Math.floor(Math.random() * 10);
        const size = num >= 5 ? "BIG" : "SMALL";
        const color = num === 0 ? "RED-VIOLET" : num === 5 ? "GREEN-VIOLET" : [1,3,7,9].includes(num) ? "GREEN" : "RED";
        mockHistory.push({
          period: (periodBase - BigInt(i)).toString(),
          number: num,
          size,
          color,
          timestamp: now - i * 30000
        });
      }
      res.json({ success: true, data: mockHistory, isFallback: true });
    }
  });

  // User Registration
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    
    try {
      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      const newUser: User = {
        uid: cleanUsername,
        username: username.trim(),
        passwordHash: password,
        coins: 0,
        isAdmin: false
      };
      await setDoc(userRef, newUser);

      res.json({
        success: true,
        message: "Registration successful!",
        user: {
          uid: newUser.uid,
          username: newUser.username,
          coins: newUser.coins,
          isAdmin: newUser.isAdmin
        }
      });
    } catch (e: any) {
      console.error("Registration error:", e);
      res.status(500).json({ success: false, message: "Registration failed: " + e.message });
    }
  });

  // User Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    
    try {
      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(400).json({ success: false, message: "Invalid username or password" });
      }
      
      const user = userSnap.data() as User;
      if (user.passwordHash !== password) {
        return res.status(400).json({ success: false, message: "Invalid username or password" });
      }

      res.json({
        success: true,
        user: {
          uid: user.uid,
          username: user.username,
          coins: user.coins,
          isAdmin: user.isAdmin
        }
      });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ success: false, message: "Login failed: " + e.message });
    }
  });

  // Get user profile/coins
  app.get("/api/user/profile", async (req, res) => {
    const uid = req.query.uid as string;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      let userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        if (cleanUid.startsWith("guest_")) {
          const guestUser: User = {
            uid: cleanUid,
            username: "Guest User",
            passwordHash: "",
            coins: 0, 
            isAdmin: false
          };
          await setDoc(userRef, guestUser);
          userSnap = await getDoc(userRef);
        } else {
          return res.status(404).json({ success: false, message: "User not found" });
        }
      }

      const user = userSnap.data() as User;
      res.json({
        success: true,
        user: {
          uid: user.uid,
          username: user.username,
          coins: user.coins,
          isAdmin: user.isAdmin
        }
      });
    } catch (e: any) {
      console.error("Profile fetch error:", e);
      res.status(500).json({ success: false, message: "Profile fetch failed: " + e.message });
    }
  });

  // Deduct 1 coin
  app.post("/api/user/deduct-coin", async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const user = userSnap.data() as User;
      if (user.coins <= 0 && !user.isAdmin) {
        return res.status(400).json({ success: false, message: "Insufficient coins" });
      }

      let updatedCoins = user.coins;
      if (!user.isAdmin) {
        updatedCoins = user.coins - 1;
        await updateDoc(userRef, { coins: updatedCoins });
      }

      res.json({
        success: true,
        coins: updatedCoins
      });
    } catch (e: any) {
      console.error("Deduct coin error:", e);
      res.status(500).json({ success: false, message: "Coin deduction failed: " + e.message });
    }
  });

  // Payment Submit
  app.post("/api/payment/submit", async (req, res) => {
    const { uid, utr, amount, coins, planImg } = req.body;
    if (!uid || !utr || !amount || !coins) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }
    const cleanUid = uid.toLowerCase();

    try {
      const userRef = doc(db, "users", cleanUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ success: false, message: "User not found" });
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

      res.json({ success: true, txnId, transaction: newTxn });
    } catch (e: any) {
      console.error("Payment submission error:", e);
      res.status(500).json({ success: false, message: "Payment submission failed: " + e.message });
    }
  });

  // Get single transaction status (polling)
  app.get("/api/payment/status", async (req, res) => {
    const { txnId } = req.query;
    if (!txnId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    try {
      const txnRef = doc(db, "transactions", txnId as string);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }
      res.json({ success: true, transaction: txnSnap.data() });
    } catch (e: any) {
      console.error("Transaction status error:", e);
      res.status(500).json({ success: false, message: "Failed to get status: " + e.message });
    }
  });

  // Admin routes
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => doc.data() as Transaction);
      res.json({ success: true, transactions: list });
    } catch (e: any) {
      console.error("Admin transactions query error:", e);
      res.status(500).json({ success: false, message: "Failed to get transactions: " + e.message });
    }
  });

  app.post("/api/admin/approve", async (req, res) => {
    const { txnId } = req.body;
    if (!txnId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    try {
      const txnRef = doc(db, "transactions", txnId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }
      const txn = txnSnap.data() as Transaction;
      if (txn.status !== "pending") {
        return res.status(400).json({ success: false, message: "Transaction is already " + txn.status });
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
      res.json({ success: true, message: "Transaction approved and coins credited", transaction: txn });
    } catch (e: any) {
      console.error("Approve transaction error:", e);
      res.status(500).json({ success: false, message: "Approval failed: " + e.message });
    }
  });

  app.post("/api/admin/reject", async (req, res) => {
    const { txnId } = req.body;
    if (!txnId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    try {
      const txnRef = doc(db, "transactions", txnId);
      const txnSnap = await getDoc(txnRef);
      if (!txnSnap.exists()) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }
      await updateDoc(txnRef, { status: "rejected" });
      const txn = txnSnap.data() as Transaction;
      txn.status = "rejected";
      res.json({ success: true, message: "Transaction rejected", transaction: txn });
    } catch (e: any) {
      console.error("Reject transaction error:", e);
      res.status(500).json({ success: false, message: "Rejection failed: " + e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
