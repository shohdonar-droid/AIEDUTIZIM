const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldCheck = `    // Check if user is linked
    let student = null;
    let studentDocId = "";
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", userId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        student = snapshot.docs[0].data();
        studentDocId = snapshot.docs[0].id;
      }
    } catch(e) {
       return ctx.reply("❌ Xatolik yuz berdi");
    }

    if (!student) {
      return ctx.reply("🔐 Telegram akkauntingiz talaba profiliga ulanmagan.\\nIltimos saytga kiring va Profilingizdan <b>🤖 Telegram botni ulash</b> tugmasini bosing.", {
        parse_mode: "HTML"
      });
    }`;

const newCheck = `    // Check if user is linked
    let student = null;
    let studentDocId = "";
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", userId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Try to find a proper linked student profile
        for (const d of snapshot.docs) {
          const data = d.data();
          if (data.role === "student" || data.telegramLinked === true) {
            student = data;
            studentDocId = d.id;
            break;
          }
        }
      }
    } catch(e) {
       return ctx.reply("❌ Xatolik yuz berdi");
    }

    if (!student) {
      return ctx.reply("🔐 <b>Siz tizimdagi talaba profiliga bog'lanmagansiz!</b>\\n\\n«Mening topshiriqlarim» menyusidan foydalanish uchun tizimga (saytga) kiring va Profilingizdan <b>🤖 Telegram botni ulash</b> tugmasi orqali profilingizni botga ulab qo'ying.", {
        parse_mode: "HTML"
      });
    }`;

if (content.includes('if (normText === "🎓 Mening topshiriqlarim"')) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync('telegram.ts', content);
  console.log("Patched topshiriqlar handler");
} else {
  console.log("Could not find topshiriqlar handler");
}
