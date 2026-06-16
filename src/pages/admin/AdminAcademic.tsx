import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Building2, Layers, Users, Calendar, Search } from 'lucide-react';
import { Faculty, Department, Group, AcademicYear } from '../../types';

type AcademicTab = 'faculties' | 'departments' | 'groups' | 'years';

export default function AdminAcademic() {
  const [activeTab, setActiveTab] = useState<AcademicTab>('faculties');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add forms state
  const [newName, setNewName] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  useEffect(() => {
    const unsubFac = onSnapshot(query(collection(db, 'faculties'), orderBy('createdAt', 'desc')), (snap) => {
      setFaculties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Faculty)));
    });
    const unsubDept = onSnapshot(query(collection(db, 'departments'), orderBy('createdAt', 'desc')), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    });
    const unsubGroups = onSnapshot(query(collection(db, 'groups'), orderBy('createdAt', 'desc')), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    });
    const unsubYears = onSnapshot(query(collection(db, 'academic_years'), orderBy('name', 'desc')), (snap) => {
      setYears(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicYear)));
      setLoading(false);
    });

    return () => { unsubFac(); unsubDept(); unsubGroups(); unsubYears(); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      if (activeTab === 'faculties') {
        await addDoc(collection(db, 'faculties'), { name: newName, createdAt: serverTimestamp() });
      } else if (activeTab === 'departments') {
        if (!selectedFacultyId) return alert('Fakultetni tanlang');
        await addDoc(collection(db, 'departments'), { name: newName, facultyId: selectedFacultyId, createdAt: serverTimestamp() });
      } else if (activeTab === 'groups') {
        if (!selectedDeptId) return alert('Yo\'nalishni tanlang');
        const dept = departments.find(d => d.id === selectedDeptId);
        await addDoc(collection(db, 'groups'), { 
          name: newName, 
          departmentId: selectedDeptId, 
          facultyId: dept?.facultyId || '',
          createdAt: serverTimestamp() 
        });
      } else if (activeTab === 'years') {
        await addDoc(collection(db, 'academic_years'), { name: newName, createdAt: serverTimestamp() });
      }
      setNewName('');
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    const coll = activeTab === 'years' ? 'academic_years' : activeTab;
    await deleteDoc(doc(db, coll, id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Akademik tuzilma</h2>
          <p className="text-gray-500 font-medium mt-1">Fakultet, yo'nalish va guruhlarni markaziy boshqarish</p>
        </div>
        
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm overflow-x-auto">
          {[
            { id: 'faculties', name: 'Fakultetlar', icon: Building2 },
            { id: 'departments', name: 'Yo\'nalishlar', icon: Layers },
            { id: 'groups', name: 'Guruhlar', icon: Users },
            { id: 'years', name: 'O\'quv yillari', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AcademicTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Quick Add Form Section */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/20">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
            {activeTab === 'departments' && (
              <div className="w-full md:w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Fakultetni tanlang</label>
                <select 
                  value={selectedFacultyId} 
                  onChange={e => setSelectedFacultyId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                >
                   <option value="">Tanlang...</option>
                   {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            
            {activeTab === 'groups' && (
              <div className="w-full md:w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Yo'nalishni tanlang</label>
                <select 
                  value={selectedDeptId} 
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                >
                   <option value="">Tanlang...</option>
                   {departments.map(d => (
                     <option key={d.id} value={d.id}>
                       {d.name} ({faculties.find(f => f.id === d.facultyId)?.name || '?'})
                     </option>
                   ))}
                </select>
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                {activeTab === 'faculties' ? 'Fakultet nomi' : activeTab === 'departments' ? 'Yo\'nalish nomi' : activeTab === 'groups' ? 'Guruh nomi' : 'O\'quv yili'}
              </label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="Yangi nom kiting..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
              />
            </div>

            <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition">
              Saqlash
            </button>
          </form>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">#</th>
                
                {activeTab === 'faculties' && (
                  <>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Fakultet nomi</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Yaratilgan sana</th>
                  </>
                )}

                {activeTab === 'departments' && (
                  <>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Fakultet</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Yo'nalish nomi</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Yaratilgan sana</th>
                  </>
                )}

                {activeTab === 'groups' && (
                  <>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Fakultet</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Yo'nalish</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Guruh nomi</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Yaratilgan sana</th>
                  </>
                )}

                {activeTab === 'years' && (
                  <>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">O'quv yili nomi</th>
                    <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Qo'shilgan sana</th>
                  </>
                )}

                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTab === 'faculties' && faculties.map((f, idx) => (
                <tr key={f.id} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{f.name}</td>
                  <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{f.createdAt?.toDate().toLocaleDateString('uz-UZ')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(f.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}

              {activeTab === 'departments' && departments.map((d, idx) => (
                <tr key={d.id} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase">
                      {faculties.find(f => f.id === d.facultyId)?.name || 'Noma\'lum'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{d.name}</td>
                  <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{d.createdAt?.toDate().toLocaleDateString('uz-UZ')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}

              {activeTab === 'groups' && groups.map((g, idx) => {
                const dept = departments.find(d => d.id === g.departmentId);
                const fac = faculties.find(f => f.id === g.facultyId || f.id === dept?.facultyId);
                return (
                  <tr key={g.id} className="hover:bg-gray-50/30">
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{fac?.name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{dept?.name || '-'}</td>
                    <td className="px-6 py-4 font-black text-gray-900">{g.name}</td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{g.createdAt?.toDate().toLocaleDateString('uz-UZ')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(g.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}

              {activeTab === 'years' && years.map((y, idx) => (
                <tr key={y.id} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{y.name}</td>
                  <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{y.createdAt?.toDate().toLocaleDateString('uz-UZ')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(y.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
