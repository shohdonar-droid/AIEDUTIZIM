import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { Loader2, Search, Filter, Edit, Save, X, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, FileText, LayoutDashboard, Users, Zap, DollarSign, TrendingUp, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminBilling() {
  const [organizations, setOrganizations] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'org' | 'student' | 'staff'>('org');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingHistoryUser, setViewingHistoryUser] = useState<UserProfile | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editIncome, setEditIncome] = useState(0);
  const [editExpense, setEditExpense] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalOrgs: 0,
    staffCount: 0,
    totalIncome: 0,
    totalDocs: 0,
    totalSpentAmount: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        const users = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        const orgs = users.filter(u => u.role === 'teacher').map(org => ({
          ...org,
          staffCount: users.filter(s => s.role === 'staff' && s.teacherId === org.uid).length
        }));
        const stds = users.filter(u => u.role === 'student');
        const stf = users.filter(u => u.role === 'staff');
        
        setOrganizations(orgs);
        setStudents(stds);
        setStaff(stf);

        // Fetch docs count (tests, courses, exams)
        const testsSnap = await getDocs(collection(db, 'tests'));
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const resultsSnap = await getDocs(collection(db, 'testResults'));

        setStats({
          totalOrgs: orgs.length,
          staffCount: stf.length,
          totalIncome: users.reduce((acc, u) => acc + (u.totalIncome || 0), 0),
          totalDocs: testsSnap.size + coursesSnap.size + resultsSnap.size,
          totalSpentAmount: users.reduce((acc, u) => acc + (u.totalSpentAmount || 0), 0)
        });

      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'admin-billing-loader');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      let totalInc = editingUser.totalIncome || 0;
      let totalSpent = editingUser.totalSpentAmount || 0;
      let transactions = editingUser.billingHistory || [];

      if (Number(editIncome) > 0) {
        totalInc += Number(editIncome);
        const newRecord = {
          type: 'kirim',
          amount: Number(editIncome),
          date: new Date().toISOString()
        };
        transactions = [...transactions, newRecord];
      }

      const expense = Number(editExpense);
      if (Math.abs(expense) > 0) {
        const spentVal = Math.abs(expense);
        totalSpent += spentVal;
        
        const newRecord = {
          type: 'chiqim',
          amount: expense < 0 ? expense : -expense,
          date: new Date().toISOString()
        };
        transactions = [...transactions, newRecord];
      }
      
      const updateData: any = {
        totalIncome: totalInc,
        totalSpentAmount: totalSpent,
        billingHistory: transactions,
        updatedAt: serverTimestamp()
      };

      if (Number(editIncome) > 0) {
        updateData.lastIncomeDate = serverTimestamp();
      }

      await updateDoc(doc(db, 'users', editingUser.uid), updateData);
      
      // Update local state
      const updatedUser = { ...editingUser, ...updateData };
      if (activeTab === 'org') {
        setOrganizations(organizations.map(u => u.uid === editingUser.uid ? updatedUser : u));
      } else if (activeTab === 'student') {
        setStudents(students.map(u => u.uid === editingUser.uid ? updatedUser : u));
      } else {
        setStaff(staff.map(u => u.uid === editingUser.uid ? updatedUser : u));
      }

      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const data = activeTab === 'org' ? organizations : (activeTab === 'student' ? students : staff);
    const exportData = data.map((u, i) => ({
      "№": i + 1,
      "Nomi / F.I.SH": u.displayName,
      "Tushgan To'lov": u.totalIncome || 0,
      "Ishlatilgan Summa": u.totalSpentAmount || 0,
      "Oxirgi To'lov Sanasi": u.lastIncomeDate?.toDate ? u.lastIncomeDate.toDate().toLocaleString() : "-"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing");
    XLSX.writeFile(wb, `Billing_${activeTab === 'org' ? 'Tashkilotlar' : (activeTab === 'student' ? 'Talabalar' : 'Xodimlar')}.xlsx`);
  };

  const currentList = activeTab === 'org' ? organizations : (activeTab === 'student' ? students : staff);
  const filteredList = currentList.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading && !editingUser) return <div className="flex h-96 items-center justify-center font-black text-indigo-600">Yuklanmoqda...</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Moliyaviy Hisobot (Billing)</h1>
          <p className="text-gray-500 mt-2 text-lg">Tushumlar, ballar va foydalanuvchilar balansi boshqaruvi.</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('org')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'org' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Tashkilotlar ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'student' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Talabalar ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Xodimlar ({staff.length})
          </button>
        </div>
      </header>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <TrendingUp className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Umumiy Tushum</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">{stats.totalIncome.toLocaleString()} <span className="text-sm font-bold text-gray-400">so'm</span></h3>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <Users className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Users className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Jami Xodimlar</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">{stats.staffCount.toLocaleString()} <span className="text-sm font-bold text-gray-400">ta</span></h3>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <DollarSign className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Ishlatilgan Summa</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">{stats.totalSpentAmount.toLocaleString()} <span className="text-sm font-bold text-gray-400">so'm</span></h3>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <Users className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Users className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tashkilotlar Soni</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">{organizations.length.toLocaleString()}</h3>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <LayoutDashboard className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-4 mb-4">
               <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                  <Users className="w-6 h-6" />
               </div>
               <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Talabalar Soni</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">{students.length.toLocaleString()}</h3>
         </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-bold"
            placeholder={`${activeTab === 'org' ? 'Tashkilot' : activeTab === 'student' ? 'Talaba' : 'Xodim'} nomini yozing...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
           onClick={exportExcel}
           className="w-full md:w-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-tight"
        >
           <CreditCard className="w-5 h-5" /> Excelga Yuklash
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-8 text-left text-xs font-black text-gray-400 uppercase tracking-widest">№</th>
                <th className="px-6 py-8 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Nomi / F.I.SH</th>
                {activeTab === 'org' && (
                   <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Xodimlar soni</th>
                )}
                <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Jami tushum</th>
                <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Ishlatilgan Summa</th>
                <th className="px-6 py-8 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredList.map((u, i) => (
                <tr key={u.uid} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-6 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-6">
                    <div className="font-black text-gray-900">{u.displayName}</div>
                    <div className="text-xs font-bold text-gray-400">{u.login || u.email}</div>
                  </td>
                  {activeTab === 'org' && (
                    <td className="px-6 py-6 text-center font-bold text-sm">
                       <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">{(u as any).staffCount || 0} ta</span>
                    </td>
                  )}
                  <td className="px-6 py-6 text-center font-black text-green-600 bg-green-50/20">
                    {u.totalIncome?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-6 text-center font-bold text-red-500 bg-red-50/20">
                    {u.totalSpentAmount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                         onClick={() => {
                           setViewingHistoryUser(u);
                         }}
                         className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                       >
                         <Eye className="w-5 h-5" />
                       </button>
                       <button 
                         onClick={() => {
                           setEditingUser(u);
                           setEditIncome(0);
                           setEditExpense(0);
                         }}
                         className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                       >
                         <Edit className="w-5 h-5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-lg w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-black text-gray-900">Billing sozlamalari</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">{editingUser.displayName}</p>
               </div>
               <button onClick={() => setEditingUser(null)} className="p-3 hover:bg-gray-100 rounded-2xl">
                 <X className="w-6 h-6 text-gray-400" />
               </button>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Yangi to'lov summasi (so'mda)</label>
                  <div className="relative">
                     <input 
                        type="number"
                        placeholder="Masalan: 50000"
                        value={editIncome || ''}
                        onChange={e => setEditIncome(Number(e.target.value))}
                        className="w-full px-6 py-5 bg-indigo-50/30 rounded-2xl border-2 border-indigo-100 focus:border-indigo-600 focus:bg-white transition-all font-black text-2xl text-indigo-700"
                     />
                     <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-indigo-300 uppercase tracking-tighter">sum</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 italic mt-1">* Bu summa jami tushumga qo'shiladi.</p>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Chiqim summasi</label>
                  <div className="relative">
                     <input 
                        type="number"
                        placeholder="Masalan: 5000"
                        value={editExpense || ''}
                        onChange={e => setEditExpense(Number(e.target.value))}
                        className="w-full px-6 py-5 bg-red-50/30 rounded-2xl border-2 border-red-100 focus:border-red-600 focus:bg-white transition-all font-black text-2xl text-red-700"
                     />
                     <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-red-300 uppercase tracking-tighter">sum</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 italic mt-1">* Bu summa ishlatilgan summaga qo'shiladi.</p>
               </div>

               <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                     <span className="text-gray-400">Jami tushum bo'ladi:</span>
                     <span className="text-gray-900">{( (editingUser.totalIncome || 0) + (editIncome || 0) ).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                     <span className="text-gray-400">Ishlatilgan summa bo'ladi:</span>
                     <span className="text-red-500 font-black">
                        {( (editingUser.totalSpentAmount || 0) + Math.abs(editExpense || 0) ).toLocaleString()} so'm
                     </span>
                  </div>
               </div>

               <button 
                 onClick={handleUpdateUser}
                 disabled={loading}
                 className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
               >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                 SOZLAMALARNI SAQLASH
               </button>
            </div>
          </div>
        </div>
      )}

      {viewingHistoryUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-black text-gray-900">To'lovlar tarixi</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">{viewingHistoryUser.displayName}</p>
               </div>
               <button onClick={() => setViewingHistoryUser(null)} className="p-3 hover:bg-gray-100 rounded-2xl">
                 <X className="w-6 h-6 text-gray-400" />
               </button>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 overflow-x-auto max-h-[60vh]">
               {(!viewingHistoryUser.billingHistory || viewingHistoryUser.billingHistory.length === 0) ? (
                 <p className="text-center font-bold text-gray-400 py-10">Tarix mavjud emas</p>
               ) : (
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-gray-200">
                       <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Sana</th>
                       <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Turi</th>
                       <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Summa</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {[...viewingHistoryUser.billingHistory].reverse().map((record: any, idx) => (
                       <tr key={idx} className="hover:bg-white transition-colors">
                         <td className="py-4 font-bold text-gray-600 text-sm">{new Date(record.date).toLocaleString()}</td>
                         <td className="py-4">
                           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${record.type === 'kirim' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             {record.type}
                           </span>
                         </td>
                         <td className={`py-4 font-black text-right ${record.type === 'kirim' ? 'text-green-600' : 'text-red-600'}`}>
                           {record.description || <>{record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()} so'm</>}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
