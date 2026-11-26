import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  createDtmSubject,
  deleteDtmSubject,
  ensureDefaultMandatorySubjects,
  formatDtmError,
  formatTimestamp,
  inferMandatoryGroupFromName,
  listDtmQuestions,
  listDtmSubjects,
  updateDtmSubject,
} from '../../../services/dtmService';
import {
  DtmMandatoryGroup,
  DtmQuestion,
  DtmStatus,
  DtmSubject,
  MANDATORY_SUBJECT_SPECS,
} from '../../../types/dtm';
import { DtmModuleNav, StatusBadge } from './DtmModuleNav';

export default function DtmSubjects() {
  const [subjects, setSubjects] = useState<DtmSubject[]>([]);
  const [questions, setQuestions] = useState<DtmQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seedingMandatory, setSeedingMandatory] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'ELECTIVE' | 'MANDATORY'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<DtmSubject | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [mandatoryGroup, setMandatoryGroup] = useState<DtmMandatoryGroup | ''>('ONA_TILI');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DtmStatus>('ACTIVE');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [subs, qs] = await Promise.all([listDtmSubjects(), listDtmQuestions()]);
      setSubjects(subs);
      setQuestions(qs);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const missingMandatorySpecs = useMemo(() => {
    const present = new Set<string>();
    subjects.forEach((s) => {
      if (s.isMandatory || s.blockType === 'majburiy') {
        const grp = s.mandatoryGroup || inferMandatoryGroupFromName(s.name);
        if (grp) present.add(grp);
      }
    });
    return MANDATORY_SUBJECT_SPECS.filter((spec) => !present.has(spec.group));
  }, [subjects]);

  const statsBySubject = useMemo(() => {
    const map: Record<
      string,
      { total: number; active: number; activeMandatory: number; easy: number; medium: number; hard: number }
    > = {};
    for (const q of questions) {
      if (!map[q.subjectId]) {
        map[q.subjectId] = { total: 0, active: 0, activeMandatory: 0, easy: 0, medium: 0, hard: 0 };
      }
      map[q.subjectId].total++;
      if (q.status === 'ACTIVE') {
        map[q.subjectId].active++;
        if (q.isMandatory || q.block === 'majburiy') {
          map[q.subjectId].activeMandatory++;
        }
      }
      if (q.difficulty === 'EASY') map[q.subjectId].easy++;
      else if (q.difficulty === 'HARD') map[q.subjectId].hard++;
      else map[q.subjectId].medium++;
    }
    return map;
  }, [questions]);

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const isSubMandatory = Boolean(s.isMandatory || s.blockType === 'majburiy');
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (kindFilter === 'MANDATORY' && !isSubMandatory) return false;
      if (kindFilter === 'ELECTIVE' && isSubMandatory) return false;
      if (
        term &&
        !(
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          (s.description || '').toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [subjects, search, statusFilter, kindFilter]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setIsMandatory(false);
    setMandatoryGroup('ONA_TILI');
    setDescription('');
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: DtmSubject) => {
    const subMandatory = Boolean(sub.isMandatory || sub.blockType === 'majburiy');
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setIsMandatory(subMandatory);
    setMandatoryGroup(sub.mandatoryGroup || inferMandatoryGroupFromName(sub.name) || 'ONA_TILI');
    setDescription(sub.description || '');
    setStatus(sub.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleSeedMandatorySubjects = async () => {
    setSeedingMandatory(true);
    setError('');
    setSuccess('');
    try {
      const res = await ensureDefaultMandatorySubjects();
      setSubjects(res.subjects);
      if (res.createdCount > 0) {
        setSuccess(`${res.createdCount} ta majburiy fan muvaffaqiyatli yaratildi. Endi har biriga kamida 10 tadan test savoli qo‘shing.`);
      } else {
        setSuccess("Barcha 3 ta majburiy fan allaqachon mavjud.");
      }
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSeedingMandatory(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Fan nomini kiriting.");
      return;
    }
    if (!code.trim()) {
      setError("Fan kodini kiriting (masalan: MATH).");
      return;
    }
    if (isMandatory && !mandatoryGroup) {
      setError("Majburiy fan yo‘nalishini (Ona tili, Matematika yoki O‘zbekiston tarixi) tanlang.");
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingSubject) {
        await updateDtmSubject(editingSubject.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          blockType: isMandatory ? 'majburiy' : 'both',
          isMandatory,
          mandatoryGroup: isMandatory ? mandatoryGroup : '',
          description: description.trim(),
          status,
        });
        setSuccess(`“${name.trim()}” fani muvaffaqiyatli yangilandi.`);
      } else {
        await createDtmSubject({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          blockType: isMandatory ? 'majburiy' : 'both',
          isMandatory,
          mandatoryGroup: isMandatory ? mandatoryGroup : '',
          description: description.trim(),
          status,
        });
        setSuccess(`“${name.trim()}” fani qo‘shildi.`);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sub: DtmSubject) => {
    try {
      const nextStatus: DtmStatus = sub.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateDtmSubject(sub.id, { status: nextStatus });
      setSubjects((prev) =>
        prev.map((item) => (item.id === sub.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  const handleDelete = async (sub: DtmSubject) => {
    const count = statsBySubject[sub.id]?.total || 0;
    const warning =
      count > 0
        ? `Ushbu fanga bog‘langan ${count} ta test savoli mavjud. Shunga qaramay “${sub.name}” fanini o‘chirmoqchimisiz?`
        : `“${sub.name}” fanini o‘chirishni tasdiqlaysizmi?`;
    if (!window.confirm(warning)) return;

    try {
      await deleteDtmSubject(sub.id);
      setSubjects((prev) => prev.filter((item) => item.id !== sub.id));
      setSuccess(`“${sub.name}” fani o‘chirildi.`);
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title="Fanlar katalogi"
        subtitle="1-blok / 2-blok asosiy fanlari (30 ta savol) va Majburiy fanlar (Ona tili, Matematika, O‘zbekiston tarixi · 10 tadan · 1.1 ball)"
        actions={
          <>
            {missingMandatorySpecs.length > 0 && (
              <button
                onClick={handleSeedMandatorySubjects}
                disabled={seedingMandatory}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-100 disabled:opacity-50"
              >
                {seedingMandatory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                3 ta majburiy fanni qo‘shish
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Yangi fan qo‘shish
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Mandatory info banner when missing */}
      {!loading && missingMandatorySpecs.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900">
          <div>
            <strong>Majburiy fanlar sozlanmagan:</strong>{' '}
            {missingMandatorySpecs.map((s) => s.label).join(', ')} fanlari majburiy fan sifatida yaratilishi kerak (har birida kamida 10 ta faol majburiy test bo‘ladi).
          </div>
          <button
            type="button"
            onClick={handleSeedMandatorySubjects}
            disabled={seedingMandatory}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {seedingMandatory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Avtomatik yaratish
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fan nomi yoki kodi bo‘yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'ALL' | 'ELECTIVE' | 'MANDATORY')}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha fan turlari</option>
          <option value="ELECTIVE">1-blok / 2-blok fanlari</option>
          <option value="MANDATORY">Majburiy fanlar (1.1 ball)</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha holatlar</option>
          <option value="ACTIVE">Faqat aktiv fanlar</option>
          <option value="INACTIVE">Nofaol fanlar</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Kod</th>
                <th className="px-4 py-3.5">Fan nomi / Turi</th>
                <th className="px-4 py-3.5">Jami / Aktiv testlar</th>
                <th className="px-4 py-3.5">Qiyinlik bo‘yicha</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Yangilangan</th>
                <th className="px-4 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Fanlar yuklanmoqda...
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Fanlar topilmadi. Yangi fan qo‘shish tugmasini bosing.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => {
                  const isSubMandatory = Boolean(sub.isMandatory || sub.blockType === 'majburiy');
                  const requiredMin = isSubMandatory ? 10 : 30;
                  const counts = statsBySubject[sub.id] || {
                    total: 0,
                    active: 0,
                    activeMandatory: 0,
                    easy: 0,
                    medium: 0,
                    hard: 0,
                  };
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                        {sub.code}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/dtm/questions?subjectId=${sub.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {sub.name}
                          </Link>
                          {isSubMandatory ? (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                              Majburiy (1.1 ball)
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              1/2-blok
                            </span>
                          )}
                        </div>
                        {sub.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                            {sub.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">
                            {counts.total} ta
                          </span>
                          <span className="ml-1.5 text-slate-500">
                            ({counts.active} aktiv
                            {counts.active < requiredMin ? ` · ${requiredMin} ta kerak` : ''})
                          </span>
                        </div>
                        {!isSubMandatory && counts.activeMandatory > 0 && (
                          <div className="mt-0.5 text-[11px] text-indigo-600">
                            Shundan {counts.activeMandatory} tasi majburiy test
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 tabular-nums">
                        Oson: <strong className="text-sky-700">{counts.easy}</strong> · O‘rta:{' '}
                        <strong className="text-amber-700">{counts.medium}</strong> · Qiyin:{' '}
                        <strong className="text-rose-700">{counts.hard}</strong>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(sub)}
                          title="Holatni almashtirish"
                          className="cursor-pointer"
                        >
                          <StatusBadge status={sub.status} />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                        {formatTimestamp(sub.updatedAt || sub.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/dtm/questions?subjectId=${sub.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            title="Fan testlarini ochish"
                          >
                            Testlar
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => openEditModal(sub)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Fanni tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            title="O‘chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSubject ? 'Fanni tahrirlash' : 'Yangi fan qo‘shish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Fan nomi *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (isMandatory) {
                        const guessed = inferMandatoryGroupFromName(val);
                        if (guessed) setMandatoryGroup(guessed);
                      }
                    }}
                    placeholder="Masalan: Matematika"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Fan kodi *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="MATH"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-sm uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Fan toifasi
                  </label>
                  <select
                    value={isMandatory ? 'MANDATORY' : 'ELECTIVE'}
                    onChange={(e) => {
                      const nextMand = e.target.value === 'MANDATORY';
                      setIsMandatory(nextMand);
                      if (nextMand) {
                        const guessed = inferMandatoryGroupFromName(name);
                        setMandatoryGroup(guessed || 'ONA_TILI');
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ELECTIVE">1-blok / 2-blok (30 savol · 3.1 / 2.1 ball)</option>
                    <option value="MANDATORY">Majburiy fan (10 savol · 1.1 ball)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DtmStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE (Aktiv)</option>
                    <option value="INACTIVE">INACTIVE (Nofaol)</option>
                  </select>
                </div>
              </div>

              {isMandatory && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Majburiy fan yo‘nalishi *
                  </label>
                  <select
                    required
                    value={mandatoryGroup}
                    onChange={(e) => setMandatoryGroup(e.target.value as DtmMandatoryGroup)}
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3.5 py-2 text-sm font-medium text-indigo-950 outline-none focus:border-indigo-500"
                  >
                    <option value="ONA_TILI">Ona tili (1–10 savollar)</option>
                    <option value="MATEMATIKA">Matematika (11–20 savollar)</option>
                    <option value="TARIX">O‘zbekiston tarixi (21–30 savollar)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Majburiy fan o‘quvchiga 1-blok / 2-blok sifatida tanlashga chiqmaydi — har bir test kitobchasiga avtomatik qo‘shiladi.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tavsif
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fan haqida qisqacha izoh..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

