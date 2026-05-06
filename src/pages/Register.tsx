import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new staff
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName || 'Xodim',
          email: user.email,
          role: 'staff',
          createdAt: serverTimestamp(),
          spentBalls: 0
        });
      }
      
      try {
         const sessionRef = await addDoc(collection(db, 'activityLogs'), {
           userId: user.uid,
           userDisplayName: user.displayName || 'Xodim',
           role: userDoc.exists() ? userDoc.data()?.role : 'staff',
           loginTime: Date.now(),
           logoutTime: null,
           durationMinutes: 0
         });
         localStorage.setItem('sessionId', sessionRef.id);
         localStorage.setItem('sessionStart', Date.now().toString());
      } catch (e) {}

      await refreshUser();
      const finalRole = userDoc.exists() ? userDoc.data()?.role : 'staff';
      if (finalRole === 'admin') navigate('/admin');
      else if (finalRole === 'teacher' || finalRole === 'staff') navigate('/teacher');
      else navigate('/student');
      
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Oyna yopildi.");
      } else {
        setError('Xatolik yuz berdi: ' + err.message);
      }
      auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 relative overflow-hidden my-8">
      <div className="max-w-[450px] w-full mac-window relative z-10">
        <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-6 shadow-sm border border-blue-100/50">
              <BrainCircuit className="h-8 w-8 text-[#007aff]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Ro'yxatdan o'tish</h2>
            <div className="space-y-4 mb-4">
              <p className="text-gray-600 font-medium leading-relaxed">
                Platformadan foydalanish va interaktiv testlar yaratish uchun Google orqali tizimga kiring.
              </p>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 font-medium rounded-xl mb-6 text-sm">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black shadow-sm hover:bg-gray-50 transition-all mb-4"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              GOOGLE ORQALI KIRISH
            </button>

            <Link to="/login" className="inline-block text-sm text-blue-600 border-b border-blue-600/30 font-semibold hover:border-blue-600 transition-colors">
              Alallaqachon hisobingiz bormi? Kirish
            </Link>
        </div>
      </div>
    </div>
  );
}
