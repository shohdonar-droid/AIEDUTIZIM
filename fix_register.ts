import fs from 'fs';

let content = fs.readFileSync('src/pages/Register.tsx', 'utf8');

const replacement = `
      if (!userDoc.exists()) {
        let uyOrgId = '';
        const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
        const uySnap = await getDocs(q);
        if (!uySnap.empty) {
          uyOrgId = uySnap.docs[0].id;
        } else {
          try {
            const orgRef = doc(collection(db, 'users'));
            await setDoc(orgRef, {
               uid: orgRef.id,
               displayName: 'UY',
               role: 'teacher',
               createdAt: serverTimestamp(),
               login: 'uy_admin',
               password: 'uy_password',
               maxStudents: 99999,
               teachersCount: 99999,
               status: 'active'
            });
            uyOrgId = orgRef.id;
          } catch(e) { console.error(e) }
        }

        // Create new staff
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName || 'Xodim',
          email: user.email,
          role: 'staff',
          teacherId: uyOrgId,
          createdAt: serverTimestamp(),
          spentBalls: 0
        });
      } else {
         const existingData = userDoc.data();
         if (existingData?.role === 'staff' && !existingData.teacherId) {
            let uyOrgId = '';
            const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
            const uySnap = await getDocs(q);
            if (!uySnap.empty) uyOrgId = uySnap.docs[0].id;
            
            if (uyOrgId) {
               await setDoc(userDocRef, { teacherId: uyOrgId }, { merge: true });
            }
         }
      }
`;

content = content.replace(
  /if \(\!userDoc\.exists\(\)\) \{[\s\S]*?spentBalls: 0\s*\}\);\s*\}/,
  replacement
);

fs.writeFileSync('src/pages/Register.tsx', content);

