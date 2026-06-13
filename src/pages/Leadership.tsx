import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Loader2, Mail, Phone, Mail as MailIcon, Phone as PhoneIcon, User } from 'lucide-react';
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

        // Super Admin first, then subadmins sorted by name
        const sortedSubadmins = subadminList.sort((a, b) => 
          (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ")
        );

        setAdmins([...adminList, ...sortedSubadmins]);
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4"
          >
            Rahbariyat
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 font-medium"
          >
            AIEDUTIZIM administrator xodimlari
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {admins.map((admin, index) => (
            <motion.div
              key={admin.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group border border-gray-100 flex flex-col sm:flex-row h-full"
            >
              <div className="w-full sm:w-48 h-64 sm:h-auto overflow-hidden relative bg-gray-50">
                <img 
                  src={admin.photoURL ? makeDirectImageUrl(admin.photoURL) : DEFAULT_ADMIN_IMAGE} 
                  alt={admin.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="p-8 flex-1 flex flex-col justify-center bg-gradient-to-br from-white to-gray-50/50">
                <div className="mb-6">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${
                    admin.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {admin.role === 'admin' ? 'Super Admin' : 'Kichik Administrator'}
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                    {admin.displayName}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-600 group/item">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                      <MailIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Elektron pochta</span>
                      <span className="font-bold text-sm sm:text-base break-all">{admin.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-gray-600 group/item">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                      <PhoneIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Telefon raqami</span>
                      <span className="font-bold text-sm sm:text-base">{admin.phone || "+998 -- --- -- --"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {admins.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Hozircha ma'lumotlar mavjud emas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
