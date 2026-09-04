export const AI_COSTS = {
  oddiySlayd: 0.003,
  proSlayd: 0.035,
  oddiyKursIshi: 0.01,
  proKursIshi: 0.06,
  test: 0.002,
  tarjima: 0.02
};

export async function trackAiUsage(serviceType: keyof typeof AI_COSTS) {
  if (!db) return;
  try {
    const cost = AI_COSTS[serviceType];
    const statRef = doc(db, "bot_settings", "ai_stats");
    const isClaude = serviceType.startsWith("pro");
    
    const decrementField = isClaude ? "claudeBalance" : "geminiBalance";
    
    await setDoc(statRef, {
      [`count_${serviceType}`]: increment(1),
      [decrementField]: increment(-cost),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    const snap = await getDoc(statRef);
    if (snap.exists()) {
      const data = snap.data();
      const bal = data[decrementField];
      if (bal !== undefined && bal < 1.0) { 
         const admins = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
         const aiName = isClaude ? "Claude" : "Gemini";
         for (const adm of admins.docs) {
           const tgId = adm.data().telegramId;
           if (tgId) {
             try {
               await globalT.bot.telegram.sendMessage(tgId, `⚠️ <b>DIQQAT! API Balans tugamoqda!</b>\n\n🤖 <b>${aiName}</b> tarmog'ida hisob $1 dan kamaydi.\nJoriy qoldiq: ~$${bal.toFixed(2)}\n\nIltimos, tezroq API hisobini to'ldiring.`, { parse_mode: "HTML" });
             } catch(e){}
           }
         }
      }
    }
  } catch (e) {
    console.error("Failed to track AI usage:", e);
  }
}
