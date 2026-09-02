const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(/https:\/\/aiedutizim\.vercel\.app\/login/g, '${APP_URL}/login');
// Also fix any missed ones that don't have template literals:
// wait, replace string literal with template literal if needed
// Actually let's just use replace with regex carefully.

code = code.replace(/"https:\/\/aiedutizim\.vercel\.app\/login"/g, '`${APP_URL}/login`');

fs.writeFileSync('telegram.ts', code);
console.log("Patched URL");
