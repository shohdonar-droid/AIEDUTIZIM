import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Camera, Save, Loader2, Mail, Phone, Calendar, User as UserIcon } from 'lucide-react';

export default function TeacherProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), formData, { merge: true });
      alert('Ma\'lumotlar yangilandi!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
      <header className="px-4 lg:px-0">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          Shaxsiy profil
        </h1>
        <p className="text-gray-500 mt-2 text-base max-w-lg">
          {user?.role === 'staff' ? 'Xodim profil ma\'lumotlarini boshqarish.' : 'Tashkilot ma\'lumotlarini boshqarish.'}
        </p>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 lg:px-0">
        {/* Profile Picture Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden ring-2 ring-white shadow-lg">
                {formData.photoURL ? (
                  <img src={formData.photoURL || null} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-12 w-12" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-6 w-full">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider text-center">Rasm URL</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-center"
                placeholder="https://example.com/avatar.jpg"
                value={formData.photoURL}
                onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  <UserIcon className="h-3.5 w-3.5" />
                  {user?.role === 'staff' ? 'F.I.SH' : 'Tashkilot nomi'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium text-gray-900"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </label>
                <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-500 cursor-not-allowed">
                  {formData.email}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  <Phone className="h-3.5 w-3.5" />
                  Tel raqam
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium text-gray-900"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Login
                </label>
                <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-500">
                  {user?.login || '-'}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="flex items-center gap-2 text-xs font-black text-amber-600 mb-2 uppercase tracking-widest">
                Platforma ID (UID)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-800 select-all font-mono text-sm">
                  {user?.platformUid || user?.uid}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const uIdToCopy = user?.platformUid || user?.uid;
                    if (uIdToCopy) {
                      navigator.clipboard.writeText(uIdToCopy);
                      alert("UID nusxalandi! To'lov ilovasida ushbu ID orqali to'lov qilishingiz mumkin.");
                    }
                  }}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0"
                >
                  Nusxalash
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 font-bold">
                💡 Payme, Click yoki Uzum Bank ilovasida ushbu 6 xonali ID raqamingiz orqali balansni to'ldirishingiz mumkin.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                SAQLASH
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>

  );
}
