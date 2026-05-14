import fs from 'fs';

let content = fs.readFileSync('src/pages/teacher/TeacherChat.tsx', 'utf8');

const replacement = `
      // Sort students alphabetically by FISH
      students.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'uz-UZ'));

      const finalContacts: UserProfile[] = [...sysContact];
      // Only show ONE admin, prioritizing Elyorbek
      if (adminToShow) {
         finalContacts.push({
            ...adminToShow,
            displayName: adminToShow.displayName?.includes('Elyorbek') ? 'Elyorbek (Admin)' : (adminToShow.displayName + ' (Admin)')
         });
      }
      if (ownerContact.length > 0) {
         finalContacts.push({
            ...ownerContact[0],
            displayName: \`Tashkilot (\${ownerContact[0].displayName})\`
         });
      }
      finalContacts.push(...students);
      setContacts(finalContacts);
`;

content = content.replace(/students\.sort\(\(a, b\) => \(a\.displayName \|\| ''\)\.localeCompare\(b\.displayName \|\| '', 'uz-UZ'\)\);\s*const finalContacts: UserProfile\[\] = \[\.\.\.sysContact\];\s*\/\/ Only show ONE admin, prioritizing Elyorbek\s*if \(adminToShow\) \{[\s\S]*?\}\s*finalContacts\.push\(\.\.\.ownerContact\);\s*finalContacts\.push\(\.\.\.students\);\s*setContacts\(finalContacts\);/, replacement);

content = content.replace(
  /<p className="text-xs text-gray-500 capitalize">{c\.role === 'admin' \? 'Admin' : 'Talaba'}<\/p>/g,
  `<p className="text-xs text-gray-500 capitalize">{c.role === 'admin' ? 'Admin' : c.role === 'teacher' ? 'Tashkilot' : 'Talaba'}</p>`
);

content = content.replace(
  /<span className="ml-2 text-sm text-gray-500 capitalize px-2 py-0\.5 bg-gray-100 rounded-lg">{selectedContact\.role === 'admin' \? 'Admin' : 'Talaba'}<\/span>/g,
  `<span className="ml-2 text-sm text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-lg">{selectedContact.role === 'admin' ? 'Admin' : selectedContact.role === 'teacher' ? 'Tashkilot' : 'Talaba'}</span>`
);

fs.writeFileSync('src/pages/teacher/TeacherChat.tsx', content);

