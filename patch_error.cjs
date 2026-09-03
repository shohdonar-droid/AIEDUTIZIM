const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(/} catch\(e\) \{\n     console\.error\(e\);\n     await ctx\.editMessageText\("❌ Xatolik yuz berdi"\);\n  \}\}\);/g, `} catch(e) {
     console.error("ERROR IN TGTST_CAT:", e);
     await ctx.editMessageText("❌ Xatolik yuz berdi: " + (e.message || String(e)));
  }});`);

fs.writeFileSync('telegram.ts', code);
console.log("Patched error catch");
