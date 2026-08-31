const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldLogic = `  if (normText === "🎓 Mening topshiriqlarim" || normText === "🎓 mening topshiriqlarim" || normText === "mening topshiriqlarim") {
    aiModeDeactivate();
    pendingLogins.delete(userId);
    
    // Check if user is linked
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
    }

    // Load assignments
    await ctx.reply("⏳ Topshiriqlar tekshirilmoqda...");
    try {
      let myTests = [];
      
      // Auto tests
      const autoTestsSnap = await getDocs(collection(db, "auto_tests"));
      autoTestsSnap.forEach(doc => {
        const test: any = { id: doc.id, ...doc.data() };
        let match = false;
        if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
        if (test.groupId && test.groupId === student.groupId) match = true;
        if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
        if (test.departmentId && test.departmentId === student.departmentId) match = true;
        if (test.teacherId && test.teacherId === student.teacherId) match = true;
        
        if (match) myTests.push({...test, realType: 'auto_test'});
      });

      // Regular tests
      const testsSnap = await getDocs(collection(db, "tests"));
      testsSnap.forEach(doc => {
        const test: any = { id: doc.id, ...doc.data() };
        if (test.isPublished) {
          let match = false;
          if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
          if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
          if (test.organizationIds && test.organizationIds.includes(student.teacherId)) match = true;
          if (test.creatorId === student.teacherId || test.teacherId === student.teacherId) match = true;
          
          if (match) myTests.push({...test, realType: 'test'});
        }
      });
      
      if (myTests.length === 0) {
        return ctx.reply("🎓 <b>MENING TOPSHIRIQLARIM</b>\\n\\n👤 Talaba: " + (student.displayName || "Noma'lum") + "\\n👥 Guruh: " + (student.groupName || "Noma'lum") + "\\n\\nSizga biriktirilgan topshiriqlar topilmadi.", { parse_mode: "HTML" });
      }

      // Check results to show status
      const resSnap = await getDocs(query(collection(db, 'testResults'), where('userId', '==', studentDocId)));
      const completedTests = new Map();
      resSnap.forEach(r => completedTests.set(r.data().testId, r.data()));

      let text = "🎓 <b>MENING TOPSHIRIQLARIM</b>\\n\\n";
      text += "👤 Talaba: <b>" + (student.displayName || "Noma'lum") + "</b>\\n";
      text += "👥 Guruh: <b>" + (student.groupName || "Noma'lum") + "</b>\\n\\n";

      const buttons = [];
      let i = 1;
      for (const t of myTests) {
         let typeEmoji = "📝";
         if (t.realType === 'auto_test') typeEmoji = "🤖";
         else if (t.type === 'exam') typeEmoji = "📝";
         else typeEmoji = "📚";

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
      buttons.push([{ text: "🚪 Profildan chiqish", callback_data: "tgtst_logout_" + studentDocId }]);
      // text might be too long, but let's assume it's fine for now
      
      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: {
           inline_keyboard: buttons
        }
      });

    } catch(e) {
      console.error(e);
      await ctx.reply("❌ Xatolik yuz berdi");
    }
    return;
  }`;

// Find the start and end of this block
const startIdx = content.indexOf('if (normText === "🎓 Mening topshiriqlarim"');
const endIdxStr = 'return;\n  }';
let endIdx = content.indexOf(endIdxStr, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  
  const newLogic = `if (normText === "🎓 Mening topshiriqlarim" || normText === "🎓 mening topshiriqlarim" || normText === "mening topshiriqlarim") {
    aiModeDeactivate();
    pendingLogins.delete(userId);
    
    // Check if user is linked
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
    }

    let text = "🎓 <b>MENING TOPSHIRIQLARIM</b>\\n\\n";
    text += "👤 Talaba: <b>" + (student.displayName || "Noma'lum") + "</b>\\n";
    text += "👥 Guruh: <b>" + (student.groupName || "Noma'lum") + "</b>\\n\\n";
    text += "Iltimos, topshiriq turini tanlang:";

    const buttons = [
      [{ text: "🤖 Avto testlar", callback_data: "tgtst_cat_auto_" + studentDocId }],
      [{ text: "📝 Imtihonlar (Testlar)", callback_data: "tgtst_cat_exam_" + studentDocId }],
      [{ text: "📚 Mavzuli testlar", callback_data: "tgtst_cat_topic_" + studentDocId }],
      [{ text: "🚪 Profildan chiqish", callback_data: "tgtst_logout_" + studentDocId }]
    ];
    
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: {
         inline_keyboard: buttons
      }
    });

    return;
  }`;

  content = content.substring(0, startIdx) + newLogic + content.substring(endIdx + endIdxStr.length);
  fs.writeFileSync('telegram.ts', content);
} else {
  console.log("Could not find the target code to replace.");
}
