import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
      await updateDoc(doc(db, 'users', user.uid), formData);
      alert('Ma\'lumotlar yangilandi!');
      window.location.reload(); // Quick refresh to update context
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shaxsiy profil</h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'staff' ? 'Xodim profil ma\'lumotlarini boshqarish.' : 'Tashkilot ma\'lumotlarini boshqarish.'}
          </p>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Picture Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-40 h-40 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden ring-4 ring-white shadow-2xl">
                {formData.photoURL ? (
                  <img src={formData.photoURL || null} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-16 w-16" />
                )}
              </div>
              <div className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-8 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center uppercase tracking-wider">Rasm URL</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                placeholder="https://example.com/avatar.jpg"
                value={formData.photoURL}
                onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  {user?.role === 'staff' ? 'F.I.SH' : 'Tashkilot nomi'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  <Mail className="h-4 w-4 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Tel raqam
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Login
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                  value={user?.login || '-'}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                O'zgarishlarni saqlash
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
