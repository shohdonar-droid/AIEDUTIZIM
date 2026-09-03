import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  User as UserIcon,
  BrainCircuit,
  ImageIcon,
  Info,
  BookOpen,
  Brain,
  CheckCircle2,
  Users as UsersIcon,
  TrendingUp,
  Award,
  Dock,
  AlertCircle,
  Wallet,
  MessageSquare,
  LogOut,
  Home,
  ChevronRight,
  Bell,
  Settings,
  Menu,
  X,
  HardDrive,
  Building2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout({ children, unreadCount, user }: { children: React.ReactNode, unreadCount: number, user: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Tizimdan chiqishni xohlaysizmi?")) {
      await logout();
    }
  };

  const toggleMenu = (id: string) => {
    setExpandedMenu(prev => (prev === id ? null : id));
  };

  const menuStructure = [
    { id: 'general', name: 'UMUMIY', path: '/admin', icon: LayoutGrid },
    { id: 'profile', name: 'PROFIL', path: '/admin/profile', icon: UserIcon },
    { id: 'ai', name: 'AI YORDAMCHI', path: '/admin/ai-assistant', icon: BrainCircuit },
    { id: 'academic', name: 'Akademik tuzilma', path: '/admin/academic', icon: Building2 },
    { id: 'users', name: 'Foydalanuvchilar', icon: UsersIcon, subItems: [
        { name: 'Adminlar', path: '/admin/users/admins' },
        { name: 'Tashkilotlar', path: '/admin/users/organizations' },
        { name: 'Xodimlar', path: '/admin/users/staff' },
        { name: 'Talabalar', path: '/admin/users/students' }
    ]},
    { id: 'resources', name: 'Ta\'lim resurslari', icon: BookOpen, subItems: [
        { name: 'Kurslar', path: '/admin/courses' },
        { name: 'Mavzular', path: '/admin/subjects' },
        { name: 'Imtihonlar', path: '/admin/tests' },
        { name: 'Quizizz', path: '/admin/quizizz' },
        { name: 'Sertifikatlar', path: '/admin/certificates' },
        { name: 'Avto Test', path: '/admin/auto-tests' }
    ]},
    { id: 'monitoring', name: 'Monitoring', icon: TrendingUp, subItems: [
        { name: 'Davomat', path: '/admin/attendance' },
        { name: 'Jurnallar', path: '/admin/jurnal' },
        { name: 'Hisobot', path: '/admin/reports' }
    ]},
    { id: 'site_mgmt', name: 'Sayt boshqaruvi', icon: ImageIcon, subItems: [
        { name: 'Banner', path: '/admin/banner' },
        { name: 'Info', path: '/admin/info' },
        { name: 'Footer', path: '/admin/footer' }
    ]},
    { id: 'billing', name: 'Billing', icon: Wallet, subItems: [
        { name: 'Tariflar', path: '/admin/billing' },
        { name: 'Monitoring', path: '/admin/billing/monitoring' },
        { name: 'Tizim xarajatlari va auditi', path: '/admin/billing/audit' },
        { name: 'Faol obunalar', path: '/admin/active-subscriptions' },
        { name: 'To\'lovlar tarixi', path: '/admin/payment-history' },
        { name: 'Ulanish so\'rovlari', path: '/admin/connection-requests' },
        { name: 'Promo kodlar', path: '/admin/promo-codes' }
    ]},
    { id: 'notifications', name: 'Bildirishnomalar', path: '/admin/notifications', icon: Bell },
    { id: 'chat', name: 'Chat', path: '/admin/chat', icon: MessageSquare, badge: unreadCount },
    { id: 'settings', name: 'Tizim imkoniyatlari', icon: Settings, subItems: [
        { name: 'Xavfsizlik', path: '/admin/settings/security' },
        { name: 'Dizayn', path: '/admin/settings/design' },
        { name: 'Integratsiyalar', path: '/admin/settings/integrations' },
        { name: 'Tizim loglari', path: '/admin/system-logs' },
        { name: 'AI sozlamalari', path: '/admin/settings/ai' },
        { name: 'To\'lov sozlamalari', path: '/admin/settings/payments' },
        { name: 'Zaxira nusxa', path: '/admin/backup' }
    ]}
  ];

  const renderMenuItem = (item: any, isMobile = false) => {
    const Icon = item.icon;
    const isExpanded = expandedMenu === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isChat = item.id === 'chat';

    if (hasSubItems) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggleMenu(item.id)}
            className={cn(
              "w-full px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-200 border border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50",
              !isSidebarOpen && !isMobile && "justify-center px-0 mx-4"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0")} />
            {(isSidebarOpen || isMobile) && (
              <>
                <span className="truncate">{item.name}</span>
                <ChevronRight className={cn("ml-auto h-3.5 w-3.5 transition-transform duration-200", isExpanded ? "rotate-90" : "")} />
              </>
            )}
          </button>
          
          {(isExpanded && (isSidebarOpen || isMobile)) && (
            <div className={cn("ml-10 space-y-1 border-l-2 border-slate-100 pl-4 mb-2")}>
              {item.subItems.map((sub: any) => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "block py-2 text-[10px] font-bold tracking-wider uppercase transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {sub.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink 
        key={item.id} 
        to={item.path}
        end={item.path === '/admin'}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) => cn(
          "mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-200 border border-transparent",
          isActive 
            ? "bg-[#EFF6FF] border-[#BFDBFE]/40 text-blue-600 shadow-sm font-black" 
            : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/50",
          !isSidebarOpen && !isMobile && "justify-center px-0"
        )}
      >
        {({ isActive }) => (
          <>
            <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
            {(isSidebarOpen || isMobile) && (
              <>
                <span className="truncate">{item.name}</span>
                {isChat && (
                  <span className="ml-auto text-slate-400 text-xs font-bold font-sans">
                    {item.badge !== undefined ? item.badge : 0}
                  </span>
                )}
                {isActive && !isChat && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-500 animate-pulse" />
                )}
              </>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-white text-slate-500 transition-all duration-300 border-r border-gray-100 relative h-screen z-40 shrink-0", 
          isSidebarOpen ? "w-72" : "w-20"
        )}
      >
        {/* Profile Card Header */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100 relative h-20 shrink-0">
          <div className={cn("flex items-center gap-4.5 overflow-hidden w-full", !isSidebarOpen && "justify-center")}>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/30">
              <LayoutGrid className="h-6 w-6" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-extrabold text-slate-800 text-sm tracking-tight uppercase truncate">
                  {user?.displayName || "ELYORBEK (ADMIN)"}
                </span>
                <span className="font-bold text-[9px] text-blue-600 tracking-widest uppercase mt-0.5">
                  {user?.role === 'superadmin' ? 'SUPER ADMINISTRATOR' : (user?.role === 'subadmin' ? 'KICHIK ADMINISTRATOR' : 'ADMINISTRATOR')}
                </span>
                <span className="font-black text-xs text-amber-600 font-mono tracking-wider mt-1">
                  ID: {user?.systemId || user?.uid}
                </span>
                <span className="font-black text-[10px] text-emerald-600 font-mono tracking-wide mt-0.5">
                  Balans: {((user as any)?.balance || 0).toLocaleString()} UZS
                </span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-md text-gray-400 hover:text-gray-900 cursor-pointer z-50 hover:scale-105 transition"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300", isSidebarOpen ? "rotate-180" : "rotate-0")} />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto py-5 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menuStructure.map(item => renderMenuItem(item))}
        </div>

        {/* Bottom Actions Block */}
        <div className="p-4 border-t border-gray-100 space-y-1 shrink-0 bg-white">
          <NavLink 
            to="/" 
            className={cn(
              "mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase text-slate-400 hover:text-slate-700 hover:bg-slate-50/50 transition-all",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <Home className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            {isSidebarOpen && <span className="truncate">SAYTGA QAYTISH</span>}
          </NavLink>
          
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-all border border-transparent",
              !isSidebarOpen && "justify-center px-0 mx-0 ml-4 hover:bg-red-50"
            )}
          >
            <LogOut className="h-4.5 w-4.5 text-red-400 shrink-0" />
            {isSidebarOpen && <span className="truncate text-left font-black">CHIQISH</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 md:hidden flex" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-72 bg-white h-full flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-5 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-800 text-xs uppercase truncate w-36">
                    {user?.displayName || "ADMIN"}
                  </span>
                  <span className="font-bold text-[9px] text-blue-600 uppercase">
                    {user?.role === 'superadmin' ? 'SUPER ADMINISTRATOR' : 'ADMINISTRATOR'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 [scrollbar-width:none]">
              {menuStructure.map(item => renderMenuItem(item, true))}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-1 mt-auto">
              <NavLink
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 flex items-center gap-3.5 rounded-2xl text-[11px] font-extrabold tracking-widest uppercase text-slate-400 hover:text-slate-700 hover:bg-slate-50/50 transition-all"
              >
                <Home className="h-4.5 w-4.5 text-slate-400" />
                <span>SAYTGA QAYTISH</span>
              </NavLink>
              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full px-4 py-3 flex items-center gap-3.5 rounded-2xl text-[11px] font-extrabold tracking-widest uppercase text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-all"
              >
                <LogOut className="h-4.5 w-4.5 text-red-400 shrink-0" />
                <span className="text-left font-black">CHIQISH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex flex-col">
              <span className="text-xs text-blue-600 font-bold tracking-widest uppercase">
                Panel boshqaruvi
              </span>
              <span className="text-base text-slate-800 font-bold tracking-tight">
                Xush kelibsiz, {user?.displayName || "Elyorbek"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span className="font-mono">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            <button className="p-2.5 text-slate-400 hover:text-slate-755 hover:bg-slate-50 rounded-xl transition relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={() => navigate('/admin/profile')}
              className="p-2.5 text-slate-400 hover:text-slate-755 hover:bg-slate-50 rounded-xl transition"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/60">
          {children}
        </main>
      </div>

    </div>
  );
}
