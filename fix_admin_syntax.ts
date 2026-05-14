import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminJurnal.tsx', 'utf8');
content = content.replace(/URL\.revokeObjectURL\(url\);\s*\}\s*className="px-4 py-2/m, `URL.revokeObjectURL(url); }} className="px-4 py-2`);
fs.writeFileSync('src/pages/admin/AdminJurnal.tsx', content);
