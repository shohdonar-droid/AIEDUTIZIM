const fs = require('fs');
let code = fs.readFileSync('src/components/ChatbotWidget.tsx', 'utf8');

code = code.replace(
  'where("receiverId", "==", adminId),',
  'where("receiverRole", "==", "admin"),'
);

fs.writeFileSync('src/components/ChatbotWidget.tsx', code);
console.log("Replaced successfully");
