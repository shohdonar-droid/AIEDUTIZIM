import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import {
  createDtmSubject,
  deleteDtmSubject,
  formatDtmError,
  formatTimestamp,
  listDtmQuestions,
  listDtmSubjects,
  updateDtmSubject,
} from '../../../services/dtmService';
import {
  DtmQuestion,
  DtmStatus,
  DtmSubject,
} from '../../../types/dtm';
import { DtmModuleNav, StatusBadge } from './DtmModuleNav';

const BLOCK_OPTIONS = [
  { value: '1-blok', label: '1-blok' },
  { value: '2-blok', label: '2-blok' },
  { value: 'both', label: '1-blok va 2-blok (Ikkalasi uchun)' },
  { value: 'custom', label: 'Boshqa / Maxsus blok...' },
];

export default function DtmSubjects() {
  const [subjects, setSubjects] = useState<DtmSubject[]>([]);
  const [questions, setQuestions] = useState<DtmQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<DtmSubject | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [blockChoice, setBlockChoice] = useState('both');
  const [customBlock, setCustomBlock] = useState('');
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

  const activeCountBySubject = useMemo(() => {
    const map: Record<string, { total: number; b1: number; b2: number }> = {};
    for (const q of questions) {
      if (q.status !== 'ACTIVE') continue;
      if (!map[q.subjectId]) map[q.subjectId] = { total: 0, b1: 0, b2: 0 };
      map[q.subjectId].total++;
      if (q.block === '1-blok' || q.block === 'both') map[q.subjectId].b1++;
      if (q.block === '2-blok' || q.block === 'both') map[q.subjectId].b2++;
    }
    return map;
  }, [questions]);

  const distinctBlocks = useMemo(() => {
    const set = new Set<string>(['1-blok', '2-blok', 'both']);
    subjects.forEach((s) => {
      if (s.blockType) set.add(s.blockType);
    });
    return Array.from(set);
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.filter((s) => {
      if (blockFilter !== 'ALL' && s.blockType !== blockFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
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
  }, [subjects, search, blockFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setBlockChoice('both');
    setCustomBlock('');
    setDescription('');
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: DtmSubject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    if (sub.blockType === '1-blok' || sub.blockType === '2-blok' || sub.blockType === 'both') {
      setBlockChoice(sub.blockType);
      setCustomBlock('');
    } else {
      setBlockChoice('custom');
      setCustomBlock(sub.blockType);
    }
    setDescription(sub.description || '');
    setStatus(sub.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedBlock = blockChoice === 'custom' ? customBlock.trim() : blockChoice;
    if (!name.trim()) {
      setError("Fan nomini kiriting.");
      return;
    }
    if (!code.trim()) {
      setError("Fan kodini kiriting (masalan: MATH).");
      return;
    }
    if (!resolvedBlock) {
      setError("Blok turini kiriting.");
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
          blockType: resolvedBlock,
          description: description.trim(),
          status,
        });
        setSuccess(`“${name.trim()}” fani muvaffaqiyatli yangilandi.`);
      } else {
        await createDtmSubject({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          blockType: resolvedBlock,
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
    const count = activeCountBySubject[sub.id]?.total || 0;
    const warning =
      count > 0
        ? `Ushbu fanga bog‘langan ${count} ta aktiv savol mavjud. Shunga qaramay “${sub.name}” fanini o‘chirmoqchimisiz?`
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
        title="Fanlar va bloklar boshqaruvi"
        subtitle="1-blok, 2-blok va kelajakdagi qo‘shimcha bloklar uchun fanlar katalogi"
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Yangi fan qo‘shish
          </button>
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

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-3">
        <div className="relative">
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
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha blok turlari</option>
          {distinctBlocks.map((b) => (
            <option key={b} value={b}>
              {b === 'both' ? '1-blok va 2-blok' : b}
            </option>
          ))}
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
                <th className="px-4 py-3.5">Fan nomi</th>
                <th className="px-4 py-3.5">Blok turi</th>
                <th className="px-4 py-3.5">Aktiv testlar (1-blok / 2-blok)</th>
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
                  const counts = activeCountBySubject[sub.id] || { total: 0, b1: 0, b2: 0 };
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                        {sub.code}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{sub.name}</p>
                        {sub.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                            {sub.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                        {sub.blockType === 'both' ? '1-blok va 2-blok' : sub.blockType}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-slate-800">
                            Jami aktiv: {counts.total} ta
                          </span>
                          <span className="text-slate-500">
                            1-blok: {counts.b1} · 2-blok: {counts.b2}
                            {(counts.b1 < 30 && counts.b2 < 30) && ' (30 ta kerak)'}
                          </span>
                        </div>
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
                          <button
                            onClick={() => openEditModal(sub)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Tahrirlash"
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
                    onChange={(e) => setName(e.target.value)}
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
                    Blok turi *
                  </label>
                  <select
                    value={blockChoice}
                    onChange={(e) => setBlockChoice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {BLOCK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
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

              {blockChoice === 'custom' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Maxsus blok nomi *
                  </label>
                  <input
                    type="text"
                    required
                    value={customBlock}
                    onChange={(e) => setCustomBlock(e.target.value)}
                    placeholder="Masalan: 3-blok"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
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
