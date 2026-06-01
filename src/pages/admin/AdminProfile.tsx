import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, Save, Loader2, Mail, Phone, Calendar, User as UserIcon, Shield } from 'lucide-react';

export default function AdminProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    photoURL: user?.photoURL || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      alert('Ma\'lumotlar muvaffaqiyatli yangilandi!');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + (err instanceof Error ? err.message : 'Noma\'lum xato'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
      <header>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Shield className="h-10 w-10 text-blue-600" /> Shaxsiy profil
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Tizim administratorining shaxsiy va aloqa ma'lumotlarini tahrirlash burchagi.
        </p>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Picture Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-40 h-40 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 overflow-hidden ring-4 ring-white shadow-2xl">
                {formData.photoURL ? (
                  <img src={formData.photoURL || null} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-16 w-16" />
                )}
              </div>
              <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-8 w-full">
              <label className="block text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wider">Rasm Sarlavhasi (URL)</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-center"
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
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  {user?.role === 'subadmin' ? "Kichik admin" : "Administrator"} FISH
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  <Mail className="h-4 w-4 text-amber-500" />
                  E-pochta (O'zgarmas)
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-gray-500 select-all cursor-not-allowed">
                  {user?.email || 'admin@aiedutizim.com'}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Tel raqam
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  Tizimdagi roli
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-blue-600 select-all cursor-not-allowed uppercase">
                  {user?.role === 'subadmin' ? "Kichik Administrator" : "SUPER ADMINISTRATOR"}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  Login
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-gray-500 select-all cursor-not-allowed">
                  {user?.login || 'admin'}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  Parol
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-gray-500 select-all cursor-not-allowed">
                  {user?.password || '123456'}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                SAQLASH
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
