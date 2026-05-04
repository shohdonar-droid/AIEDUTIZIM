import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, BrainCircuit } from 'lucide-react';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, Department, Group } from '../types';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    login: '',
    password: '',
    teacherId: '',
    departmentId: '',
    groupId: '',
  });
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    async function loadTeachers() {
      try {
        const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
        const ts = tSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)) as UserProfile[];
        ts.sort((a,b) => (a.displayName || '').localeCompare(b.displayName || '', 'uz-UZ'));
        setTeachers(ts);
      } catch (err) {
        console.error(err);
      }
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!formData.teacherId) {
      setDepartments([]);
      setFormData(prev => ({ ...prev, departmentId: '', groupId: '' }));
      return;
    }
    async function loadDepts() {
      const q = query(collection(db, 'departments'), where('creatorId', '==', formData.teacherId));
      const snap = await getDocs(q);
      const ds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
      ds.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setDepartments(ds);
    }
    loadDepts();
  }, [formData.teacherId]);

  useEffect(() => {
    if (!formData.departmentId) {
      setGroups([]);
      setFormData(prev => ({ ...prev, groupId: '' }));
      return;
    }
    async function loadGroups() {
      const q = query(collection(db, 'groups'), where('departmentId', '==', formData.departmentId));
      const snap = await getDocs(q);
      const gs = snap.docs.map(g => ({ id: g.id, ...g.data() } as Group));
      gs.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setGroups(gs);
    }
    loadGroups();
  }, [formData.departmentId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedLogin = formData.login.trim();
    if (!trimmedLogin) {
      setError("Login bo'sh bo'lishi mumkin emas.");
      setLoading(false);
      return;
    }

    try {
      // Create a case-insensitive check by fetching all users and matching manually
      // because Firestore doesn't support case-insensitive 'where'
      // For registration, we can just check if any user has this login (case-insensitive)
      const q = query(collection(db, 'users'));
      const qSnap = await getDocs(q);
      const exists = qSnap.docs.some(d => (d.data().login || '').toLowerCase() === trimmedLogin.toLowerCase());
      
      if (exists) {
         setError("Bu login allaqachon band. Iltimos boshqa login tanlang.");
         setLoading(false);
         return;
      }
    } catch (e) {
      console.error(e);
    }

    let pass = formData.password;
    let role = 'student';

    let emailToUse = `${trimmedLogin.toLowerCase()}_${Date.now()}@student.uz`;

    const teacherObj = teachers.find(t => t.uid === formData.teacherId);
    const teacherName = teacherObj?.displayName || '';
    const departmentName = departments.find(d => d.id === formData.departmentId)?.name || '';
    const groupName = groups.find(g => g.id === formData.groupId)?.name || '';

    try {
      const res = await createUserWithEmailAndPassword(auth, emailToUse, pass);
      
      await setDoc(doc(db, 'users', res.user.uid), {
        uid: res.user.uid,
        displayName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        phone: formData.phone,
        email: emailToUse,
        login: trimmedLogin,
        password: pass, // Requested behavior for simulated environment resets
        teacherId: formData.teacherId,
        teacherName: teacherName,
        departmentId: formData.departmentId,
        departmentName: departmentName,
        groupId: formData.groupId,
        groupName: groupName,
        role: role,
        createdAt: serverTimestamp(),
      });

      await refreshUser();
      navigate('/student');
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Bu login allaqachon band. Iltimos boshqa login tanlang.');
      } else if (err.code === 'auth/invalid-email') {
         setError('Yaroqsiz login formati kiritildi. Faqat harf va sonlardan foydalaning.');
      } else {
        setError('Xatolik yuz berdi: ' + err.message);
      }
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
            <div className="space-y-4 mb-8">
              <p className="text-gray-600 font-medium leading-relaxed">
                Talabalar o'z tashkilotlari (universitet/maktab) orqali ro'yxatdan o'tkaziladi. 
              </p>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-sm font-medium">
                Iltimos, login va parolingizni o'z tashkilotingiz ma'muriyatidan oling.
              </div>
            </div>
            <Link to="/login" className="inline-block w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
              KIRISH SAHIFASIGA QAYTISH
            </Link>
        </div>
      </div>
    </div>
  );
}
