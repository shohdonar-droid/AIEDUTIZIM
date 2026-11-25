import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Award,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import {
  formatDateTime,
  formatDtmError,
  formatTimestamp,
  listDtmOrganizations,
  listDtmResults,
} from '../../../services/dtmService';
import { DtmOrganization, DtmResult } from '../../../types/dtm';
import { DtmModuleNav } from './DtmModuleNav';

export default function DtmResults() {
  const [results, setResults] = useState<DtmResult[]>([]);
  const [organizations, setOrganizations] = useState<DtmOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState<DtmResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resList, orgs] = await Promise.all([
        listDtmResults(),
        listDtmOrganizations(),
      ]);
      setResults(resList);
      setOrganizations(orgs);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    return results.filter((r) => {
      if (orgFilter !== 'ALL' && r.organizationId !== orgFilter) return false;
      if (
        term &&
        !(
          r.studentNumericId.includes(term) ||
          r.studentFullName.toLowerCase().includes(term) ||
          r.assignmentCode.toLowerCase().includes(term) ||
          r.organizationName.toLowerCase().includes(term) ||
          r.block1SubjectName.toLowerCase().includes(term) ||
          r.block2SubjectName.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [results, search, orgFilter]);

  const summary = useMemo(() => {
    if (filteredResults.length === 0) {
      return { count: 0, avgScore: 0, avgPct: 0, maxScore: 0 };
    }
    const totalScore = filteredResults.reduce((acc, r) => acc + (r.score || 0), 0);
    const totalPct = filteredResults.reduce((acc, r) => acc + (r.percentage || 0), 0);
    const maxScore = Math.max(...filteredResults.map((r) => r.score || 0));
    return {
      count: filteredResults.length,
      avgScore: Math.round((totalScore / filteredResults.length) * 10) / 10,
      avgPct: Math.round((totalPct / filteredResults.length) * 10) / 10,
      maxScore,
    };
  }, [filteredResults]);

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title="DTM Natijalar"
        subtitle="Tekshirilgan javoblar varaqalari, bloklar kesimidagi to‘g‘ri javoblar va umumiy ballar"
      />

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Tekshirilgan ishlar</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{summary.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">O‘rtacha ball</p>
          <p className="mt-1 text-xl font-bold text-blue-700 tabular-nums">
            {summary.avgScore} <span className="text-xs font-normal text-slate-400">/ 156.0</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">O‘rtacha foiz</p>
          <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">{summary.avgPct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Eng yuqori ball</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{summary.maxScore}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="7 xonali ID, F.I.Sh., variant ID yoki fan bo‘yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha tashkilotlar</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">O‘quvchi ID</th>
                <th className="px-4 py-3.5">F.I.Sh. / Tashkilot</th>
                <th className="px-4 py-3.5">Variant</th>
                <th className="px-4 py-3.5">1-blok / 2-blok</th>
                <th className="px-4 py-3.5">To‘g‘ri javob</th>
                <th className="px-4 py-3.5">Foiz</th>
                <th className="px-4 py-3.5">Ball</th>
                <th className="px-4 py-3.5">Sana</th>
                <th className="px-4 py-3.5 text-right">Batafsil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Natijalar yuklanmoqda...
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    <Award className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Hozircha tekshirilgan natijalar mavjud emas.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 tabular-nums">
                        {r.studentNumericId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{r.studentFullName}</p>
                      <p className="max-w-xs truncate text-xs text-slate-500">
                        {r.organizationName}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {r.assignmentCode}
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular-nums text-slate-700">
                      <div>
                        {r.block1SubjectName}: <strong>{r.block1Correct}/30</strong>
                      </div>
                      <div>
                        {r.block2SubjectName}: <strong>{r.block2Correct}/30</strong>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-900">
                      {r.correctCount} / {r.totalQuestions}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold tabular-nums text-slate-800">
                      {r.percentage}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 tabular-nums">
                        {r.score}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                      {formatTimestamp(r.checkedAt || r.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedResult(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Tahlil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Breakdown Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700">
                    ID: {selectedResult.studentNumericId}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {selectedResult.assignmentCode}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {selectedResult.studentFullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedResult.organizationName} · Tekshirilgan:{' '}
                  {formatDateTime(selectedResult.checkedAt || selectedResult.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Jami ball</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">
                  {selectedResult.score} / 156.0
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">To‘g‘ri / Xato / Bo‘sh</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {selectedResult.correctCount} / {selectedResult.wrongCount} /{' '}
                  {selectedResult.unansweredCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">1-blok ({selectedResult.block1SubjectName})</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {selectedResult.block1Correct} / 30 (× 3.1)
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">2-blok ({selectedResult.block2SubjectName})</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {selectedResult.block2Correct} / 30 (× 2.1)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {(selectedResult.questionBreakdown || []).map((item) => {
                const isBlank = !item.selectedAnswer;
                return (
                  <div
                    key={item.order}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs tabular-nums ${
                      item.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                        : isBlank
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : 'border-rose-200 bg-rose-50/70 text-rose-900'
                    }`}
                  >
                    <span className="font-mono font-bold">{item.order}.</span>
                    <span className="font-mono font-semibold">
                      {item.selectedAnswer || '—'} / {item.correctAnswer}
                    </span>
                    {item.isCorrect ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : isBlank ? (
                      <MinusCircle className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
