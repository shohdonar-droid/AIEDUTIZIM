import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, Users } from 'lucide-react';

export default function AdminBotUsers() {
  const [botUsers, setBotUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "telegram_users"));
    setBotUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) {
      await deleteDoc(doc(db, "telegram_users", id));
      fetchUsers();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-6 flex items-center gap-2"><Users /> Telegram Bot Foydalanuvchilari</h1>
      <table className="w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-100 text-left text-xs text-gray-500 uppercase">
            <th className="p-4">Nomer</th>
            <th className="p-4">Ism</th>
            <th className="p-4">Username</th>
            <th className="p-4">Telegram ID</th>
            <th className="p-4">Kontakt</th>
            <th className="p-4">Amallar</th>
          </tr>
        </thead>
        <tbody>
          {botUsers.map((u, i) => (
            <tr key={`${u.id}_${i}`} className="border-b">
              <td className="p-4">{i + 1}</td>
              <td className="p-4">{u.firstName || u.name || "Noma'lum"} {u.lastName || ""}</td>
              <td className="p-4">@{u.username || "yo'q"}</td>
              <td className="p-4">{u.telegramId || u.id}</td>
              <td className="p-4">{u.phone || "yo'q"}</td>
              <td className="p-4">
                <button onClick={() => handleDelete(u.id)} className="text-red-500"><Trash2 /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
