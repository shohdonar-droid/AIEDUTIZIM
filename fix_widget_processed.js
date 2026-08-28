const fs = require('fs');
let code = fs.readFileSync('src/components/ChatbotWidget.tsx', 'utf8');

code = code.replace(
  'isRead: false,',
  'isRead: false,\n          processedByBot: false,'
);

code = code.replace(
  'isRead: false,',
  'isRead: false,\n          processedByBot: false,'
);

fs.writeFileSync('src/components/ChatbotWidget.tsx', code);
console.log("Replaced successfully");
