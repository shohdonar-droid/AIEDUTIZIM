const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldLogic = `     const testData = docSnap.data();
     let questions = testData.questions || [];
     if (type === "test" && questions.length === 0 && testData.id && testData.id.startsWith("subject_")) {
        // Fallback for subject test.
        const subjSnap = await getDoc(doc(db, "subjects", testData.id.replace("subject_", "")));
        if (subjSnap.exists()) {
           questions = subjSnap.data().questions || [];
        }
     }
     
     if (questions.length === 0) {
        return ctx.reply("❌ Ushbu topshiriqda savollar yo'q.");
     }`;

const newLogic = `     const testData = docSnap.data();
     let questions = testData.questions || [];
     
     if (type === "test" && testData.type === "exam" && testData.generationRules && testData.generationRules.length > 0 && questions.length === 0) {
        return ctx.reply("⚠️ Bu imtihon maxsus sun'iy intellekt orqali onlayn tuziladi. Uni ishlash uchun iltimos, saytga kiring.");
     }

     if (type === "test" && questions.length === 0 && testData.id && testData.id.startsWith("subject_")) {
        // Fallback for subject test.
        const subjSnap = await getDoc(doc(db, "subjects", testData.id.replace("subject_", "")));
        if (subjSnap.exists()) {
           questions = subjSnap.data().questions || [];
        }
     }
     
     if (type === "auto_test") {
        let randomCount = questions.length;
        if (testData.randomCount !== undefined && testData.randomCount !== null && testData.randomCount !== '') {
          const parsed = Number(testData.randomCount);
          if (!isNaN(parsed) && parsed > 0) {
            randomCount = parsed;
          }
        }
        if (randomCount < questions.length) {
          questions = [...questions].sort(() => 0.5 - Math.random()).slice(0, randomCount);
        }
     }
     
     if (questions.length === 0) {
        return ctx.reply("❌ Ushbu topshiriqda savollar yo'q.");
     }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('telegram.ts', content);
