import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { User, Clock, Activity, Search, Filter } from 'lucide-react';

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = safeOnSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Tizim loglari</h2>
          <p className="text-gray-500 font-medium mt-1">Admin, tashkilot va xodimlar harakatlari monitoringi</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filtrlar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Harakatlardan qidirish..." 
            className="bg-transparent border-none outline-none text-sm font-medium w-full"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Foydalanuvchi</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Harakat</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Modul</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Vaqt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{log.userName || 'Tizim'}</div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{log.userRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Activity className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-sm font-medium text-gray-600">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-widest">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">{log.timestamp?.toDate().toLocaleString('uz-UZ')}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    Hozircha loglar mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
