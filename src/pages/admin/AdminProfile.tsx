import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ProfileHeader } from '../../components/admin/profile/ProfileHeader';
import { ProfileManagerForm } from '../../components/admin/profile/ProfileManagerForm';

export default function AdminProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    photoURL: '',
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || '',
        photoURL: user.photoURL || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), formData, { merge: true });
      alert('Ma\'lumotlar muvaffaqiyatli yangilandi!');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-8">
      <ProfileHeader user={user} />
      
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-2">
         <ProfileManagerForm user={user} formData={formData} setFormData={setFormData} handleSave={handleSave} loading={loading} />
      </div>
    </div>
  );
}

