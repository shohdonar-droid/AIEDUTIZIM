import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Database,
} from 'lucide-react';
import {
  bulkCreateDtmQuestions,
  createDtmQuestion,
  deleteDtmQuestion,
  formatDtmError,
  formatTimestamp,
  listDtmQuestions,
  listDtmSubjects,
  updateDtmQuestion,
} from '../../../services/dtmService';
import {
  DtmAnswerOption,
  DtmDifficulty,
  DtmQuestion,
  DtmStatus,
  DtmSubject,
} from '../../../types/dtm';
import { DifficultyBadge, DtmModuleNav, StatusBadge } from './DtmModuleNav';

const PAGE_SIZE = 20;

export default function DtmQuestions() {
  const [questions, setQuestions] = useState<DtmQuestion[]>([]);
  const [subjects, setSubjects] = useState<DtmSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<DtmQuestion | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [block, setBlock] = useState('1-blok');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<DtmAnswerOption>('A');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DtmDifficulty>('MEDIUM');
  const [status, setStatus] = useState<DtmStatus>('ACTIVE');

  // Bulk Paste Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkBlock, setBulkBlock] = useState('1-blok');
  const [bulkDifficulty, setBulkDifficulty] = useState<DtmDifficulty>('MEDIUM');
  const [bulkText, setBulkText] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [qs, subs] = await Promise.all([listDtmQuestions(), listDtmSubjects()]);
      setQuestions(qs);
      setSubjects(subs);
      if (subs.length > 0 && !subjectId) {
        setSubjectId(subs[0].id);
        setBulkSubjectId(subs[0].id);
      }
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const subjectMap = useMemo(() => {
    const map: Record<string, DtmSubject> = {};
    subjects.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [subjects]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (subjectFilter !== 'ALL' && q.subjectId !== subjectFilter) return false;
      if (blockFilter !== 'ALL' && q.block !== blockFilter) return false;
      if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false;
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (
        term &&
        !(
          q.questionText.toLowerCase().includes(term) ||
          (q.topic || '').toLowerCase().includes(term) ||
          q.id.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [questions, search, subjectFilter, blockFilter, difficultyFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const paginatedQuestions = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, subjectFilter, blockFilter, difficultyFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setSubjectId(subjects[0]?.id || '');
    setBlock('1-blok');
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('A');
    setTopic('');
    setDifficulty('MEDIUM');
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (q: DtmQuestion) => {
    setEditingQuestion(q);
    setSubjectId(q.subjectId);
    setBlock(q.block);
    setQuestionText(q.questionText);
    setOptionA(q.optionA);
    setOptionB(q.optionB);
    setOptionC(q.optionC);
    setOptionD(q.optionD);
    setCorrectAnswer(q.correctAnswer);
    setTopic(q.topic || '');
    setDifficulty(q.difficulty || 'MEDIUM');
    setStatus(q.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError("Avval fan tanlang (yoki Fanlar bo‘limida fan yarating).");
      return;
    }
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setError("Savol matni va A, B, C, D variantlarning barchasini to‘ldiring.");
      return;
    }

    const subjName = subjectMap[subjectId]?.name || '';
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingQuestion) {
        await updateDtmQuestion(editingQuestion.id, {
          subjectId,
          subjectName: subjName,
          block,
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          topic,
          difficulty,
          status,
        });
        setSuccess("Test savoli yangilandi.");
      } else {
        await createDtmQuestion({
          subjectId,
          subjectName: subjName,
          block,
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          topic,
          difficulty,
          status,
        });
        setSuccess("Yangi test savoli bazaga qo‘shildi.");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (q: DtmQuestion) => {
    const nextStatus: DtmStatus = q.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateDtmQuestion(q.id, { status: nextStatus });
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  const handleDelete = async (q: DtmQuestion) => {
    if (!window.confirm("Ushbu savolni testlar bazasidan o‘chirmoqchimisiz? (Oldin yaratilgan variantlarga ta’sir qilmaydi.)")) {
      return;
    }
    try {
      await deleteDtmQuestion(q.id);
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      setSuccess("Savol o‘chirildi.");
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  const parseBulkText = (raw: string) => {
    const chunks = raw
      .split(/\+{4,}/)
      .map((c) => c.trim())
      .filter(Boolean);

    const parsed: Array<Omit<DtmQuestion, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const subjName = subjectMap[bulkSubjectId]?.name || '';

    for (const chunk of chunks) {
      const parts = chunk.split(/={4,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 5) continue;
      const qText = parts[0];
      const opts = parts.slice(1, 5);
      let correctIdx = 0;
      const cleanOpts = opts.map((o, idx) => {
        if (o.startsWith('#')) {
          correctIdx = idx;
          return o.replace(/^#+\s*/, '').trim();
        }
        return o.replace(/^[A-Da-d][.)]\s*/, '').trim();
      });
      const letters: DtmAnswerOption[] = ['A', 'B', 'C', 'D'];
      parsed.push({
        subjectId: bulkSubjectId,
        subjectName: subjName,
        block: bulkBlock,
        questionText: qText,
        optionA: cleanOpts[0] || '',
        optionB: cleanOpts[1] || '',
        optionC: cleanOpts[2] || '',
        optionD: cleanOpts[3] || '',
        correctAnswer: letters[correctIdx] || 'A',
        topic: '',
        difficulty: bulkDifficulty,
        status: 'ACTIVE',
      });
    }
    return parsed;
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSubjectId) {
      setError("Fan tanlanmagan.");
      return;
    }
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      setError("Format bo‘yicha kamida bitta to‘liq test topilmadi. Savol va variantlarni ==== hamda ++++ bilan ajrating (# to‘g‘ri javob oldidan).");
      return;
    }
    setSaving(true);
    setError('');
    try {
      const count = await bulkCreateDtmQuestions(parsed);
      setSuccess(`${count} ta test savoli bazaga yuklandi.`);
      setBulkText('');
      setIsBulkOpen(false);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title="Testlar bazasi"
        subtitle="1-blok va 2-blok fanlari bo‘yicha savollar banki (individual variantlar yaratish uchun manba)"
        actions={
          <>
            <button
              onClick={() => {
                setBulkSubjectId(subjects[0]?.id || '');
                setIsBulkOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Ommaviy qo‘shish
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Yangi test qo‘shish
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

      {/* Search & Filters */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Savol matni, mavzu yoki ID bo‘yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha fanlar</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha bloklar</option>
          <option value="1-blok">1-blok</option>
          <option value="2-blok">2-blok</option>
          <option value="both">1-blok va 2-blok</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="ALL">Qiyinlik</option>
            <option value="EASY">Oson</option>
            <option value="MEDIUM">O‘rta</option>
            <option value="HARD">Qiyin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="ALL">Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Nofaol</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span className="tabular-nums">
            Topildi: <strong className="text-slate-900">{filteredQuestions.length}</strong> ta test
          </span>
          <span className="tabular-nums">
            Sahifa {page} / {totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Fan</th>
                <th className="px-4 py-3">Blok</th>
                <th className="px-4 py-3">Savol</th>
                <th className="px-4 py-3">To‘g‘ri javob</th>
                <th className="px-4 py-3">Qiyinlik</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Testlar bazasi yuklanmoqda...
                  </td>
                </tr>
              ) : paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    <Database className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Testlar topilmadi.
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q) => {
                  const subName = subjectMap[q.subjectId]?.name || q.subjectName || '—';
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {q.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{subName}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                        {q.block === 'both' ? '1 & 2-blok' : q.block}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="line-clamp-2 text-sm text-slate-800">{q.questionText}</p>
                        {q.topic && (
                          <p className="mt-0.5 text-xs text-slate-400">Mavzu: {q.topic}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-bold text-blue-700">
                          {q.correctAnswer}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(q)}
                          title="Aktiv/Nofaol almashtirish"
                          className="cursor-pointer"
                        >
                          <StatusBadge status={q.status} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                        {formatTimestamp(q.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(q)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Oldingi
            </button>
            <div className="text-xs text-slate-500 tabular-nums">
              {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Keyingi
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingQuestion ? 'Test savolini tahrirlash' : 'Yangi test savoli qo‘shish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Fan *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Fan tanlang...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Blok *</label>
                  <select
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="1-blok">1-blok</option>
                    <option value="2-blok">2-blok</option>
                    <option value="both">1-blok va 2-blok (Ikkalasiga ham)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Savol matni *
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Savolni kiriting..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">A varianti *</label>
                  <input
                    type="text"
                    required
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">B varianti *</label>
                  <input
                    type="text"
                    required
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">C varianti *</label>
                  <input
                    type="text"
                    required
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">D varianti *</label>
                  <input
                    type="text"
                    required
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    To‘g‘ri javob *
                  </label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value as DtmAnswerOption)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-sm font-bold outline-none focus:border-blue-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Qiyinlik darajasi
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DtmDifficulty)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="EASY">Oson</option>
                    <option value="MEDIUM">O‘rta</option>
                    <option value="HARD">Qiyin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DtmStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Mavzu</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Masalan: Logarifmlar"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
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

      {/* Bulk Paste Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Testlarni ommaviy yuklash
              </h3>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Fan *</label>
                  <select
                    required
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Blok *</label>
                  <select
                    value={bulkBlock}
                    onChange={(e) => setBulkBlock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="1-blok">1-blok</option>
                    <option value="2-blok">2-blok</option>
                    <option value="both">1-blok va 2-blok</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Qiyinlik</label>
                  <select
                    value={bulkDifficulty}
                    onChange={(e) => setBulkDifficulty(e.target.value as DtmDifficulty)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="EASY">Oson</option>
                    <option value="MEDIUM">O‘rta</option>
                    <option value="HARD">Qiyin</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Matn formati namunasi:</p>
                <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[11px] text-slate-700">
{`2 + 2 * 2 nechiga teng?
====
#6
====
8
====
4
====
10
++++
Kvadrat ildiz 49 nechiga teng?
====
6
====
#7
====
8
====
9`}
                </pre>
                <p className="mt-1 text-slate-500">
                  To‘g‘ri javob oldiga <code className="font-mono font-bold">#</code> belgisini qo‘ying.
                </p>
              </div>

              <textarea
                rows={10}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Testlarni shu yerga joylashtiring..."
                className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-blue-500"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 tabular-nums">
                  Aniqlangan savollar: {bulkText.trim() ? parseBulkText(bulkText).length : 0} ta
                </span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBulkOpen(false)}
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
                    Bazaga yuklash
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
