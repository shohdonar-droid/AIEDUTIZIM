import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Loader2, Mail, Phone, User, Briefcase, Star } from 'lucide-react';
import { makeDirectImageUrl } from '../lib/helpers';

const DEFAULT_ADMIN_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function Leadership() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeadership() {
      try {
        const qAdmin = query(
          collection(db, 'users'),
          where('role', '==', 'admin')
        );
        const qSubadmin = query(
          collection(db, 'users'),
          where('role', '==', 'subadmin')
        );

        const [adminSnap, subadminSnap] = await Promise.all([
          getDocs(qAdmin),
          getDocs(qSubadmin)
        ]);

        const adminList = adminSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        const subadminList = subadminSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

        // Group super admins first
        setAdmins([...adminList, ...subadminList.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""))]);
      } catch (err) {
        console.error("Error fetching leadership:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeadership();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-3xl font-black text-[#0f172a] mb-2 font-sans tracking-tight">Rahbariyat</h1>
          <p className="text-sm font-medium text-gray-500">AIEDUTIZIM administrator xodimlari</p>
        </div>

        <div className="space-y-6">
          {admins.map((admin, index) => (
            <motion.div
              key={admin.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col sm:flex-row items-center gap-8 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500"
            >
              <div className="relative flex-shrink-0">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner group-hover:border-blue-50 transition-colors duration-500">
                  <img 
                    src={admin.photoURL ? makeDirectImageUrl(admin.photoURL) : DEFAULT_ADMIN_IMAGE} 
                    alt={admin.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                {admin.role === 'admin' && (
                  <div className="absolute -bottom-2 translate-x-[-10%] left-1/2 bg-[#0061ff] text-white px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-xl border-2 border-white">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <Star className="w-3 h-3 text-[#0061ff] fill-[#0061ff]" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest uppercase">SUPER ADMIN</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full sm:w-auto h-full flex flex-col justify-center space-y-4">
                <div className="grid grid-cols-[1fr_auto_2fr] gap-x-4 items-center">
                   <div className="flex items-center gap-3 text-blue-600">
                      <Briefcase className="w-5 h-5" />
                      <span className="text-sm font-black text-gray-800">Lavozimi:</span>
                   </div>
                   <div className="mx-2" />
                   <span className="text-sm font-bold text-gray-600">
                     {admin.role === 'admin' ? 'Tizim administratori' : 'Kichik admin'}
                   </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_2fr] gap-x-4 items-center">
                   <div className="flex items-center gap-3 text-blue-600">
                      <User className="w-5 h-5" />
                      <span className="text-sm font-black text-gray-800 tracking-tight">F.I.Sh:</span>
                   </div>
                   <div className="mx-2" />
                   <span className="text-sm font-bold text-gray-600">{admin.displayName}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_2fr] gap-x-4 items-center">
                   <div className="flex items-center gap-3 text-blue-600">
                      <Mail className="w-5 h-5" />
                      <span className="text-sm font-black text-gray-800">Email:</span>
                   </div>
                   <div className="mx-2" />
                   <span className="text-sm font-bold text-gray-600 break-all">{admin.email}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_2fr] gap-x-4 items-center">
                   <div className="flex items-center gap-3 text-blue-600">
                      <Phone className="w-5 h-5" />
                      <span className="text-sm font-black text-gray-800">Tel raqami:</span>
                   </div>
                   <div className="mx-2" />
                   <span className="text-sm font-bold text-gray-600">{admin.phone || "+998 -- --- -- --"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {admins.length === 0 && (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Hozircha ma'lumotlar mavjud emas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
