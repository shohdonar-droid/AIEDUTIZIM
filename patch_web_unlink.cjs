const fs = require('fs');
let content = fs.readFileSync('src/pages/student/StudentProfile.tsx', 'utf8');

const oldCall = `          await fetch('/api/telegram/unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: currentTgId })
          });`;

const newCall = `          await fetch('/api/telegram/unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: currentTgId, studentUid: user.uid })
          });`;

if (content.includes(oldCall)) {
  content = content.replace(oldCall, newCall);
  fs.writeFileSync('src/pages/student/StudentProfile.tsx', content);
  console.log("Patched StudentProfile.tsx");
} else {
  console.log("Could not find fetch call in StudentProfile.tsx");
}
