
import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

export function ProfileManagerForm({ user, formData, setFormData, handleSave, loading }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-gray-900 mb-6">Profil sozlamalari</h3>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Login (O'zgarmas)</label>
            <input 
              readOnly 
              disabled
              className="w-full px-4 py-3 mt-1.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 font-bold text-sm cursor-not-allowed" 
              value={user?.login || ""}
            />
        </div>
        <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">F.I.Sh. (FISH)</label>
            <input 
              className="w-full px-4 py-3 mt-1.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm text-gray-900" 
              placeholder="To'liq ismingizni kiriting"
              value={formData.displayName} 
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            />
        </div>
        <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Telefon raqami</label>
            <input 
              className="w-full px-4 py-3 mt-1.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm text-gray-900" 
              placeholder="+998 -- --- -- --"
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
        </div>
        <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Profil rasmi (URL)</label>
            <input 
              className="w-full px-4 py-3 mt-1.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm text-gray-900" 
              placeholder="Rasm manzili (https://...)"
              value={formData.photoURL} 
              onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
            />
        </div>
        <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">Manzil</label>
            <input 
              className="w-full px-4 py-3 mt-1.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm text-gray-900" 
              placeholder="Tashkilot yoki yashash manzili"
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
        </div>
         <button 
           type="submit" 
           disabled={loading} 
           className="w-full flex items-center justify-center gap-2 bg-[#0061ff] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 mt-4"
         >
            {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> O'ZGARISHLARNI SAQLASH</>}
         </button>
      </form>
    </div>
  );
}
