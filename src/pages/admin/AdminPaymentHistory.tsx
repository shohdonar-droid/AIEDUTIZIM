import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Clock, Search, CreditCard, Download, Shield, Coins } from "lucide-react";
import * as XLSX from "xlsx";

interface PaymentRecord {
  id: string;
  userId: string;
  payerName: string;
  payerType: "tashkilot" | "xodim" | string;
  amount: number;
  tariffName: string;
  paymentType: string;
  timestamp: any;
}

export default function AdminPaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "payment_history"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPayments(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRecord)
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredPayments = payments.filter((p) =>
    p.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tariffName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportExcel = () => {
    const exportData = filteredPayments.map((p, idx) => ({
      "№": idx + 1,
      "Tashkilot / Xodim": p.payerName,
      "Turi": p.payerType === "xodim" ? "Xodim (FISH)" : "Tashkilot",
      "Tarif": p.tariffName,
      "Summa": p.amount,
      "To'lov turi": p.paymentType || "-",
      "Sana va vaqt": p.timestamp?.toDate
        ? p.timestamp.toDate().toLocaleString("uz-UZ")
        : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "To'lovlar Tarixi");
    XLSX.writeFile(wb, "Tolash_Tarixi.xlsx");
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-black text-indigo-600">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Coins className="w-8 h-8 text-indigo-600 shrink-0" />
            To'lovlar Tarixi
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Tizimdagi barcha tasdiqlangan tarif to'lovlari va ulanishlar tarixi.
          </p>
        </div>
      </header>

      {/* Filter and Export tools */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-bold text-sm"
            placeholder="Tashkilot yoki xodim FISH bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={exportExcel}
          className="w-full md:w-auto px-6 py-3.5 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-tight text-xs"
        >
          <Download className="w-4 h-4" /> Excelga Yuklash
        </button>
      </div>

      {/* History table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest w-16">
                  №
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  Tashkilot / Xodim (F.I.SH)
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Turi
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Tarif
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Summa
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Sana va Vaqt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((p, idx) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50/30 transition-colors group"
                >
                  <td className="px-6 py-5 font-bold text-gray-400 text-sm">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-extrabold text-gray-900 text-sm tracking-tight uppercase">
                      {p.payerName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter mt-0.5">
                      Foydalanuvchi ID: {p.userId}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center whitespace-nowrap">
                    {p.payerType === "xodim" ? (
                      <span className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-teal-100">
                        👨‍💼 Xodim (FISH)
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100">
                        🏢 Tashkilot
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-extrabold rounded-lg">
                      {p.tariffName}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-sm text-green-600 whitespace-nowrap">
                    {(p.amount || 0).toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {p.timestamp?.toDate
                          ? p.timestamp.toDate().toLocaleString("uz-UZ")
                          : "-"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="p-20 text-center text-gray-400 font-bold italic opacity-40">
            Hech qanday to'lovlar tarixi topilmadi.
          </div>
        )}
      </div>
    </div>
  );
}
