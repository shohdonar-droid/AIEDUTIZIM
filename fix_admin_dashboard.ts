import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

// Add CheckCircle2 import
content = content.replace(/Wallet\n\} from 'lucide-react';/, "Wallet,\n  CheckCircle2\n} from 'lucide-react';");

// Import AdminQuizizz
content = content.replace(/import AdminBilling from '\.\/AdminBilling';/, "import AdminBilling from './AdminBilling';\nimport AdminQuizizz from './AdminQuizizz';");

// Update menuItems
content = content.replace(/  const menuItems = \[\s*\{ name: 'Umumiy', path: '\/admin', icon: LayoutDashboard \},[\s\S]*?\{ name: 'Chat', path: '\/admin\/chat', icon: MessageSquare, badge: unreadCount \},\s*\];/m, `  const menuItems = [
    { name: 'Umumiy', path: '/admin', icon: LayoutDashboard },
    { name: 'Banner', path: '/admin/banner', icon: ImageIcon },
    { name: 'Info', path: '/admin/info', icon: Info },
    { name: 'Kurslar', path: '/admin/courses', icon: BookOpen },
    { name: 'Testlar', path: '/admin/tests', icon: Brain },
    { name: 'Quizizz', path: '/admin/quizizz', icon: CheckCircle2 },
    { name: 'Mavzular', path: '/admin/subjects', icon: BookOpen },
    { name: 'Yo\\'nalishlar', path: '/admin/departments', icon: UsersIcon },
    { name: 'Foydalanuvchilar', path: '/admin/users', icon: UsersIcon },
    { name: 'Jurnal', path: '/admin/jurnal', icon: TrendingUp },
    { name: 'Sertifikatlar', path: '/admin/certificates', icon: Award },
    { name: 'FOOTER', path: '/admin/footer', icon: Dock },
    { name: 'Bildirishnomalar', path: '/admin/notifications', icon: AlertCircle },
    { name: 'Billing', path: '/admin/billing', icon: Wallet },
    { name: 'Chat', path: '/admin/chat', icon: MessageSquare, badge: unreadCount },
  ];`);

// Add Route for Quizizz
content = content.replace(/<Route path="\/notifications" element=\{<AdminNotifications \/>\} \/>/, `<Route path="/notifications" element={<AdminNotifications />} />\n            <Route path="/quizizz" element={<AdminQuizizz />} />`);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', content);
