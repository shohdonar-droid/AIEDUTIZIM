
import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

export function ProfileManagerForm({ user, formData, setFormData, handleSave, loading }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-gray-900 mb-6">Profil sozlamalari</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">F.I.Sh.</label>
            <input className="w-full px-4 py-2 mt-1 rounded-xl border border-gray-200 text-sm" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})}/>
        </div>
        <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">Telefon</label>
            <input className="w-full px-4 py-2 mt-1 rounded-xl border border-gray-200 text-sm" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}/>
        </div>
         <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold">
            {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> SAQLASH</>}
         </button>
      </form>
    </div>
  );
}
