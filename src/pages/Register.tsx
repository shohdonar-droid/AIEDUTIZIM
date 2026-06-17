import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        const qEmail = query(collection(db, 'users'), where('email', '==', user.email));
        const emailSnap = await getDocs(qEmail);

        if (emailSnap.empty) {
          // New Independent Teacher / Mustaqil O'qituvchi
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || "Mustaqil O'qituvchi",
            email: user.email,
            role: 'mustaqil_o_qituvchi',
            createdAt: serverTimestamp(),
            
            // Boshlang'ich limitlar
            limit_departments: 1,
            limit_groups: 1,
            limit_students: 5,
            limit_subjects: 2,
            limit_tests: 2,
            limit_quizizz: 1,
            limit_exams: 1,
            limit_courses: 0,
            limit_certificates: 5,
            
            // Har bir resurs miqdori qoidalari
            limit_tests_per_subject: 10,
            limit_questions_per_test: 10,
            limit_questions_per_quizizz: 5,
            limit_questions_per_exam: 10,
            
            total_spent: 0,
            status: 'active'
          });
        } else {
          // Linking to pre-created student or staff record
          const existingUserDoc = emailSnap.docs[0];
          await setDoc(userDocRef, {
            ...existingUserDoc.data(),
            uid: user.uid
          });
        }
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
         localStorage.setItem('lastActivityTime', Date.now().toString());
      } catch (e) {}

      await refreshUser();
      const finalRole = userDoc.exists() ? userDoc.data()?.role : 'mustaqil_o_qituvchi';
      if (finalRole === 'admin') navigate('/admin');
      else if (finalRole === 'teacher' || finalRole === 'staff' || finalRole === 'mustaqil_o_qituvchi') navigate('/teacher');
      else navigate('/student');
      
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Oyna yopildi.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Xatolik: Ushbu domen Firebase konsolida ruxsat etilgan domenlar ro'yxatiga kiritilmagan. Iltimos, Firebase konsolidan Authentication bo'limiga o'tib, 'Settings' -> 'Authorized domains' qismiga joriy domen va preview domenlarini qo'shing.");
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
