const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace(/const \{ user, isAdmin \} = useAuth\(\);/, 'const { user, isAdmin, logout } = useAuth();');

const oldHandleLogout = `  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    const sessionStart = localStorage.getItem('sessionStart');
    
    if (sessionId && sessionStart) {
      const durationMinutes = Math.round((Date.now() - parseInt(sessionStart)) / 60000);
      try {
        await updateDoc(doc(db, 'activityLogs', sessionId), {
          logoutTime: Date.now(),
          durationMinutes: durationMinutes
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, \`activityLogs/\${sessionId}\`);
      }
    }
    
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionStart');
    localStorage.removeItem('lastActivityTime');
    auth.signOut();
  };`;

const newHandleLogout = `  const handleLogout = async () => {
    await logout();
  };`;

code = code.replace(oldHandleLogout, newHandleLogout);
fs.writeFileSync('src/components/Navbar.tsx', code);
console.log("Patched Navbar");
