import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import crypto from "crypto";
import firebaseConfigRaw from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfigRaw.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfigRaw.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfigRaw.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfigRaw.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfigRaw.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfigRaw.appId,
};

const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseConfigRaw.firestoreDatabaseId;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function initSafeDb(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        host: "firestore.googleapis.com",
        ssl: true,
      },
      databaseId
    );
  } catch (e) {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

const db = initSafeDb();

export interface FoundUser {
  docId: string;
  systemId: string;
  displayName: string;
  login: string;
  role: string;
  ball: number;
  balance: number;
  phone?: string;
  email?: string;
}

/**
 * Find user in Firestore by 7-digit systemId (or login/uid fallback)
 */
export async function findUserBySystemId(systemId: string): Promise<FoundUser | null> {
  if (!systemId) return null;
  const cleanId = systemId.toString().trim();

  // 1. Search by systemId
  const qSys = query(collection(db, "users"), where("systemId", "==", cleanId));
  const snapSys = await getDocs(qSys);
  if (!snapSys.empty) {
    const d = snapSys.docs[0];
    const data = d.data();
    return {
      docId: d.id,
      systemId: data.systemId || cleanId,
      displayName: data.displayName || data.login || "Foydalanuvchi",
      login: data.login || "",
      role: data.role || "student",
      ball: Number(data.ball) || 0,
      balance: Number(data.balance || data.ball) || 0,
      phone: data.phone || "",
      email: data.email || "",
    };
  }

  // 2. Search by login
  const qLog = query(collection(db, "users"), where("login", "==", cleanId));
  const snapLog = await getDocs(qLog);
  if (!snapLog.empty) {
    const d = snapLog.docs[0];
    const data = d.data();
    return {
      docId: d.id,
      systemId: data.systemId || cleanId,
      displayName: data.displayName || data.login || "Foydalanuvchi",
      login: data.login || "",
      role: data.role || "student",
      ball: Number(data.ball) || 0,
      balance: Number(data.balance || data.ball) || 0,
      phone: data.phone || "",
      email: data.email || "",
    };
  }

  // 3. Search by telegramId (number or string)
  const numId = Number(cleanId);
  if (!isNaN(numId)) {
    const qTgNum = query(collection(db, "users"), where("telegramId", "==", numId));
    const snapTgNum = await getDocs(qTgNum);
    if (!snapTgNum.empty) {
      const d = snapTgNum.docs[0];
      const data = d.data();
      return {
        docId: d.id,
        systemId: data.systemId || String(data.telegramId) || cleanId,
        displayName: data.displayName || data.first_name || data.login || "Telegram Foydalanuvchisi",
        login: data.login || "",
        role: data.role || "student",
        ball: Number(data.ball) || 0,
        balance: Number(data.balance || data.ball) || 0,
        phone: data.phone || "",
        email: data.email || "",
      };
    }
  }

  const qTgStr = query(collection(db, "users"), where("telegramId", "==", cleanId));
  const snapTgStr = await getDocs(qTgStr);
  if (!snapTgStr.empty) {
    const d = snapTgStr.docs[0];
    const data = d.data();
    return {
      docId: d.id,
      systemId: data.systemId || String(data.telegramId) || cleanId,
      displayName: data.displayName || data.first_name || data.login || "Telegram Foydalanuvchisi",
      login: data.login || "",
      role: data.role || "student",
      ball: Number(data.ball) || 0,
      balance: Number(data.balance || data.ball) || 0,
      phone: data.phone || "",
      email: data.email || "",
    };
  }

  // 4. Direct Doc lookup (if systemId is Firestore UID)
  try {
    const userDocRef = doc(db, "users", cleanId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        systemId: data.systemId || cleanId,
        displayName: data.displayName || data.login || "Foydalanuvchi",
        login: data.login || "",
        role: data.role || "student",
        ball: Number(data.ball) || 0,
        balance: Number(data.balance || data.ball) || 0,
        phone: data.phone || "",
        email: data.email || "",
      };
    }
  } catch (e) {
    // Ignore invalid doc path error
  }

  return null;
}

/**
 * Add balance to user immediately upon payment completion
 */
export async function addBalanceToUser(
  docId: string,
  amount: number,
  provider: string,
  transactionId: string
): Promise<{ newBall: number; newBalance: number }> {
  const userRef = doc(db, "users", docId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User document not found");
  }

  const data = userSnap.data();
  const currentBall = Number(data.ball) || 0;
  const currentBalance = Number(data.balance) || currentBall;

  const newBall = currentBall + amount;
  const newBalance = currentBalance + amount;

  // 1. Update user balance in Firestore
  await updateDoc(userRef, {
    ball: newBall,
    balance: newBalance,
    updatedAt: serverTimestamp(),
  });

  // 2. Log payment in payments collection
  await addDoc(collection(db, "payments"), {
    userId: docId,
    systemId: data.systemId || "",
    userName: data.displayName || data.login || "",
    amount: amount,
    provider: provider,
    transactionId: transactionId,
    status: "approved",
    paymentType: provider,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
  });

  // 3. Log payment in payment_history collection
  await addDoc(collection(db, "payment_history"), {
    userId: docId,
    amount: amount,
    type: "in",
    description: `${provider} to'lovi (ID: ${transactionId})`,
    paymentType: provider,
    createdAt: serverTimestamp(),
  });

  // 4. Notify Telegram admins
  try {
    const { notifyPaymentCompleted } = await import("../../telegram.js" as any);
    if (notifyPaymentCompleted) {
      await notifyPaymentCompleted({
        userName: data.displayName || data.login || "Foydalanuvchi",
        systemId: data.systemId || docId,
        amount: amount,
        provider: provider,
        transactionId: transactionId,
        newBalance: newBalance,
      });
    }
  } catch (e) {
    console.warn("Could not send telegram notification for automated payment:", e);
  }

  return { newBall, newBalance };
}

/**
 * CLICK Merchant Protocol Handler
 */
export async function handleClickRequest(body: any) {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id, // User's 7-digit systemId
    param2,            // Alternative field for 7-digit systemId
    amount,
    action,
    error,
    sign_time,
    sign_string,
  } = body;

  const targetSystemId = (merchant_trans_id || param2 || "").toString().trim();
  const paymentAmount = Number(amount) || 0;

  console.log(`[Click API] Action ${action} for ID: ${targetSystemId}, amount: ${paymentAmount}, click_trans_id: ${click_trans_id}`);

  if (!targetSystemId) {
    return {
      error: -5,
      error_note: "Foydalanuvchi ID raqami kiritilmagan",
    };
  }

  const user = await findUserBySystemId(targetSystemId);
  if (!user) {
    return {
      error: -5,
      error_note: "Foydalanuvchi topilmadi",
    };
  }

  // MD5 Signature check if CLICK_SECRET_KEY is configured
  const clickSecretKey = process.env.CLICK_SECRET_KEY;
  if (clickSecretKey && sign_string) {
    const merchantPrepareId = Number(action) === 1 ? String(click_trans_id) : "";
    const expectedSign = crypto
      .createHash("md5")
      .update(
        `${click_trans_id}${service_id}${clickSecretKey}${merchant_trans_id}${merchantPrepareId}${amount}${action}${sign_time}`
      )
      .digest("hex");

    if (sign_string.toLowerCase() !== expectedSign.toLowerCase()) {
      console.warn(`[Click API] Signature mismatch! Received: ${sign_string}, expected: ${expectedSign}`);
      return {
        error: -1,
        error_note: "SIGN CHECK FAILED",
      };
    }
  }

  // Action 0: Prepare (Check user existence & return details)
  if (Number(action) === 0) {
    return {
      click_trans_id: Number(click_trans_id),
      merchant_trans_id: targetSystemId,
      merchant_prepare_id: String(click_trans_id),
      error: 0,
      error_note: "Success",
      user_name: user.displayName,
      phone: user.phone || "",
    };
  }

  // Action 1: Complete (Finalize payment & add balance immediately)
  if (Number(action) === 1) {
    try {
      // Idempotency check: verify if transaction was already processed
      const clickTransRef = doc(db, "click_transactions", String(click_trans_id));
      const existingSnap = await getDoc(clickTransRef);
      if (existingSnap.exists() && existingSnap.data().status === "completed") {
        console.log(`[Click API] Transaction ${click_trans_id} already processed.`);
        return {
          click_trans_id: Number(click_trans_id),
          merchant_trans_id: targetSystemId,
          merchant_confirm_id: String(click_trans_id),
          error: 0,
          error_note: "Already processed",
        };
      }

      const { newBalance } = await addBalanceToUser(user.docId, paymentAmount, "Click", String(click_trans_id));
      await setDoc(clickTransRef, {
        click_trans_id: String(click_trans_id),
        merchant_trans_id: targetSystemId,
        userId: user.docId,
        amount: paymentAmount,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      console.log(`[Click API] Payment success! User ${user.displayName} (ID: ${user.systemId}) balance updated to ${newBalance} UZS`);

      return {
        click_trans_id: Number(click_trans_id),
        merchant_trans_id: targetSystemId,
        merchant_confirm_id: String(click_trans_id),
        error: 0,
        error_note: "Success",
      };
    } catch (e: any) {
      console.error("[Click API] Error updating balance:", e);
      return {
        error: -9,
        error_note: "To'lovni saqlashda xatolik: " + e.message,
      };
    }
  }

  return {
    error: -3,
    error_note: "Noma'lum harakat (Action invalid)",
  };
}

/**
 * PAYME JSON-RPC 2.0 Protocol Handler
 */
export async function handlePaymeRequest(body: any) {
  const { method, params, id: reqId } = body;

  console.log(`[Payme API] Method: ${method}, params:`, params);

  if (method === "CheckPerformTransaction") {
    const account = params?.account || {};
    const targetSystemId = (account.system_id || account.user_id || account.id || account.phone || "").toString().trim();
    const amountInTiyin = Number(params?.amount) || 0;

    const user = await findUserBySystemId(targetSystemId);
    if (!user) {
      return {
        error: {
          code: -31050,
          message: {
            uz: "Foydalanuvchi topilmadi. Iltimos 7 xonali ID raqamingizni tekshiring.",
            ru: "Пользователь не найден.",
            en: "User not found.",
          },
          data: "system_id",
        },
        id: reqId,
      };
    }

    return {
      result: {
        allow: true,
        detail: {
          receipt_type: 0,
          items: [
            {
              title: `Tizim balansi (${user.displayName})`,
              price: amountInTiyin,
              count: 1,
              code: "00000000",
              units: 0,
              vat_percent: 0,
              package_code: "000000",
            },
          ],
        },
      },
      id: reqId,
    };
  }

  if (method === "CreateTransaction") {
    const account = params?.account || {};
    const targetSystemId = (account.system_id || account.user_id || account.id || account.phone || "").toString().trim();
    const user = await findUserBySystemId(targetSystemId);
    if (!user) {
      return {
        error: {
          code: -31050,
          message: { uz: "Foydalanuvchi topilmadi", ru: "Пользователь не найден", en: "User not found" },
          data: "system_id",
        },
        id: reqId,
      };
    }

    const paymeTransId = params.id;
    const createTime = Date.now();

    // Save transaction state in Firestore
    await setDoc(doc(db, "payme_transactions", paymeTransId), {
      paymeId: paymeTransId,
      userId: user.docId,
      systemId: user.systemId,
      amount: (params.amount || 0) / 100,
      state: 1,
      createTime: createTime,
      createdAt: serverTimestamp(),
    });

    return {
      result: {
        create_time: createTime,
        transaction: paymeTransId,
        state: 1,
      },
      id: reqId,
    };
  }

  if (method === "PerformTransaction") {
    const paymeTransId = params.id;
    const transRef = doc(db, "payme_transactions", paymeTransId);
    const transSnap = await getDoc(transRef);

    if (!transSnap.exists()) {
      return {
        error: { code: -31003, message: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" } },
        id: reqId,
      };
    }

    const transData = transSnap.data();
    const performTime = Date.now();

    if (transData.state === 1) {
      // Add balance to user immediately!
      await addBalanceToUser(transData.userId, transData.amount, "Payme", paymeTransId);
      await updateDoc(transRef, {
        state: 2,
        performTime: performTime,
      });

      console.log(`[Payme API] Transaction ${paymeTransId} performed. Added ${transData.amount} UZS to user ${transData.systemId}`);

      return {
        result: {
          transaction: paymeTransId,
          perform_time: performTime,
          state: 2,
        },
        id: reqId,
      };
    }

    if (transData.state === 2) {
      return {
        result: {
          transaction: paymeTransId,
          perform_time: transData.performTime || performTime,
          state: 2,
        },
        id: reqId,
      };
    }

    return {
      error: { code: -31008, message: { uz: "Tranzaksiyani bajarib bo'lmaydi", ru: "Невозможно выполнить транзакцию", en: "Cannot perform transaction" } },
      id: reqId,
    };
  }

  if (method === "CancelTransaction") {
    const paymeTransId = params.id;
    const transRef = doc(db, "payme_transactions", paymeTransId);
    const transSnap = await getDoc(transRef);

    if (transSnap.exists()) {
      const transData = transSnap.data();
      const cancelTime = Date.now();
      const newState = transData.state === 1 ? -1 : -2;

      await updateDoc(transRef, {
        state: newState,
        cancelTime: cancelTime,
        cancelReason: params.reason || 0,
      });

      return {
        result: {
          transaction: paymeTransId,
          cancel_time: cancelTime,
          state: newState,
        },
        id: reqId,
      };
    }

    return {
      error: { code: -31003, message: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" } },
      id: reqId,
    };
  }

  if (method === "CheckTransaction") {
    const paymeTransId = params.id;
    const transRef = doc(db, "payme_transactions", paymeTransId);
    const transSnap = await getDoc(transRef);

    if (transSnap.exists()) {
      const transData = transSnap.data();
      return {
        result: {
          create_time: transData.createTime || 0,
          perform_time: transData.performTime || 0,
          cancel_time: transData.cancelTime || 0,
          transaction: paymeTransId,
          state: transData.state,
          reason: transData.cancelReason || null,
        },
        id: reqId,
      };
    }

    return {
      error: { code: -31003, message: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" } },
      id: reqId,
    };
  }

  return {
    error: { code: -32601, message: { uz: "Metod topilmadi", ru: "Метод не найден", en: "Method not found" } },
    id: reqId,
  };
}
