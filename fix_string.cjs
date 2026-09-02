const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(/text \+= i \+ "\. " \+ typeEmoji \+ " <b>" \+ t\.title \+ "<\/b>[\s\S]*?text \+= "Holat: " \+ statusStr \+ "[\s\S]*?";/m,
  'text += i + ". " + typeEmoji + " <b>" + t.title + "</b>\\n";\n         text += "Holat: " + statusStr + "\\n\\n";');

fs.writeFileSync('telegram.ts', code);
console.log("Fixed string");
