import fs from 'fs';

let adminJurnal = fs.readFileSync('src/pages/admin/AdminJurnal.tsx', 'utf8');

adminJurnal = adminJurnal.replace(
  /\{activeTab === 'quizizz' && \([\s\S]*?\}\s*<\/div>\s*\)\}/,
  ''
);

fs.writeFileSync('src/pages/admin/AdminJurnal.tsx', adminJurnal);
