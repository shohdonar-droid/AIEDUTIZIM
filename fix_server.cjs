const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\\n\s*app\.post\("\/api\/telegram-webhook"/g, '\n  app.post("/api/telegram-webhook"');
fs.writeFileSync('server.ts', content);
console.log("Fixed newline");
