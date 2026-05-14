import fs from 'fs';

let content = fs.readFileSync('src/pages/teacher/TeacherChat.tsx', 'utf8');

const replacement = `
      // Load org students
      const sSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', orgId)));
      const students = sSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      
      // Load org staff
      let staff: UserProfile[] = [];
      if (user?.role === 'teacher') {
         const stSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'staff'), where('teacherId', '==', orgId)));
         staff = stSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      }
`;

content = content.replace(
  /\/\/ Load org students\s*const sSnap = await getDocs\(query\(collection\(db, 'users'\), where\('role', '==', 'student'\), where\('teacherId', '==', orgId\)\)\);\s*const students = sSnap\.docs\.map\(d => \(\{ \.\.\.d\.data\(\), uid: d\.id \} as UserProfile\)\);/,
  replacement
);

content = content.replace(
  /finalContacts\.push\(\.\.\.students\);/g,
  `finalContacts.push(...staff);
      finalContacts.push(...students);`
);

content = content.replace(
  /<p className="text-xs text-gray-500 capitalize">{c.role === 'admin' \? 'Admin' : c.role === 'teacher' \? 'Tashkilot' : 'Talaba'}<\/p>/g,
  `<p className="text-xs text-gray-500 capitalize">{c.role === 'admin' ? 'Admin' : c.role === 'teacher' ? 'Tashkilot' : c.role === 'staff' ? 'Xodim' : 'Talaba'}</p>`
);

content = content.replace(
  /<span className="ml-2 text-sm text-gray-500 capitalize px-2 py-0\.5 bg-gray-100 rounded-lg">{selectedContact.role === 'admin' \? 'Admin' : selectedContact.role === 'teacher' \? 'Tashkilot' : 'Talaba'}<\/span>/g,
  `<span className="ml-2 text-sm text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-lg">{selectedContact.role === 'admin' ? 'Admin' : selectedContact.role === 'teacher' ? 'Tashkilot' : selectedContact.role === 'staff' ? 'Xodim' : 'Talaba'}</span>`
);

fs.writeFileSync('src/pages/teacher/TeacherChat.tsx', content);

