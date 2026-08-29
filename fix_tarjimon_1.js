const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(
  '  const hasBalance = isAdmin || (await checkAndDeductBalance(userId, cost));',
  `  let hasBalance = true;
  let chargeCost = cost;
  if (normText !== "🌐 Tarjimon") {
    hasBalance = isAdmin || (await checkAndDeductBalance(userId, cost));
  } else {
    chargeCost = 0; // We will charge later inside the wizard based on input type
  }`
);

fs.writeFileSync('telegram.ts', code);
console.log("Replaced 1 successfully");
