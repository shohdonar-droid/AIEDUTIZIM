import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Building2,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users,
} from 'lucide-react';
import {
  createDtmOrganization,
  deleteDtmOrganization,
  formatDtmError,
  formatTimestamp,
  listDtmOrganizations,
  updateDtmOrganization,
} from '../../../services/dtmService';
import { DtmOrganization, DtmStatus } from '../../../types/dtm';
import { DtmModuleNav, StatusBadge } from './DtmModuleNav';

const ORG_TYPES = [
  'Umumta’lim maktabi',
  'Akademik litsey',
  'O‘quv markazi',
  'Prezident / Ixtisoslashtirilgan maktab',
  'Kollej / Texnikum',
  'Boshqa',
];

export default function DtmOrganizations() {
  const [organizations, setOrganizations] = useState<DtmOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<DtmOrganization | null>(null);

  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DtmStatus>('ACTIVE');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listDtmOrganizations();
      setOrganizations(list);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrgs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return organizations.filter((org) => {
      if (statusFilter !== 'ALL' && org.status !== statusFilter) return false;
      if (
        term &&
        !(
          org.name.toLowerCase().includes(term) ||
          (org.region || '').toLowerCase().includes(term) ||
          (org.responsiblePerson || '').toLowerCase().includes(term) ||
          (org.orgType || '').toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [organizations, search, statusFilter]);

  const openCreateModal = () => {
    setEditingOrg(null);
    setName('');
    setOrgType(ORG_TYPES[0]);
    setRegion('');
    setAddress('');
    setPhone('');
    setResponsiblePerson('');
    setNotes('');
    setStatus('ACTIVE');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (org: DtmOrganization) => {
    setEditingOrg(org);
    setName(org.name);
    setOrgType(org.orgType || ORG_TYPES[0]);
    setRegion(org.region || '');
    setAddress(org.address || '');
    setPhone(org.phone || '');
    setResponsiblePerson(org.responsiblePerson || '');
    setNotes(org.notes || '');
    setStatus(org.status || 'ACTIVE');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Tashkilot nomini kiriting.");
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingOrg) {
        await updateDtmOrganization(editingOrg.id, {
          name: name.trim(),
          orgType: orgType.trim(),
          region: region.trim(),
          address: address.trim(),
          phone: phone.trim(),
          responsiblePerson: responsiblePerson.trim(),
          notes: notes.trim(),
          status,
        });
        setSuccess(`“${name.trim()}” tashkiloti yangilandi.`);
      } else {
        await createDtmOrganization({
          name: name.trim(),
          orgType: orgType.trim(),
          region: region.trim(),
          address: address.trim(),
          phone: phone.trim(),
          responsiblePerson: responsiblePerson.trim(),
          notes: notes.trim(),
          status,
        });
        setSuccess(`“${name.trim()}” tashkiloti yaratildi.`);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: DtmOrganization) => {
    const count = org.studentCount || 0;
    const msg =
      count > 0
        ? `“${org.name}” tashkilotida ${count} ta o‘quvchi ro‘yxatga olingan. Shunga qaramay tashkilotni o‘chirmoqchimisiz?`
        : `“${org.name}” tashkilotini o‘chirishni tasdiqlaysizmi?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteDtmOrganization(org.id);
      setOrganizations((prev) => prev.filter((item) => item.id !== org.id));
      setSuccess(`“${org.name}” tashkiloti o‘chirildi.`);
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title="Tashkilotlar"
        subtitle="Maktablar, o‘quv markazlari va muassasalar bo‘yicha DTM test o‘quvchilarini boshqarish"
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Yangi tashkilot
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

      {/* Search & Filter */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tashkilot nomi, hudud yoki mas’ul shaxs bo‘yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ALL">Barcha holatlar</option>
          <option value="ACTIVE">Aktiv tashkilotlar</option>
          <option value="INACTIVE">Nofaol tashkilotlar</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Tashkilot nomi</th>
                <th className="px-4 py-3.5">Turi / Hudud</th>
                <th className="px-4 py-3.5">O‘quvchilar soni</th>
                <th className="px-4 py-3.5">Test variantlari</th>
                <th className="px-4 py-3.5">Yaratilgan sana</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Tashkilotlar yuklanmoqda...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Tashkilotlar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/dtm/organizations/${org.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {org.name}
                      </Link>
                      {org.responsiblePerson && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Mas’ul: {org.responsiblePerson}
                          {org.phone ? ` · ${org.phone}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{org.orgType || '—'}</div>
                      <div className="text-slate-500">{org.region || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {org.studentCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 tabular-nums">
                      {org.assignmentCount || 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                      {formatTimestamp(org.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/dtm/organizations/${org.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          O‘quvchilar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(org)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(org)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          title="O‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingOrg ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot yaratish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tashkilot nomi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Chirchiq shahar 15-son umumiy o‘rta ta’lim maktabi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tashkilot turi
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Hudud</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Masalan: Toshkent viloyati, Chirchiq"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Manzil</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ko‘cha, uy raqami..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Telefon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mas’ul shaxs
                  </label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    placeholder="F.I.Sh."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
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
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Izoh</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Qo‘shimcha ma’lumotlar..."
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
