const fs = require('fs');
let code = fs.readFileSync('src/pages/student/StudentDashboard.tsx', 'utf8');

code = code.replace(/const \{ user \} = useAuth\(\);/, 'const { user, logout } = useAuth();');
code = code.replace(/const handleLogout = \(\) => auth\.signOut\(\);/, 'const handleLogout = () => logout();');

fs.writeFileSync('src/pages/student/StudentDashboard.tsx', code);
console.log("Patched StudentDashboard");
