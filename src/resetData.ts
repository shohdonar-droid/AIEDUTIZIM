import { db } from './lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

async function resetAllData() {
  console.log("=== STARTING COMPLETE SYSTEM DATA RESET ===");

  // 1. Delete all payment/subscription records
  const collectionsToDelete = ['payments', 'payment_history', 'active_subscriptions'];
  for (const colName of collectionsToDelete) {
    console.log(`Deleting all documents in collection: ${colName}`);
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log(`Collection ${colName} is empty.`);
      continue;
    }

    let batch = writeBatch(db);
    let count = 0;
    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref);
      count++;
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    console.log(`Successfully deleted ${snap.size} documents from ${colName}.`);
  }

  // 2. Reset users and telegram_users metrics to 0
  const userCollections = ['users', 'telegram_users'];
  for (const colName of userCollections) {
    console.log(`Resetting balances and metrics to 0 in collection: ${colName}`);
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log(`Collection ${colName} is empty.`);
      continue;
    }

    let batch = writeBatch(db);
    let count = 0;
    for (const docSnap of snap.docs) {
      batch.update(docSnap.ref, {
        balance: 0,
        ball: 0,
        totalPaid: 0,
        totalPayment: 0,
        totalIncome: 0,
        totalSpentAmount: 0,
        usedTokens: 0,
        tokensUsed: 0,
        aiTokens: 0,
        tokens: 0
      });
      count++;
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    console.log(`Successfully reset metrics for ${snap.size} users in ${colName}.`);
  }

  console.log("=== DATA RESET COMPLETED SUCCESSFULLY ===");
}

resetAllData()
  .then(() => {
    console.log("Database reset script finished.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database reset script failed:", err);
    process.exit(1);
  });
