import fs from 'fs';

let content = fs.readFileSync('src/pages/teacher/TeacherChat.tsx', 'utf8');

const replacement = `
      // Load org students
      const sSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', orgId)));
      const students = sSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      
      // Load org staff
      let staff: UserProfile[] = [];
      const stSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'staff'), where('teacherId', '==', orgId)));
      staff = stSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)).filter(s => s.uid !== user?.uid);
`;

content = content.replace(
  /\/\/ Load org students\s*const sSnap = await getDocs\(query\(collection\(db, 'users'\), where\('role', '==', 'student'\), where\('teacherId', '==', orgId\)\)\);\s*const students = sSnap\.docs\.map\(d => \(\{ \.\.\.d\.data\(\), uid: d\.id \} as UserProfile\)\);\s*\/\/ Load org staff\s*let staff: UserProfile\[\] = \[\];\s*if \(user\?\.role === 'teacher'\) \{\s*const stSnap = await getDocs\(query\(collection\(db, 'users'\), where\('role', '==', 'staff'\), where\('teacherId', '==', orgId\)\)\);\s*staff = stSnap\.docs\.map\(d => \(\{ \.\.\.d\.data\(\), uid: d\.id \} as UserProfile\)\);\s*\}/,
  replacement
);

fs.writeFileSync('src/pages/teacher/TeacherChat.tsx', content);

