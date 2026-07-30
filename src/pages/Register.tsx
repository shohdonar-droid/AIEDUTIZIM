import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { getNextSequentialId } from '../lib/idUtils';
import { generatePassword } from '../lib/helpers';

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
      
      const ADMIN_EMAILS = ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'];
      const isUserAdmin = ADMIN_EMAILS.includes(user.email || '');

      // Get UY Home account ID
      let uyOrgId = '';
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
      const uySnap = await getDocs(q);
      if (!uySnap.empty) {
        uyOrgId = uySnap.docs[0].id;
      } else {
        const uyRef = await addDoc(collection(db, 'users'), {
          displayName: 'UY',
          role: 'teacher',
          status: 'active',
          createdAt: serverTimestamp(),
          limit_departments: 9999,
          limit_groups: 9999,
          limit_students: 9999,
          limit_subjects: 9999,
          limit_tests: 9999,
          limit_quizizz: 9999,
          limit_exams: 9999,
          limit_certificates: 9999
        });
        uyOrgId = uyRef.id;
      }

      if (isUserAdmin) {
        // If it's an admin, just write default admin document if it doesn't exist
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || "Admin",
            email: user.email,
            role: 'admin',
            createdAt: serverTimestamp(),
            status: 'active'
          });
        }
      } else {
        // If they are not admin, force them to mustaqil_o_qituvchi with teacherId = uyOrgId!
        // Whether they exist or not, update or merge key properties.
        const defaultLimits = {
          limit_departments: 1,
          limit_groups: 1,
          limit_students: 5,
          limit_subjects: 2,
          limit_tests: 2,
          limit_quizizz: 1,
          limit_exams: 1,
          limit_courses: 0,
          limit_certificates: 5,
          limit_tests_per_subject: 10,
          limit_questions_per_test: 10,
          limit_questions_per_quizizz: 5,
          limit_questions_per_exam: 10,
        };

        if (!userDoc.exists()) {
          // Check if this email exists as a pre-created staff/student doc that hasn't registered with Auth UID yet
          const qEmail = query(collection(db, 'users'), where('email', '==', user.email));
          const emailSnap = await getDocs(qEmail);

          if (!emailSnap.empty) {
            const existingData = emailSnap.docs[0].data();
            await setDoc(userDocRef, {
              ...existingData,
              uid: user.uid,
              role: 'mustaqil_o_qituvchi',
              teacherId: uyOrgId,
              ...defaultLimits // ensure limits are set
            });
          } else {
            const nextId = await getNextSequentialId('mustaqil_o_qituvchi');
            const pass = generatePassword();
            await setDoc(userDocRef, {
              uid: user.uid,
              displayName: user.displayName || "Mustaqil O'qituvchi",
              email: user.email,
              login: nextId,
              systemId: nextId,
              password: pass,
              role: 'mustaqil_o_qituvchi',
              teacherId: uyOrgId,
              createdAt: serverTimestamp(),
              status: 'active',
              total_spent: 0,
              ...defaultLimits
            });
            // Optionally alert the user about their new ID and password,
            // but that's hard with the current redirect logic.
            // For now, save them and assume the user can log in with them later.
          }
        } else {
          // Document exists, update it to be a mustaqil_o_qituvchi and assign to UY
          const existingData = userDoc.data();
          const mergedLimits = {
            limit_departments: existingData.limit_departments ?? defaultLimits.limit_departments,
            limit_groups: existingData.limit_groups ?? defaultLimits.limit_groups,
            limit_students: existingData.limit_students ?? defaultLimits.limit_students,
            limit_subjects: existingData.limit_subjects ?? defaultLimits.limit_subjects,
            limit_tests: existingData.limit_tests ?? defaultLimits.limit_tests,
            limit_quizizz: existingData.limit_quizizz ?? defaultLimits.limit_quizizz,
            limit_exams: existingData.limit_exams ?? defaultLimits.limit_exams,
            limit_certificates: existingData.limit_certificates ?? defaultLimits.limit_certificates,
            limit_courses: existingData.limit_courses ?? defaultLimits.limit_courses,
            limit_tests_per_subject: existingData.limit_tests_per_subject ?? defaultLimits.limit_tests_per_subject,
            limit_questions_per_test: existingData.limit_questions_per_test ?? defaultLimits.limit_questions_per_test,
            limit_questions_per_quizizz: existingData.limit_questions_per_quizizz ?? defaultLimits.limit_questions_per_quizizz,
            limit_questions_per_exam: existingData.limit_questions_per_exam ?? defaultLimits.limit_questions_per_exam,
          };
          
          await setDoc(userDocRef, {
            ...existingData,
            role: 'mustaqil_o_qituvchi',
            teacherId: uyOrgId,
            ...mergedLimits
          }, { merge: true });
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
