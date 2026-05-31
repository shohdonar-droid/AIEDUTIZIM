import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, BrainCircuit } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<'admin' | 'teacher' | 'student' | 'staff'>('student');
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoToken = params.get('auto');
    if (autoToken && !user) {
      try {
         const decoded = atob(autoToken);
         const separatorIdx = decoded.indexOf(':');
         if (separatorIdx !== -1) {
            const email = decoded.slice(0, separatorIdx);
            const pass = decoded.slice(separatorIdx + 1);
            setLoading(true);
            signInWithEmailAndPassword(auth, email, pass).then(res => {
               // success, useAuth will handle redirect via the other useEffect
            }).catch(e => {
               setError("Avtomatik kirishda xatolik: " + e.message);
               setLoading(false);
            });
         }
      } catch (e) {
         console.error('Invalid auto login token');
      }
    }
  }, [user]);

  useEffect(() => {
      if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher' || user.role === 'staff') navigate('/teacher');
      else navigate('/student');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedLogin = loginField.trim();
    const loginPass = password;

    const ADMIN_LOGIN = 'Elyorbek';
    const ADMIN_PASS = '1104aA'; 
    const ADMIN_EMAIL = 'elyorbek@admin.uz';

    try {
      let actualEmail = '';
      
      const ADMIN_LOGIN = 'Elyorbek';
      const ADMIN_PASS = '1104aA'; 
      const ADMIN_EMAIL = 'elyorbek@admin.uz';

      const trimmedLogin = loginField.trim();
      const loginPass = password;

      // Deterministic Email Derivation
      if (trimmedLogin.toLowerCase() === ADMIN_LOGIN.toLowerCase()) {
        actualEmail = ADMIN_EMAIL;
      } else if (trimmedLogin.includes('@')) {
        actualEmail = trimmedLogin.toLowerCase();
      } else {
        // Derive based on role
        if (activeRole === 'admin') {
          actualEmail = ADMIN_EMAIL;
        } else if (activeRole === 'teacher' || activeRole === 'staff') {
          actualEmail = `${trimmedLogin.toLowerCase()}@teacher.uz`;
        } else {
          actualEmail = `${trimmedLogin.toLowerCase()}@student.uz`;
        }
      }

      // If we have an actualEmail, try to authenticate
      if (!actualEmail) {
         setError('Tizimga kirish uchun elektron pochta manzili topilmadi.');
         setLoading(false);
         return;
      }

      try {
        const res = await signInWithEmailAndPassword(auth, actualEmail, loginPass);
        let userDoc = await getDoc(doc(db, 'users', res.user.uid));
        
        // Agar hardcoded admin bo'lsa va doc yo'q bo'lsa -> SEAMLESS yaratamiz
        if (!userDoc.exists() && trimmedLogin.toLowerCase() === ADMIN_LOGIN.toLowerCase()) {
          const userDocParams = {
            uid: res.user.uid,
            displayName: `Elyorbek (Admin)`,
            firstName: 'Elyorbek',
            lastName: 'Admin',
            email: ADMIN_EMAIL,
            login: ADMIN_LOGIN,
            role: 'admin',
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', res.user.uid), userDocParams);
          userDoc = await getDoc(doc(db, 'users', res.user.uid));
        }

        if (userDoc.exists()) {
          const role = userDoc.data().role;
          
          if (role !== activeRole) {
             const rName = activeRole === 'admin' ? 'Admin' : activeRole === 'teacher' ? 'Tashkilot' : (activeRole === 'staff' ? 'Xodim' : 'Talaba');
             const actualRoleName = role === 'admin' ? 'Admin' : role === 'teacher' ? 'Tashkilot' : (role === 'staff' ? 'Xodim' : 'Talaba');
             setError(`Ushbu hisob ${rName} emas, balki ${actualRoleName} profili. Iltimos, tepadan tegishli bo'limni tanlang.`);
             setLoading(false);
             await auth.signOut();
             return;
          }

          // Log activity
          try {
            const sessionRef = await addDoc(collection(db, 'activityLogs'), {
              userId: res.user.uid,
              userDisplayName: userDoc.data().displayName,
              role: role,
              loginTime: Date.now(),
              logoutTime: null,
              durationMinutes: 0
            });
            localStorage.setItem('sessionId', sessionRef.id);
            localStorage.setItem('sessionStart', Date.now().toString());
            localStorage.setItem('lastActivityTime', Date.now().toString());
            localStorage.removeItem('impersonateUserId'); // Clear any impersonation
            
            // Notify admins
            addDoc(collection(db, 'admin_notifications'), {
               text: `Yangi tizimga ulanish (Web):\n👤 F.I.SH: ${userDoc.data().displayName}\n🛡 Profil: ${role.toUpperCase()}`,
               timestamp: serverTimestamp()
            });
          } catch (e) {}

          await refreshUser();
          const dest = role === 'admin' ? '/admin' : (role === 'teacher' || role === 'staff' ? '/teacher' : '/student');
          navigate(dest);
        } else {
          setError('Profil hujjatlari topilmadi. Qaytadan ro\'yxatdan o\'ting.');
          await auth.signOut();
        }
      } catch (err: any) {
        // 2. Agar Firebase'da bunday user mutlaqo yo'q bo'lsa (yangi Admin)
        if (trimmedLogin.toLowerCase() === ADMIN_LOGIN.toLowerCase() && loginPass === ADMIN_PASS && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
          try {
            const res = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, loginPass);
            const userDocParams = {
              uid: res.user.uid,
              displayName: `Elyorbek (Admin)`,
              firstName: 'Elyorbek',
              lastName: 'Admin',
              email: ADMIN_EMAIL,
              login: ADMIN_LOGIN,
              role: 'admin',
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', res.user.uid), userDocParams);
            
            try {
              const sessionRef = await addDoc(collection(db, 'activityLogs'), {
                userId: res.user.uid,
                userDisplayName: userDocParams.displayName,
                role: userDocParams.role,
                loginTime: Date.now(),
                logoutTime: null,
                durationMinutes: 0
              });
              localStorage.setItem('sessionId', sessionRef.id);
              localStorage.setItem('sessionStart', Date.now().toString());
              localStorage.setItem('lastActivityTime', Date.now().toString());
            } catch (e) {}
            
            await refreshUser();
            navigate('/admin');
            return; 
          } catch (createErr: any) {
             setError('Admin profilini avtomatik yaratishda xato: ' + createErr.message);
          }
        } else {
           if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
             setError('Login yoki parol xato kiritildi.');
           } else {
             setError('Xatolik yuz berdi: ' + err.message);
           }
        }
      }
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-[400px] w-full mac-window relative z-10">
        <div className="h-10 bg-gray-100/80 backdrop-blur-md border-b border-gray-200/50 flex items-center px-4 relative">
          <div className="flex gap-2 z-10">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-semibold text-gray-500">Tizimga kirish</span>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-6 shadow-sm border border-blue-100/50">
              <BrainCircuit className="h-8 w-8 text-[#007aff]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Tizimga xush kelibsiz</h2>
            <p className="text-gray-500 text-sm font-medium">Davom etish uchun ma'lumotlarni kiriting</p>
          </div>

          <div className="flex p-1.5 bg-gray-100/80 rounded-2xl mb-8 gap-1 border border-gray-200/50">
            <button
              onClick={() => setActiveRole('admin')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                activeRole === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setActiveRole('teacher')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                activeRole === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tashkilot
            </button>
            <button
              onClick={() => setActiveRole('staff')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                activeRole === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Xodim
            </button>
            <button
              onClick={() => setActiveRole('student')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                activeRole === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Talaba
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Login</label>
              <input
                type="text"
                required
                className="block w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 shadow-sm placeholder-gray-400 font-medium"
                placeholder="Login..."
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 ml-1">Parol</label>
              <input
                type="password"
                required
                className="block w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 shadow-sm placeholder-gray-400 font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-600 text-xs font-semibold text-center bg-red-50 py-3 rounded-xl border border-red-100 px-4">
                {error}
                {error.includes('xato') && activeRole === 'student' && (
                   <p className="mt-1 text-[10px] text-gray-400 font-normal">Eslatma: Talaba sifatida ro'yxatdan o'tgan login va parolingizni kiriting.</p>
                )}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full flex justify-center items-center gap-2 mac-btn-primary mt-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Kirish
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/register" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors decoration-2 underline-offset-4">
              Xodim profilini Google orqali ochish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
