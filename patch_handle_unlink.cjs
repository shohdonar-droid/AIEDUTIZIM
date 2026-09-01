const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const newFunc = `
export async function handleUnlinkTransfer(telegramId: number, studentUid: string) {
    let balanceToTransfer = 0;
    let ballToTransfer = 0;
    
    if (studentUid) {
       const studentSnap = await getDoc(doc(db, "users", studentUid));
       if (studentSnap.exists()) {
          const sData = studentSnap.data();
          balanceToTransfer = sData.balance || 0;
          ballToTransfer = sData.ball || 0;
          if (balanceToTransfer > 0 || ballToTransfer > 0) {
             await updateDoc(doc(db, "users", studentUid), {
                balance: 0,
                ball: 0
             });
          }
       }
    }
    
    let q = query(collection(db, "users"), where("telegramId", "==", telegramId));
    let snap = await getDocs(q);
    if (snap.empty) {
       q = query(collection(db, "users"), where("telegramId", "==", String(telegramId)));
       snap = await getDocs(q);
    }
    let botUserDoc = null;
    for (const d of snap.docs) {
       if (d.data().isBotUser) {
          botUserDoc = d;
          break;
       }
    }
    
    if (botUserDoc) {
       if (balanceToTransfer > 0 || ballToTransfer > 0) {
          await updateDoc(doc(db, "users", botUserDoc.id), {
             balance: (botUserDoc.data().balance || 0) + balanceToTransfer,
             ball: (botUserDoc.data().ball || 0) + ballToTransfer
          });
       }
    } else {
       await addDoc(collection(db, "users"), {
          telegramId: telegramId,
          uid: \`tg_\${telegramId}\`,
          displayName: "Foydalanuvchi",
          name: "Foydalanuvchi",
          username: "",
          phone: "",
          role: "bot_user",
          systemId: Math.floor(1000000 + Math.random() * 9000000),
          ball: ballToTransfer,
          balance: balanceToTransfer,
          spentBalls: 0,
          referralCount: 0,
          referrals: 0,
          invitedBy: null,
          createdAt: serverTimestamp(),
          isTelegramUser: true,
          isBotUser: true
       });
    }
}
`;

content = content + newFunc;
fs.writeFileSync('telegram.ts', content);
console.log("Patched telegram.ts with handleUnlinkTransfer");
