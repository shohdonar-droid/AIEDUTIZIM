import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  FileText,
  ClipboardList,
  X,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import {
  downloadAnswerSheetPdf,
  downloadTestBookletPdf,
  formatDateTime,
  formatDtmError,
  formatTimestamp,
  listDtmAssignments,
  listDtmOrganizations,
  updateDtmAssignmentStatus,
} from '../../../services/dtmService';
import {
  DtmAssignment,
  DtmAssignmentStatus,
  DtmOrganization,
} from '../../../types/dtm';
import { AssignmentStatusBadge, DtmModuleNav } from './DtmModuleNav';

export default function DtmAssignments({ scopedOrgId }: { scopedOrgId?: string }) {
  const [assignments, setAssignments] = useState<DtmAssignment[]>([]);
  const [organizations, setOrganizations] = useState<DtmOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Detail Modal
  const [selectedAssignment, setSelectedAssignment] = useState<DtmAssignment | null>(null);
  const [busyPdfKey, setBusyPdfKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [assigns, orgs] = await Promise.all([
        listDtmAssignments(scopedOrgId),
        scopedOrgId ? Promise.resolve([]) : listDtmOrganizations(),
      ]);
      setAssignments(assigns);
      setOrganizations(orgs);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scopedOrgId]);

  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.block1SubjectName) set.add(a.block1SubjectName);
      if (a.block2SubjectName) set.add(a.block2SubjectName);
    });
    return Array.from(set).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assignments.filter((a) => {
      if (orgFilter !== 'ALL' && a.organizationId !== orgFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (
        subjectFilter !== 'ALL' &&
        a.block1SubjectName !== subjectFilter &&
        a.block2SubjectName !== subjectFilter
      ) {
        return false;
      }
      if (dateFilter) {
        const dt = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate() : null;
        if (!dt) return false;
        const iso = dt.toISOString().slice(0, 10);
        if (iso !== dateFilter) return false;
      }
      if (
        term &&
        !(
          a.assignmentCode.toLowerCase().includes(term) ||
          a.studentNumericId.includes(term) ||
          a.studentFullName.toLowerCase().includes(term) ||
          a.organizationName.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [assignments, search, orgFilter, statusFilter, subjectFilter, dateFilter]);

  const handleDownloadPdf = async (a: DtmAssignment, type: 'test' | 'answer') => {
    const key = `${a.id}_${type}`;
    setBusyPdfKey(key);
    setError('');
    try {
      if (type === 'test') {
        await downloadTestBookletPdf(a);
      } else {
        await downloadAnswerSheetPdf(a);
      }
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setBusyPdfKey(null);
    }
  };

  const handleStatusChange = async (a: DtmAssignment, nextStatus: DtmAssignmentStatus) => {
    try {
      await updateDtmAssignmentStatus(a.id, nextStatus, a.studentId);
      setAssignments((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, status: nextStatus } : item))
      );
      if (selectedAssignment?.id === a.id) {
        setSelectedAssignment({ ...selectedAssignment, status: nextStatus });
      }
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      {scopedOrgId ? (
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            DTM Tashkilot
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Test variantlari
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tashkilot o‘quvchilari uchun yaratilgan 90 talik (30 majburiy + 30 + 30) snapshot variantlar va PDF yuklab olish
          </p>
        </div>
      ) : (
        <DtmModuleNav
          title="Test variantlari"
          subtitle="Har bir o‘quvchi uchun biriktirilgan o‘zgarmas 90 talik (30 majburiy + 30 + 30) snapshot variantlar va PDF yuklab olish"
        />
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div
        className={`mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 ${
          scopedOrgId ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
        }`}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Variant ID, 7-xonali ID yoki F.I.Sh."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        {!scopedOrgId && (
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
        )}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha fanlar</option>
          {distinctSubjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha holatlar</option>
          <option value="GENERATED">GENERATED</option>
          <option value="PDF_READY">PDF_READY</option>
          <option value="DOWNLOADED">DOWNLOADED</option>
          <option value="CHECKED">CHECKED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="SUPERSEDED">ALMASHTIRILGAN</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Assignment ID</th>
                <th className="px-4 py-3.5">O‘quvchi ID</th>
                <th className="px-4 py-3.5">F.I.Sh. / Tashkilot</th>
                <th className="px-4 py-3.5">Bloklar</th>
                <th className="px-4 py-3.5">Testlar</th>
                <th className="px-4 py-3.5">Holati</th>
                <th className="px-4 py-3.5">Sana</th>
                <th className="px-4 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Test variantlari yuklanmoqda...
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Test variantlari topilmadi.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">
                      {a.assignmentCode}
                      {a.version > 1 && (
                        <span className="ml-1.5 text-[10px] font-medium text-slate-400">
                          v{a.version}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 tabular-nums">
                        {a.studentNumericId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{a.studentFullName}</p>
                      <p className="max-w-xs truncate text-xs text-slate-500">
                        {a.organizationName}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {((a.mandatoryQuestions && a.mandatoryQuestions.length > 0) ||
                        a.totalQuestions === 90) && (
                        <div className="font-medium text-amber-700">
                          Majburiy: Ona tili, Mat, Tarix
                        </div>
                      )}
                      <div>1: {a.block1SubjectName}</div>
                      <div>2: {a.block2SubjectName}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 tabular-nums">
                      {a.totalQuestions || 60} ta
                    </td>
                    <td className="px-4 py-3.5">
                      <AssignmentStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                      {formatTimestamp(a.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadPdf(a, 'test')}
                          disabled={busyPdfKey === `${a.id}_test`}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                          title="Test kitobchasi PDF"
                        >
                          {busyPdfKey === `${a.id}_test` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(a, 'answer')}
                          disabled={busyPdfKey === `${a.id}_answer`}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
                          title="Javoblar varaqasi PDF"
                        >
                          {busyPdfKey === `${a.id}_answer` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ClipboardList className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedAssignment(a)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ko‘rish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Detail Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700">
                    ID: {selectedAssignment.studentNumericId}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {selectedAssignment.assignmentCode}
                  </span>
                  <AssignmentStatusBadge status={selectedAssignment.status} />
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {selectedAssignment.studentFullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAssignment.organizationName} · Yaratilgan:{' '}
                  {formatDateTime(selectedAssignment.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Lock className="h-4 w-4 text-slate-500" />
                <span>
                  Ushbu variantdagi {selectedAssignment.totalQuestions || 60} ta savol o‘zgarmas snapshot sifatida muzlatilgan (bazadagi keyingi tahrirlar ta’sir qilmaydi).
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedAssignment.status}
                  onChange={(e) =>
                    handleStatusChange(selectedAssignment, e.target.value as DtmAssignmentStatus)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <option value="GENERATED">GENERATED</option>
                  <option value="PDF_READY">PDF_READY</option>
                  <option value="DOWNLOADED">DOWNLOADED</option>
                  <option value="CHECKED">CHECKED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button
                  onClick={() => handleDownloadPdf(selectedAssignment, 'test')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Test PDF
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedAssignment, 'answer')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Javoblar varaqasi PDF
                </button>
              </div>
            </div>

            {/* Majburiy, 1-blok & 2-blok questions */}
            <div className="space-y-6">
              {(() => {
                const hasMandatory =
                  (selectedAssignment.mandatoryQuestions?.length || 0) > 0 ||
                  selectedAssignment.totalQuestions === 90;
                const sections = [
                  ...(hasMandatory
                    ? [
                        {
                          title: `Majburiy fanlar: ${selectedAssignment.mandatorySubjectsLabel || "Ona tili, Matematika, O'zbekiston tarixi"} (1–30 · 1.1 ball)`,
                          questions: selectedAssignment.mandatoryQuestions || [],
                        },
                      ]
                    : []),
                  {
                    title: `1-blok: ${selectedAssignment.block1SubjectName} (${hasMandatory ? '31–60' : '1–30'} · 3.1 ball)`,
                    questions: selectedAssignment.block1Questions || [],
                  },
                  {
                    title: `2-blok: ${selectedAssignment.block2SubjectName} (${hasMandatory ? '61–90' : '31–60'} · 2.1 ball)`,
                    questions: selectedAssignment.block2Questions || [],
                  },
                ];
                return sections;
              })().map((section) => (
                <div key={section.title}>
                  <h4 className="mb-3 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    {section.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {section.questions.map((q) => (
                      <div
                        key={q.order}
                        className="rounded-xl border border-slate-200 p-3.5 text-xs"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {q.order}. {q.questionText}
                          </span>
                          <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                            {q.correctAnswer}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-slate-600">
                          <div>A) {q.optionA}</div>
                          <div>B) {q.optionB}</div>
                          <div>C) {q.optionC}</div>
                          <div>D) {q.optionD}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
