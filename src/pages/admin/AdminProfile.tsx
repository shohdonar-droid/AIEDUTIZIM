import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ProfileHeader } from '../../components/admin/profile/ProfileHeader';
import { ProfileManagerForm } from '../../components/admin/profile/ProfileManagerForm';

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
      alert('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <ProfileHeader user={user} />
      
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2">
         <ProfileManagerForm user={user} formData={formData} setFormData={setFormData} handleSave={handleSave} loading={loading} />
      </div>
    </div>
  );
}

