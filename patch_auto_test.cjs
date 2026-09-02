const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

// 1. Update the loop where tests are rendered.
const loopStartRegex = /for \(const t of myTests\) \{([\s\S]*?)i\+\+;\n     \}/;
const newLoop = `for (const t of myTests) {
         let typeEmoji = cat === "auto" ? "🤖" : (cat === "exam" ? "📝" : "📚");
         let statusStr = "🟡 Boshlanmagan";
         let currentAttempts = 0;
         const maxAttempts = t.maxAttempts || 1;
         
         if (completedTests.has(t.id)) {
            const res = completedTests.get(t.id);
            currentAttempts = res.attempts || 1;
            statusStr = "🟢 Bajarilgan (" + res.score + "%) - " + currentAttempts + "/" + maxAttempts + " marta";
         }
                  
         text += i + ". " + typeEmoji + " <b>" + t.title + "</b>\n";
         text += "Holat: " + statusStr + "\n\n";
         
         const shortType = t.realType === 'auto_test' ? 'atst' : 'test';
         
         if (currentAttempts < maxAttempts) {
             let btnText = currentAttempts > 0 ? "▶️ Qayta ishlash" : "▶️ " + t.title;
             // Trim title if button text is too long (optional, but good practice)
             if (btnText.length > 35) btnText = btnText.substring(0, 32) + "...";
             buttons.push([{ text: btnText, callback_data: "tgtst_" + shortType + "_" + t.id + "_" + studentDocId }]);
         } else {
             let btnText = "✅ " + t.title;
             if (btnText.length > 35) btnText = btnText.substring(0, 32) + "...";
             buttons.push([{ text: btnText, callback_data: "tgtst_res_" + t.id }]);
         }
         i++;
     }`;

code = code.replace(loopStartRegex, newLoop);

// 2. Update the handler regex
code = code.replace(/bot\.action\(\/tgtst_\(auto_test\|test\)_\(\.\+\)_\(\.\+\)\/, async \(ctx\) => \{/g, 
  'bot.action(/tgtst_(auto_test|atst|test)_(.+)_(.+)/, async (ctx) => {');

// 3. Update the type check in the handler
code = code.replace(/type === "auto_test" \? "auto_tests" : "tests"/g, 
  '(type === "auto_test" || type === "atst") ? "auto_tests" : "tests"');
code = code.replace(/if \(type === "auto_test"\) \{/g, 
  'if (type === "auto_test" || type === "atst") {');
code = code.replace(/session\.type === "auto_test" \? "auto" : "subject"/g, 
  '(session.type === "auto_test" || session.type === "atst") ? "auto" : "subject"');

// 4. In the handler, load the existing attempts
// Find where session is created:
const sessionRegex = /const session = \{\s*studentDocId,[\s\S]*?studentTeacherId: "", \/\/ We can fetch\s*\};/;
const newSession = `const resDocId = studentDocId + "_" + testId;
     const resSnap = await getDoc(doc(db, "testResults", resDocId));
     const existingResult = resSnap.exists() ? resSnap.data() : null;
     const currentAttempts = existingResult?.attempts || 0;
     const maxAttempts = testData.maxAttempts || 1;
     
     if (currentAttempts >= maxAttempts) {
         return ctx.reply("Siz ushbu testni maksimal marta ishlagan ekansiz.");
     }

     const session = {
        studentDocId,
        testId,
        type,
        testTitle: testData.title,
        questions: questions,
        currentQIdx: 0,
        correctCount: 0,
        wrongCount: 0,
        studentName: "", 
        studentTeacherId: "", 
        currentAttempts: currentAttempts,
     };`;
code = code.replace(sessionRegex, newSession);

// 5. Update saving logic
const saveRegex = /await addDoc\(collection\(db, "testResults"\), payload\);/g;
const newSave = `payload.attempts = (session.currentAttempts || 0) + 1;
           await setDoc(doc(db, "testResults", session.studentDocId + "_" + session.testId), payload, { merge: true });`;
code = code.replace(saveRegex, newSave);

fs.writeFileSync('telegram.ts', code);
console.log("Patched test attempts and auto test callback data limit");
