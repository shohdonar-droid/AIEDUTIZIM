const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const handlersCode = `
bot.action(/tgtst_cat_(auto|exam|topic)_(.+)/, async (ctx) => {
  const cat = ctx.match[1];
  const studentDocId = ctx.match[2];
  
  await ctx.answerCbQuery();
  
  let student = null;
  try {
     const snap = await getDoc(doc(db, "users", studentDocId));
     if (snap.exists()) student = snap.data();
  } catch(e) {}
  
  if (!student) {
     return ctx.editMessageText("❌ Talaba profili topilmadi.");
  }

  await ctx.editMessageText("⏳ Topshiriqlar tekshirilmoqda...");
  
  try {
     let myTests = [];
     
     if (cat === "auto") {
        const autoTestsSnap = await getDocs(collection(db, "auto_tests"));
        autoTestsSnap.forEach(d => {
          const test = { id: d.id, ...d.data() };
          let match = false;
          if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
          if (test.groupId && test.groupId === student.groupId) match = true;
          if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
          if (test.departmentId && test.departmentId === student.departmentId) match = true;
          if (test.teacherId && test.teacherId === student.teacherId) match = true;
          if (match) myTests.push({...test, realType: 'auto_test'});
        });
     } else {
        const testsSnap = await getDocs(collection(db, "tests"));
        testsSnap.forEach(d => {
          const test = { id: d.id, ...d.data() };
          if (test.isPublished) {
             if ((cat === "exam" && test.type === "exam") || (cat === "topic" && test.type === "topic")) {
                let match = false;
                if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
                if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
                if (test.organizationIds && test.organizationIds.includes(student.teacherId)) match = true;
                if (test.creatorId === student.teacherId || test.teacherId === student.teacherId) match = true;
                if (match) myTests.push({...test, realType: 'test'});
             }
          }
        });
     }
     
     if (myTests.length === 0) {
        return ctx.editMessageText(" Ushbu bo'limda sizga biriktirilgan topshiriqlar topilmadi.", {
           reply_markup: {
             inline_keyboard: [[{ text: "⬅️ Orqaga", callback_data: "tgtst_menu" }]]
           }
        });
     }
     
     const resSnap = await getDocs(query(collection(db, 'testResults'), where('userId', '==', studentDocId)));
     const completedTests = new Map();
     resSnap.forEach(r => completedTests.set(r.data().testId, r.data()));

     let text = "🎓 <b>MENING TOPSHIRIQLARIM</b>\\n\\n";
     const buttons = [];
     let i = 1;
     for (const t of myTests) {
         let typeEmoji = cat === "auto" ? "🤖" : (cat === "exam" ? "📝" : "📚");
         let statusStr = "🟡 Boshlanmagan";
         if (completedTests.has(t.id)) {
            const res = completedTests.get(t.id);
            statusStr = "🟢 Bajarilgan (" + res.score + "%)";
         }
         
         text += i + ". " + typeEmoji + " <b>" + t.title + "</b>\\n";
         text += "Holat: " + statusStr + "\\n\\n";
         
         if (!completedTests.has(t.id)) {
             buttons.push([{ text: "▶️ " + t.title, callback_data: "tgtst_" + t.realType + "_" + t.id + "_" + studentDocId }]);
         } else {
             buttons.push([{ text: "✅ " + t.title, callback_data: "tgtst_res_" + t.id }]);
         }
         i++;
     }
     buttons.push([{ text: "⬅️ Orqaga", callback_data: "tgtst_menu" }]);
     
     await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: {
           inline_keyboard: buttons
        }
     });
  } catch(e) {
     console.error(e);
     await ctx.editMessageText("❌ Xatolik yuz berdi");
  }
});
`;

const insertPoint = 'bot.action(/tgtst_(auto_test|test)_(.+)_(.+)/, async (ctx) => {';
content = content.replace(insertPoint, handlersCode + '\n' + insertPoint);

fs.writeFileSync('telegram.ts', content);
