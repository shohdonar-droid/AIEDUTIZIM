import fs from 'fs';

let content = fs.readFileSync('src/pages/teacher/TeacherChat.tsx', 'utf8');

const replacement = `
      let orgId = user?.role === 'staff' ? user.teacherId : user?.uid;
      if (user?.role === 'staff' && !orgId) {
         // Fallback to UY
         const qUy = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
         const uySnap = await getDocs(qUy);
         if (!uySnap.empty) {
            orgId = uySnap.docs[0].id;
         }
      }
      if (!orgId) return;
`;

content = content.replace(
  /const orgId = user\?\.role === 'staff' \? user\.teacherId : user\?\.uid;\s*if \(\!orgId\) return;/,
  replacement
);

fs.writeFileSync('src/pages/teacher/TeacherChat.tsx', content);
