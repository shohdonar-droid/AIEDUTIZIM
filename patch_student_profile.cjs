const fs = require('fs');
let content = fs.readFileSync('src/pages/student/StudentProfile.tsx', 'utf8');

// 1. Add safeOnSnapshot to imports if missing
if (!content.includes('import safeOnSnapshot')) {
  content = content.replace("import { db, auth } from '../../lib/firebase';", "import { db, auth } from '../../lib/firebase';\nimport safeOnSnapshot from '../../lib/safeSnapshot';");
}

// 2. Add local state and useEffect
const hookContent = `
  const { user, refreshUser } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = safeOnSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setLocalUser({ uid: snap.id, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);
`;
content = content.replace('const { user, refreshUser } = useAuth();', hookContent);

// 3. Replace (user as any) with localUser
content = content.replace(/\(user as any\)\?\.telegramLinked/g, 'localUser?.telegramLinked');

fs.writeFileSync('src/pages/student/StudentProfile.tsx', content);
