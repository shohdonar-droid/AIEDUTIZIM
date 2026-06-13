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
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout({ children, unreadCount, user }: { children: React.ReactNode, unreadCount: number, user: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Tizimdan chiqishni xohlaysizmi?")) {
      await logout();
    }
  };

  const menuItems = [
    { name: 'UMUMIY', path: '/admin', icon: LayoutGrid },
    { name: 'PROFIL', path: '/admin/profile', icon: UserIcon },
    { name: 'AI YORDAMCHI', path: '/admin/ai-assistant', icon: BrainCircuit },
    { name: 'BANNER', path: '/admin/banner', icon: ImageIcon },
    { name: 'MA\'LUMOT', path: '/admin/info', icon: Info },
    { name: 'KURSLAR', path: '/admin/courses', icon: BookOpen },
    { name: 'TESTLAR', path: '/admin/tests', icon: Brain },
    { name: 'QUIZIZZ', path: '/admin/quizizz', icon: CheckCircle2 },
    { name: 'MAVZULAR', path: '/admin/subjects', icon: BookOpen },
    { name: 'YO\'NALISHLAR', path: '/admin/departments', icon: UsersIcon },
    { name: 'FOYDALANUVCHILAR', path: '/admin/users', icon: UsersIcon },
    { name: 'JURNAL', path: '/admin/jurnal', icon: TrendingUp },
    { name: 'SERTIFIKATLAR', path: '/admin/certificates', icon: Award },
    { name: 'FOOTER', path: '/admin/footer', icon: Dock },
    { name: 'BILDIRISHNOMALAR', path: '/admin/notifications', icon: AlertCircle },
    { name: 'HISOB-KITOB', path: '/admin/billing', icon: Wallet },
    { name: 'CHAT', path: '/admin/chat', icon: MessageSquare, badge: unreadCount },
  ].filter(item => {
    if (user?.role === 'subadmin') {
      return !['BANNER', 'MA\'LUMOT', 'FOOTER'].includes(item.name);
    }
    return true;
  });

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
                <span className="font-bold text-[9px] text-blue-600 tracking-widest uppercase mt-1">
                  {user?.role === 'subadmin' ? 'KICHIK ADMINISTRATOR' : 'ADMINISTRATOR'}
                </span>
              </div>
            )}
          </div>
          
          {/* Slider trigger hovering on the boundary line */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3.5 top-7 w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-md text-gray-400 hover:text-gray-900 cursor-pointer z-50 hover:scale-105 transition"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300", isSidebarOpen ? "rotate-185" : "rotate-0")} />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto py-5 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isChat = item.name === 'CHAT';
            
            return (
              <NavLink 
                key={item.path} 
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => cn(
                  "mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-200 border border-transparent",
                  isActive 
                    ? "bg-[#EFF6FF] border-[#BFDBFE]/40 text-blue-600 shadow-sm font-black" 
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/50"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                    {isSidebarOpen && (
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
          })}
        </div>

        {/* Bottom Actions Block */}
        <div className="p-4 border-t border-gray-100 space-y-1 shrink-0 bg-white">
          <NavLink 
            to="/" 
            className="mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase text-slate-400 hover:text-slate-700 hover:bg-slate-50/50 transition-all"
          >
            <Home className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            {isSidebarOpen && <span className="truncate">SAYTGA QAYTISH</span>}
          </NavLink>
          
          <button 
            onClick={handleLogout}
            className="w-full mx-4 px-5 py-3.5 flex items-center gap-4 rounded-2xl text-[11px] font-black tracking-widest uppercase text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-all border border-transparent"
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
                    {user?.role === 'subadmin' ? 'KICHIK ADMINISTRATOR' : 'ADMINISTRATOR'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 [scrollbar-width:none]">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isChat = item.name === 'CHAT';
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "px-4 py-3 flex items-center gap-3.5 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all",
                      isActive
                        ? "bg-[#EFF6FF] border-[#BFDBFE]/40 text-blue-600 font-extrabold"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/50"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {isChat && (
                      <span className="ml-auto text-slate-400 text-xs font-bold">
                        {item.badge !== undefined ? item.badge : 0}
                      </span>
                    )}
                  </NavLink>
                );
              })}
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
            <button className="p-2.5 text-slate-400 hover:text-slate-755 hover:bg-slate-50 rounded-xl transition">
              <Bell className="h-5 w-5" />
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
