const fs = require('fs');
let content = fs.readFileSync('src/pages/student/StudentProfile.tsx', 'utf8');

const oldFunc = `  const handleUnlinkTelegram = async () => {
    if (!user?.uid) return;
    if (!confirm("Telegram akkauntini uzishni xohlaysizmi?")) return;
    setLinkingTg(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        telegramId: null,
        telegramLinked: false,
        telegramToken: null
      }, { merge: true });
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    } finally {
      setLinkingTg(false);
    }
  };`;

const newFunc = `  const handleUnlinkTelegram = async () => {
    if (!user?.uid) return;
    if (!confirm("Telegram akkauntini uzishni xohlaysizmi?")) return;
    setLinkingTg(true);
    try {
      const currentTgId = localUser?.telegramId || (user as any)?.telegramId;
      await setDoc(doc(db, 'users', user.uid), {
        telegramId: null,
        telegramLinked: false,
        telegramToken: null
      }, { merge: true });
      
      if (currentTgId) {
        try {
          await fetch('/api/telegram/unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: currentTgId })
          });
        } catch(err) {
          console.error("Botni ogohlantirishda xatolik", err);
        }
      }
      
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    } finally {
      setLinkingTg(false);
    }
  };`;

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync('src/pages/student/StudentProfile.tsx', content);
  console.log("Patched StudentProfile.tsx successfully");
} else {
  console.log("Could not find handleUnlinkTelegram block exactly.");
}
