import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { getNextSequentialId } from '../lib/idUtils';
import { generatePassword } from '../lib/helpers';
import {
  DtmAnswerOption,
  DtmAnswerSheet,
  DtmAnswerSourceType,
  DtmAssignment,
  DtmAssignmentStatus,
  DtmDashboardStats,
  DtmDifficulty,
  DtmOrganization,
  DtmQuestion,
  DtmQuestionSnapshot,
  DtmResult,
  DtmResultQuestionItem,
  DtmStatus,
  DtmStudent,
  DtmSubject,
} from '../types/dtm';

export class DtmServiceError extends Error {
  code: string;
  details?: any;
  constructor(message: string, code = 'DTM_ERROR', details?: any) {
    super(message);
    this.name = 'DtmServiceError';
    this.code = code;
    this.details = details;
  }
}

export function formatDtmError(error: unknown, fallback = "Kutilmagan xatolik yuz berdi"): string {
  if (error instanceof DtmServiceError) return error.message;
  const raw = error instanceof Error ? error.message : String(error || '');
  if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
    return "Ruxsat rad etildi (Permission denied). Admin sifatida tizimga kirganingizni tekshiring.";
  }
  if (raw.includes('not-found')) {
    return "So'ralgan ma'lumot bazada topilmadi.";
  }
  if (raw.includes('offline') || raw.includes('unavailable')) {
    return "Internet yoki Firestore bilan aloqa uzildi. Iltimos, qayta urinib ko'ring.";
  }
  return raw || fallback;
}

function assertSignedInAdmin() {
  if (!auth.currentUser) {
    throw new DtmServiceError(
      "Firebase autentifikatsiya sessiyasi faol emas. Iltimos, admin login orqali qayta tizimga kiring.",
      'AUTH_REQUIRED'
    );
  }
}

export function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  try {
    const date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(ts: any): string {
  if (!ts) return '—';
  try {
    const date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function sanitizeFilenamePart(value: string): string {
  return (value || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/['`‘’ʻ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'item';
}

// ==========================================
// 1. SUBJECTS CRUD
// ==========================================
export async function listDtmSubjects(): Promise<DtmSubject[]> {
  try {
    const snap = await getDocs(collection(db, 'dtmSubjects'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmSubject));
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz'));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmSubjects');
    throw new DtmServiceError(formatDtmError(err, "Fanlarni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function createDtmSubject(input: {
  name: string;
  code: string;
  blockType: string;
  description?: string;
  status: DtmStatus;
}): Promise<string> {
  assertSignedInAdmin();
  try {
    const ref = await addDoc(collection(db, 'dtmSubjects'), {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      blockType: input.blockType.trim(),
      description: (input.description || '').trim(),
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'dtmSubjects');
    throw new DtmServiceError(formatDtmError(err, "Fan qo'shishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function updateDtmSubject(
  id: string,
  input: Partial<Pick<DtmSubject, 'name' | 'code' | 'blockType' | 'description' | 'status'>>
): Promise<void> {
  assertSignedInAdmin();
  try {
    const payload: any = { updatedAt: serverTimestamp() };
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.code !== undefined) payload.code = input.code.trim().toUpperCase();
    if (input.blockType !== undefined) payload.blockType = input.blockType.trim();
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.status !== undefined) payload.status = input.status;
    await updateDoc(doc(db, 'dtmSubjects', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `dtmSubjects/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Fanni tahrirlashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function deleteDtmSubject(id: string): Promise<void> {
  assertSignedInAdmin();
  try {
    await deleteDoc(doc(db, 'dtmSubjects', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dtmSubjects/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Fanni o'chirishda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 2. QUESTIONS CRUD
// ==========================================
export async function listDtmQuestions(): Promise<DtmQuestion[]> {
  try {
    const snap = await getDocs(collection(db, 'dtmQuestions'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmQuestion));
    // Chronological ascending order: oldest first, newly added questions appear at the bottom
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? a.orderIndex ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? b.orderIndex ?? 0;
      if (ta !== tb) return ta - tb;
      const oa = a.orderIndex ?? 0;
      const ob = b.orderIndex ?? 0;
      if (oa !== ob) return oa - ob;
      return a.id.localeCompare(b.id);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmQuestions');
    throw new DtmServiceError(formatDtmError(err, "Testlar bazasini yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function createDtmQuestion(input: Omit<DtmQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  assertSignedInAdmin();
  try {
    const ref = await addDoc(collection(db, 'dtmQuestions'), {
      subjectId: input.subjectId,
      subjectName: input.subjectName || '',
      block: input.block || 'both',
      questionText: input.questionText.trim(),
      optionA: input.optionA.trim(),
      optionB: input.optionB.trim(),
      optionC: input.optionC.trim(),
      optionD: input.optionD.trim(),
      correctAnswer: input.correctAnswer,
      topic: (input.topic || '').trim(),
      difficulty: input.difficulty || 'MEDIUM',
      status: input.status || 'ACTIVE',
      orderIndex: input.orderIndex ?? Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'dtmQuestions');
    throw new DtmServiceError(formatDtmError(err, "Test savolini qo'shishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function bulkCreateDtmQuestions(
  items: Array<Omit<DtmQuestion, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  assertSignedInAdmin();
  if (items.length === 0) return 0;
  try {
    const chunkSize = 400;
    const baseOrder = Date.now();
    let saved = 0;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item, idx) => {
        const ref = doc(collection(db, 'dtmQuestions'));
        batch.set(ref, {
          subjectId: item.subjectId,
          subjectName: item.subjectName || '',
          block: item.block || 'both',
          questionText: item.questionText.trim(),
          optionA: item.optionA.trim(),
          optionB: item.optionB.trim(),
          optionC: item.optionC.trim(),
          optionD: item.optionD.trim(),
          correctAnswer: item.correctAnswer,
          topic: (item.topic || '').trim(),
          difficulty: item.difficulty || 'MEDIUM',
          status: item.status || 'ACTIVE',
          orderIndex: item.orderIndex ?? (baseOrder + i + idx),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      saved += chunk.length;
    }
    return saved;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'dtmQuestions (bulk)');
    throw new DtmServiceError(formatDtmError(err, "Testlarni ommaviy saqlashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function updateDtmQuestion(
  id: string,
  input: Partial<Omit<DtmQuestion, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  assertSignedInAdmin();
  try {
    const payload: any = { ...input, updatedAt: serverTimestamp() };
    if (payload.questionText !== undefined) payload.questionText = String(payload.questionText).trim();
    if (payload.optionA !== undefined) payload.optionA = String(payload.optionA).trim();
    if (payload.optionB !== undefined) payload.optionB = String(payload.optionB).trim();
    if (payload.optionC !== undefined) payload.optionC = String(payload.optionC).trim();
    if (payload.optionD !== undefined) payload.optionD = String(payload.optionD).trim();
    if (payload.topic !== undefined) payload.topic = String(payload.topic).trim();
    await updateDoc(doc(db, 'dtmQuestions', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `dtmQuestions/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Test savolini tahrirlashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function deleteDtmQuestion(id: string): Promise<void> {
  assertSignedInAdmin();
  try {
    await deleteDoc(doc(db, 'dtmQuestions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dtmQuestions/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Test savolini o'chirishda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 3. ORGANIZATIONS CRUD
// ==========================================
export async function listDtmOrganizations(): Promise<DtmOrganization[]> {
  try {
    const snap = await getDocs(collection(db, 'dtmOrganizations'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmOrganization));
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmOrganizations');
    throw new DtmServiceError(formatDtmError(err, "Tashkilotlarni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function getDtmOrganizationById(id: string): Promise<DtmOrganization | null> {
  try {
    const snap = await getDoc(doc(db, 'dtmOrganizations', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as DtmOrganization;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `dtmOrganizations/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Tashkilotni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

function clearAdminTeachersCache() {
  try {
    localStorage.removeItem('admin_users_last_load_time');
    localStorage.removeItem('admin_users_teachers_cache');
  } catch {
    // ignore storage errors
  }
}

async function createFirebaseAuthOrgAccount(params: {
  name: string;
  phone: string;
  organizationId: string;
  status?: DtmStatus;
  login?: string;
  password?: string;
}): Promise<{ ownerUid: string; login: string; password: string; email: string }> {
  const cleanLogin = (params.login || '').trim() || (await getNextSequentialId('teacher'));
  const pass = (params.password || '').trim() || generatePassword();

  if (pass.length < 6) {
    throw new DtmServiceError(
      "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
      'INVALID_PASSWORD'
    );
  }

  const existingLoginSnap = await getDocs(
    query(collection(db, 'users'), where('login', '==', cleanLogin))
  );
  if (!existingLoginSnap.empty) {
    throw new DtmServiceError(
      `“${cleanLogin}” logini allaqachon band. Boshqa login kiriting.`,
      'LOGIN_TAKEN'
    );
  }

  const email = `${cleanLogin.toLowerCase()}@teacher.uz`;
  const apiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: pass,
        returnSecureToken: false,
      }),
    }
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data?.localId) {
    const errCode = String(data?.error?.message || '');
    if (errCode.includes('EMAIL_EXISTS')) {
      throw new DtmServiceError(
        `“${cleanLogin}” logini tizimda band. Boshqa login kiriting.`,
        'LOGIN_TAKEN'
      );
    }
    throw new DtmServiceError(
      `Tashkilot uchun login profil yaratishda xatolik: ${errCode || response.status}`,
      'AUTH_CREATE_FAILED'
    );
  }

  const uid = String(data.localId);
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName: params.name.trim(),
    phone: (params.phone || '').trim(),
    login: cleanLogin,
    systemId: cleanLogin,
    password: pass,
    ball: 0,
    role: 'teacher',
    email,
    isDtmOrganization: true,
    dtmOrganizationId: params.organizationId,
    dtmOrganizationName: params.name.trim(),
    assignedTariff: 'DTM',
    tariffPrice: 0,
    status: params.status === 'INACTIVE' ? 'blocked' : 'active',
    createdAt: serverTimestamp(),
  });

  clearAdminTeachersCache();

  return {
    ownerUid: uid,
    login: cleanLogin,
    password: pass,
    email,
  };
}

export async function createDtmOrganization(input: {
  name: string;
  orgType: string;
  region: string;
  address: string;
  phone: string;
  responsiblePerson: string;
  notes?: string;
  status?: DtmStatus;
  login?: string;
  password?: string;
}): Promise<{ id: string; ownerUid: string; login: string; password: string; email: string }> {
  assertSignedInAdmin();
  try {
    const orgRef = doc(collection(db, 'dtmOrganizations'));
    const creds = await createFirebaseAuthOrgAccount({
      name: input.name,
      phone: input.phone,
      organizationId: orgRef.id,
      status: input.status,
      login: input.login,
      password: input.password,
    });

    await setDoc(orgRef, {
      name: input.name.trim(),
      orgType: input.orgType.trim(),
      region: input.region.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      responsiblePerson: input.responsiblePerson.trim(),
      notes: (input.notes || '').trim(),
      status: input.status || 'ACTIVE',
      studentCount: 0,
      assignmentCount: 0,
      ownerUid: creds.ownerUid,
      login: creds.login,
      password: creds.password,
      email: creds.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: orgRef.id,
      ...creds,
    };
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.CREATE, 'dtmOrganizations');
    throw new DtmServiceError(formatDtmError(err, "Tashkilot yaratishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function provisionDtmOrgProfile(
  org: DtmOrganization,
  customLogin?: string,
  customPassword?: string
): Promise<{ ownerUid: string; login: string; password: string; email: string }> {
  assertSignedInAdmin();
  try {
    const creds = await createFirebaseAuthOrgAccount({
      name: org.name,
      phone: org.phone || '',
      organizationId: org.id,
      status: org.status,
      login: customLogin,
      password: customPassword,
    });

    await updateDoc(doc(db, 'dtmOrganizations', org.id), {
      ownerUid: creds.ownerUid,
      login: creds.login,
      password: creds.password,
      email: creds.email,
      updatedAt: serverTimestamp(),
    });

    return creds;
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `dtmOrganizations/${org.id}`);
    throw new DtmServiceError(formatDtmError(err, "Tashkilot profilini yaratishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function updateDtmOrganization(
  id: string,
  input: Partial<Omit<DtmOrganization, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  assertSignedInAdmin();
  try {
    const orgSnap = await getDoc(doc(db, 'dtmOrganizations', id));
    const currentOrg = orgSnap.exists() ? (orgSnap.data() as DtmOrganization) : null;

    await updateDoc(doc(db, 'dtmOrganizations', id), {
      ...input,
      updatedAt: serverTimestamp(),
    });

    const ownerUid = input.ownerUid || currentOrg?.ownerUid;
    if (ownerUid) {
      const userUpdates: Record<string, any> = {
        isDtmOrganization: true,
        dtmOrganizationId: id,
      };
      if (input.name !== undefined) {
        userUpdates.displayName = input.name.trim();
        userUpdates.dtmOrganizationName = input.name.trim();
      }
      if (input.phone !== undefined) userUpdates.phone = input.phone.trim();
      if (input.password !== undefined && input.password.trim().length >= 6) {
        userUpdates.password = input.password.trim();
      }
      if (input.status !== undefined) {
        userUpdates.status = input.status === 'INACTIVE' ? 'blocked' : 'active';
      }
      await setDoc(doc(db, 'users', ownerUid), userUpdates, { merge: true }).catch(() => {});
      clearAdminTeachersCache();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `dtmOrganizations/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Tashkilotni yangilashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function deleteDtmOrganization(id: string): Promise<void> {
  assertSignedInAdmin();
  try {
    await deleteDoc(doc(db, 'dtmOrganizations', id));
    clearAdminTeachersCache();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dtmOrganizations/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Tashkilotni o'chirishda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 4. STUDENTS + GLOBAL 7-DIGIT ATOMIC ID
// ==========================================
export async function listDtmStudentsByOrg(organizationId: string): Promise<DtmStudent[]> {
  try {
    const q = query(collection(db, 'dtmStudents'), where('organizationId', '==', organizationId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmStudent));
    return list.sort((a, b) => a.numericId.localeCompare(b.numericId));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmStudents');
    throw new DtmServiceError(formatDtmError(err, "O'quvchilarni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function listAllDtmStudents(): Promise<DtmStudent[]> {
  try {
    const snap = await getDocs(collection(db, 'dtmStudents'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmStudent));
    return list.sort((a, b) => a.numericId.localeCompare(b.numericId));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmStudents');
    throw new DtmServiceError(formatDtmError(err, "O'quvchilarni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function findDtmStudentByNumericId(
  numericId: string,
  organizationId?: string
): Promise<DtmStudent | null> {
  const cleanId = numericId.trim();
  if (!/^\d{7}$/.test(cleanId)) return null;
  try {
    const q = organizationId
      ? query(
          collection(db, 'dtmStudents'),
          where('numericId', '==', cleanId),
          where('organizationId', '==', organizationId)
        )
      : query(collection(db, 'dtmStudents'), where('numericId', '==', cleanId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as DtmStudent;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'dtmStudents');
    throw new DtmServiceError(formatDtmError(err, "O'quvchini ID bo'yicha qidirishda xatolik"), 'FIRESTORE_ERROR');
  }
}

/**
 * Queries active questions for both block1 and block2, validates >= 30 each,
 * and returns balanced randomized 30 + 30 snapshots without side effects.
 */
async function prepareQuestionSnapshotsForBlocks(params: {
  block1SubjectId: string;
  block1SubjectName: string;
  block2SubjectId: string;
  block2SubjectName: string;
}): Promise<{ block1Questions: DtmQuestionSnapshot[]; block2Questions: DtmQuestionSnapshot[] }> {
  const [snap1, snap2] = await Promise.all([
    getDocs(
      query(
        collection(db, 'dtmQuestions'),
        where('subjectId', '==', params.block1SubjectId),
        where('status', '==', 'ACTIVE')
      )
    ),
    params.block1SubjectId === params.block2SubjectId
      ? Promise.resolve(null)
      : getDocs(
          query(
            collection(db, 'dtmQuestions'),
            where('subjectId', '==', params.block2SubjectId),
            where('status', '==', 'ACTIVE')
          )
        ),
  ]);

  const raw1 = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as DtmQuestion));
  const raw2 = snap2
    ? snap2.docs.map((d) => ({ id: d.id, ...d.data() } as DtmQuestion))
    : raw1;

  // Subjects and questions are independent of blocks; blocks are chosen per student.
  const pool1 = raw1;
  const pool2 = raw2;

  const errors: string[] = [];
  if (pool1.length < 30) {
    errors.push(
      `“${params.block1SubjectName}” fanida 30 ta aktiv test mavjud emas. Hozir mavjud testlar soni: ${pool1.length} ta. Test variantini yaratish uchun kamida 30 ta aktiv test kerak.`
    );
  }
  if (pool2.length < 30 && params.block1SubjectId !== params.block2SubjectId) {
    errors.push(
      `“${params.block2SubjectName}” fanida 30 ta aktiv test mavjud emas. Hozir mavjud testlar soni: ${pool2.length} ta. Test variantini yaratish uchun kamida 30 ta aktiv test kerak.`
    );
  }

  if (errors.length > 0) {
    throw new DtmServiceError(errors.join('\n'), 'INSUFFICIENT_QUESTIONS', {
      block1Available: pool1.length,
      block2Available: pool2.length,
    });
  }

  const chosen1 = selectBalancedRandomQuestions(pool1, 30, new Set());
  const usedIds = new Set(chosen1.map((q) => q.id));
  const chosen2 = selectBalancedRandomQuestions(pool2, 30, usedIds);

  if (chosen1.length < 30 || chosen2.length < 30) {
    throw new DtmServiceError(
      "Takrorlanmas 60 ta savol tanlash uchun aktiv testlar yetarli emas (1-blok va 2-blok bir xil fandan tanlangan bo'lsa kamida 60 ta aktiv test kerak).",
      'INSUFFICIENT_UNIQUE_QUESTIONS'
    );
  }

  const buildShuffledSnapshot = (
    q: DtmQuestion,
    order: number,
    subjectId: string,
    subjectName: string,
    blockLabel: '1-blok' | '2-blok'
  ): DtmQuestionSnapshot => {
    const optionEntries: Array<{ text: string; isCorrect: boolean }> = [
      { text: q.optionA, isCorrect: q.correctAnswer === 'A' },
      { text: q.optionB, isCorrect: q.correctAnswer === 'B' },
      { text: q.optionC, isCorrect: q.correctAnswer === 'C' },
      { text: q.optionD, isCorrect: q.correctAnswer === 'D' },
    ];
    const shuffledOptions = shuffleFisherYates(optionEntries);
    const letters: DtmAnswerOption[] = ['A', 'B', 'C', 'D'];
    const correctIdx = shuffledOptions.findIndex((opt) => opt.isCorrect);
    const remappedCorrect: DtmAnswerOption =
      correctIdx >= 0 ? letters[correctIdx] : q.correctAnswer;

    return {
      order,
      questionId: q.id,
      originalQuestionId: q.id,
      questionText: q.questionText,
      optionA: shuffledOptions[0].text,
      optionB: shuffledOptions[1].text,
      optionC: shuffledOptions[2].text,
      optionD: shuffledOptions[3].text,
      correctAnswer: remappedCorrect,
      subjectId,
      subjectName,
      block: blockLabel,
      difficulty: q.difficulty,
      topic: q.topic || '',
    };
  };

  const block1Questions: DtmQuestionSnapshot[] = chosen1.map((q, idx) =>
    buildShuffledSnapshot(q, idx + 1, params.block1SubjectId, params.block1SubjectName, '1-blok')
  );

  const block2Questions: DtmQuestionSnapshot[] = chosen2.map((q, idx) =>
    buildShuffledSnapshot(q, 31 + idx, params.block2SubjectId, params.block2SubjectName, '2-blok')
  );

  return { block1Questions, block2Questions };
}

function shuffleFisherYates<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Selects `count` unique questions with optional difficulty-aware distribution
 * (aiming for balanced EASY / MEDIUM / HARD mix when enough questions exist).
 */
export function selectBalancedRandomQuestions(
  pool: DtmQuestion[],
  count: number,
  excludeIds: Set<string>
): DtmQuestion[] {
  const uniqueMap = new Map<string, DtmQuestion>();
  for (const q of pool) {
    if (!excludeIds.has(q.id) && !uniqueMap.has(q.id)) {
      uniqueMap.set(q.id, q);
    }
  }
  const uniquePool = Array.from(uniqueMap.values());
  if (uniquePool.length <= count) {
    return shuffleFisherYates(uniquePool).slice(0, count);
  }

  const easy = shuffleFisherYates(uniquePool.filter((q) => q.difficulty === 'EASY'));
  const medium = shuffleFisherYates(uniquePool.filter((q) => q.difficulty === 'MEDIUM'));
  const hard = shuffleFisherYates(uniquePool.filter((q) => q.difficulty === 'HARD'));

  // Target balanced ratio ~ 30% EASY, 45% MEDIUM, 25% HARD when available
  const targetEasy = Math.min(easy.length, Math.round(count * 0.3));
  const targetHard = Math.min(hard.length, Math.round(count * 0.25));
  const targetMedium = Math.min(medium.length, count - targetEasy - targetHard);

  const selected: DtmQuestion[] = [
    ...easy.slice(0, targetEasy),
    ...medium.slice(0, targetMedium),
    ...hard.slice(0, targetHard),
  ];

  const selectedIds = new Set(selected.map((q) => q.id));
  if (selected.length < count) {
    const leftovers = shuffleFisherYates(uniquePool.filter((q) => !selectedIds.has(q.id)));
    for (const q of leftovers) {
      if (selected.length >= count) break;
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return shuffleFisherYates(selected);
}

/**
 * Atomically creates a DTM Student with a unique global 7-digit ID (starting from 1000001).
 * If generateAssignmentImmediately is true, validates 30+30 active questions first and writes
 * student + assignment atomically in the same transaction so no partial state occurs.
 */
export async function createDtmStudent(
  input: {
    organizationId: string;
    organizationName: string;
    fullName: string;
    groupOrClass: string;
    phone?: string;
    notes?: string;
    block1SubjectId: string;
    block1SubjectName: string;
    block2SubjectId: string;
    block2SubjectName: string;
  },
  generateAssignmentImmediately = false
): Promise<{ student: DtmStudent; assignment?: DtmAssignment }> {
  assertSignedInAdmin();

  let preparedSnapshots: {
    block1Questions: DtmQuestionSnapshot[];
    block2Questions: DtmQuestionSnapshot[];
  } | null = null;

  if (generateAssignmentImmediately) {
    preparedSnapshots = await prepareQuestionSnapshotsForBlocks({
      block1SubjectId: input.block1SubjectId,
      block1SubjectName: input.block1SubjectName,
      block2SubjectId: input.block2SubjectId,
      block2SubjectName: input.block2SubjectName,
    });
  }

  try {
    const studentCounterRef = doc(db, 'dtmCounters', 'student_numeric_id');
    const assignmentCounterRef = doc(db, 'dtmCounters', 'assignment_seq_2026');
    const orgRef = doc(db, 'dtmOrganizations', input.organizationId);
    const newStudentRef = doc(collection(db, 'dtmStudents'));

    const txResult = await runTransaction(db, async (tx) => {
      const orgSnap = await tx.get(orgRef);
      if (!orgSnap.exists()) {
        throw new DtmServiceError("Tanlangan tashkilot topilmadi.", 'ORG_NOT_FOUND');
      }

      const studentCounterSnap = await tx.get(studentCounterRef);
      let currentStudentNum = 1000001;
      if (studentCounterSnap.exists()) {
        const val = Number(studentCounterSnap.data().nextValue);
        if (!isNaN(val) && val >= 1000001) {
          currentStudentNum = val;
        }
      }
      const numericId = String(currentStudentNum).padStart(7, '0');

      let assignmentData: DtmAssignment | undefined;
      let assignmentDocRef: any = null;
      let nextAssignmentSeq = 1;

      if (preparedSnapshots) {
        const assignCounterSnap = await tx.get(assignmentCounterRef);
        if (assignCounterSnap.exists()) {
          const val = Number(assignCounterSnap.data().nextValue);
          if (!isNaN(val) && val >= 1) nextAssignmentSeq = val;
        }
        const assignmentCode = `DTM-2026-${String(nextAssignmentSeq).padStart(6, '0')}`;
        assignmentDocRef = doc(db, 'dtmAssignments', assignmentCode);

        assignmentData = {
          id: assignmentCode,
          assignmentCode,
          version: 1,
          isLatest: true,
          organizationId: input.organizationId,
          organizationName: input.organizationName,
          studentId: newStudentRef.id,
          studentNumericId: numericId,
          studentFullName: input.fullName.trim(),
          studentGroupOrClass: input.groupOrClass.trim(),
          block1SubjectId: input.block1SubjectId,
          block1SubjectName: input.block1SubjectName,
          block2SubjectId: input.block2SubjectId,
          block2SubjectName: input.block2SubjectName,
          block1Questions: preparedSnapshots.block1Questions,
          block2Questions: preparedSnapshots.block2Questions,
          totalQuestions: 60,
          status: 'GENERATED',
          generatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      const studentPayload: any = {
        numericId,
        organizationId: input.organizationId,
        organizationName: input.organizationName,
        fullName: input.fullName.trim(),
        groupOrClass: input.groupOrClass.trim(),
        phone: (input.phone || '').trim(),
        notes: (input.notes || '').trim(),
        block1SubjectId: input.block1SubjectId,
        block1SubjectName: input.block1SubjectName,
        block2SubjectId: input.block2SubjectId,
        block2SubjectName: input.block2SubjectName,
        latestAssignmentId: assignmentData ? assignmentData.id : null,
        latestAssignmentCode: assignmentData ? assignmentData.assignmentCode : null,
        latestAssignmentStatus: assignmentData ? 'GENERATED' : null,
        latestResultId: null,
        latestScore: null,
        latestPercentage: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(studentCounterRef, {
        nextValue: currentStudentNum + 1,
        updatedAt: serverTimestamp(),
      });

      tx.set(newStudentRef, studentPayload);

      const currentStudentCount = Number(orgSnap.data().studentCount || 0);
      const currentAssignmentCount = Number(orgSnap.data().assignmentCount || 0);
      tx.update(orgRef, {
        studentCount: currentStudentCount + 1,
        assignmentCount: assignmentData ? currentAssignmentCount + 1 : currentAssignmentCount,
        updatedAt: serverTimestamp(),
      });

      if (assignmentData && assignmentDocRef) {
        tx.set(assignmentCounterRef, {
          nextValue: nextAssignmentSeq + 1,
          updatedAt: serverTimestamp(),
        });
        tx.set(assignmentDocRef, assignmentData);
      }

      return {
        student: { id: newStudentRef.id, ...studentPayload } as DtmStudent,
        assignment: assignmentData,
      };
    });

    return txResult;
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.WRITE, 'dtmStudents');
    throw new DtmServiceError(formatDtmError(err, "O'quvchi yaratishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function bulkImportDtmStudents(
  organizationId: string,
  organizationName: string,
  rows: Array<{
    fullName: string;
    groupOrClass: string;
    phone?: string;
    block1SubjectId: string;
    block1SubjectName: string;
    block2SubjectId: string;
    block2SubjectName: string;
  }>
): Promise<DtmStudent[]> {
  assertSignedInAdmin();
  if (rows.length === 0) return [];
  try {
    const studentCounterRef = doc(db, 'dtmCounters', 'student_numeric_id');
    const orgRef = doc(db, 'dtmOrganizations', organizationId);

    const startNumericId = await runTransaction(db, async (tx) => {
      const orgSnap = await tx.get(orgRef);
      if (!orgSnap.exists()) {
        throw new DtmServiceError("Tashkilot topilmadi", 'ORG_NOT_FOUND');
      }
      const counterSnap = await tx.get(studentCounterRef);
      let startVal = 1000001;
      if (counterSnap.exists()) {
        const val = Number(counterSnap.data().nextValue);
        if (!isNaN(val) && val >= 1000001) startVal = val;
      }
      tx.set(studentCounterRef, {
        nextValue: startVal + rows.length,
        updatedAt: serverTimestamp(),
      });
      tx.update(orgRef, {
        studentCount: Number(orgSnap.data().studentCount || 0) + rows.length,
        updatedAt: serverTimestamp(),
      });
      return startVal;
    });

    const created: DtmStudent[] = [];
    const chunkSize = 400;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((row, idx) => {
        const numericId = String(startNumericId + i + idx).padStart(7, '0');
        const ref = doc(collection(db, 'dtmStudents'));
        const payload: any = {
          numericId,
          organizationId,
          organizationName,
          fullName: row.fullName.trim(),
          groupOrClass: (row.groupOrClass || '').trim(),
          phone: (row.phone || '').trim(),
          notes: 'Excel import',
          block1SubjectId: row.block1SubjectId,
          block1SubjectName: row.block1SubjectName,
          block2SubjectId: row.block2SubjectId,
          block2SubjectName: row.block2SubjectName,
          latestAssignmentId: null,
          latestAssignmentCode: null,
          latestAssignmentStatus: null,
          latestResultId: null,
          latestScore: null,
          latestPercentage: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(ref, payload);
        created.push({ id: ref.id, ...payload });
      });
      await batch.commit();
    }

    return created;
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.WRITE, 'dtmStudents (import)');
    throw new DtmServiceError(formatDtmError(err, "O'quvchilarni import qilishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function updateDtmStudent(
  studentId: string,
  updates: Partial<
    Pick<
      DtmStudent,
      | 'fullName'
      | 'groupOrClass'
      | 'phone'
      | 'notes'
      | 'block1SubjectId'
      | 'block1SubjectName'
      | 'block2SubjectId'
      | 'block2SubjectName'
    >
  >
): Promise<void> {
  assertSignedInAdmin();
  try {
    const snap = await getDoc(doc(db, 'dtmStudents', studentId));
    if (!snap.exists()) {
      throw new DtmServiceError("O'quvchi topilmadi.", 'STUDENT_NOT_FOUND');
    }
    const existing = snap.data() as DtmStudent;
    await updateDoc(doc(db, 'dtmStudents', studentId), {
      ...updates,
      numericId: existing.numericId, // Strictly preserve 7-digit ID
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `dtmStudents/${studentId}`);
    throw new DtmServiceError(formatDtmError(err, "O'quvchini yangilashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function deleteDtmStudent(studentId: string, organizationId: string): Promise<void> {
  assertSignedInAdmin();
  try {
    await deleteDoc(doc(db, 'dtmStudents', studentId));
    if (organizationId) {
      await updateDoc(doc(db, 'dtmOrganizations', organizationId), {
        studentCount: increment(-1),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dtmStudents/${studentId}`);
    throw new DtmServiceError(formatDtmError(err, "O'quvchini o'chirishda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 5. ASSIGNMENTS GENERATION & QUERIES
// ==========================================
export async function generateStudentAssignment(params: {
  student: DtmStudent;
  allowRegenerate?: boolean;
}): Promise<DtmAssignment> {
  assertSignedInAdmin();
  const { student, allowRegenerate = false } = params;

  if (!student || !student.id) {
    throw new DtmServiceError("O'quvchi topilmadi.", 'STUDENT_NOT_FOUND');
  }

  // Check existing non-cancelled/non-superseded assignments
  const existingQ = query(
    collection(db, 'dtmAssignments'),
    where('studentId', '==', student.id),
    where('organizationId', '==', student.organizationId)
  );
  const existingSnap = await getDocs(existingQ);
  const activeExisting = existingSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as DtmAssignment))
    .filter((a) => a.status !== 'CANCELLED' && a.status !== 'SUPERSEDED');

  if (activeExisting.length > 0 && !allowRegenerate) {
    throw new DtmServiceError(
      "Ushbu o'quvchi uchun test varianti allaqachon yaratilgan. Qayta yaratish mavjud variantni almashtiradi.",
      'ASSIGNMENT_EXISTS',
      { existingAssignment: activeExisting[0] }
    );
  }

  // Resolve latest subject names just in case
  const [sub1Snap, sub2Snap] = await Promise.all([
    getDoc(doc(db, 'dtmSubjects', student.block1SubjectId)),
    getDoc(doc(db, 'dtmSubjects', student.block2SubjectId)),
  ]);
  const block1SubjectName = sub1Snap.exists()
    ? (sub1Snap.data() as DtmSubject).name
    : student.block1SubjectName || '1-blok fani';
  const block2SubjectName = sub2Snap.exists()
    ? (sub2Snap.data() as DtmSubject).name
    : student.block2SubjectName || '2-blok fani';

  if (!sub1Snap.exists()) {
    throw new DtmServiceError("1-blok fani bazada topilmadi.", 'SUBJECT_NOT_FOUND');
  }
  if (!sub2Snap.exists()) {
    throw new DtmServiceError("2-blok fani bazada topilmadi.", 'SUBJECT_NOT_FOUND');
  }

  const { block1Questions, block2Questions } = await prepareQuestionSnapshotsForBlocks({
    block1SubjectId: student.block1SubjectId,
    block1SubjectName,
    block2SubjectId: student.block2SubjectId,
    block2SubjectName,
  });

  const nextVersion = existingSnap.size + 1;
  const assignCounterRef = doc(db, 'dtmCounters', 'assignment_seq_2026');
  const studentRef = doc(db, 'dtmStudents', student.id);
  const orgRef = doc(db, 'dtmOrganizations', student.organizationId);

  try {
    const newAssignment = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(assignCounterRef);
      const orgSnap = await tx.get(orgRef);
      let nextSeq = 1;
      if (counterSnap.exists()) {
        const val = Number(counterSnap.data().nextValue);
        if (!isNaN(val) && val >= 1) nextSeq = val;
      }

      const assignmentCode = `DTM-2026-${String(nextSeq).padStart(6, '0')}`;
      const newAssignRef = doc(db, 'dtmAssignments', assignmentCode);

      // Mark previous active assignments as SUPERSEDED (preserving history!)
      for (const prev of activeExisting) {
        tx.update(doc(db, 'dtmAssignments', prev.id), {
          status: 'SUPERSEDED',
          isLatest: false,
          updatedAt: serverTimestamp(),
        });
      }

      const assignmentPayload: DtmAssignment = {
        id: assignmentCode,
        assignmentCode,
        version: nextVersion,
        isLatest: true,
        organizationId: student.organizationId,
        organizationName: student.organizationName || (orgSnap.exists() ? orgSnap.data().name : ''),
        studentId: student.id,
        studentNumericId: student.numericId,
        studentFullName: student.fullName,
        studentGroupOrClass: student.groupOrClass || '',
        block1SubjectId: student.block1SubjectId,
        block1SubjectName,
        block2SubjectId: student.block2SubjectId,
        block2SubjectName,
        block1Questions,
        block2Questions,
        totalQuestions: 60,
        status: 'GENERATED',
        generatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(assignCounterRef, {
        nextValue: nextSeq + 1,
        updatedAt: serverTimestamp(),
      });
      tx.set(newAssignRef, assignmentPayload);
      tx.update(studentRef, {
        latestAssignmentId: assignmentCode,
        latestAssignmentCode: assignmentCode,
        latestAssignmentStatus: 'GENERATED',
        updatedAt: serverTimestamp(),
      });

      if (orgSnap.exists() && activeExisting.length === 0) {
        tx.update(orgRef, {
          assignmentCount: Number(orgSnap.data().assignmentCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }

      return assignmentPayload;
    });

    return newAssignment;
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    handleFirestoreError(err, OperationType.WRITE, 'dtmAssignments');
    throw new DtmServiceError(formatDtmError(err, "Test variantini yaratishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function generateAssignmentsForOrganization(
  students: DtmStudent[],
  onProgress?: (current: number, total: number, currentName: string) => void
): Promise<{
  createdCount: number;
  skippedCount: number;
  errors: Array<{ studentName: string; numericId: string; message: string }>;
}> {
  const targets = students.filter(
    (s) => !s.latestAssignmentId || s.latestAssignmentStatus === 'CANCELLED'
  );
  let createdCount = 0;
  const skippedCount = students.length - targets.length;
  const errors: Array<{ studentName: string; numericId: string; message: string }> = [];

  for (let i = 0; i < targets.length; i++) {
    const st = targets[i];
    if (onProgress) onProgress(i + 1, targets.length, st.fullName);
    try {
      await generateStudentAssignment({ student: st, allowRegenerate: false });
      createdCount++;
    } catch (err) {
      errors.push({
        studentName: st.fullName,
        numericId: st.numericId,
        message: formatDtmError(err),
      });
    }
  }

  return { createdCount, skippedCount, errors };
}

export async function listDtmAssignments(organizationId?: string): Promise<DtmAssignment[]> {
  try {
    const q = organizationId
      ? query(collection(db, 'dtmAssignments'), where('organizationId', '==', organizationId))
      : collection(db, 'dtmAssignments');
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmAssignment));
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmAssignments');
    throw new DtmServiceError(formatDtmError(err, "Test variantlarini yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function getDtmAssignmentById(id: string): Promise<DtmAssignment | null> {
  try {
    const snap = await getDoc(doc(db, 'dtmAssignments', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as DtmAssignment;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `dtmAssignments/${id}`);
    throw new DtmServiceError(formatDtmError(err, "Test variantini olishda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function getLatestAssignmentByStudentNumericId(
  numericId: string,
  organizationId?: string
): Promise<{ student: DtmStudent; assignment: DtmAssignment | null }> {
  const student = await findDtmStudentByNumericId(numericId, organizationId);
  if (!student) {
    throw new DtmServiceError(
      organizationId
        ? `ID: ${numericId} bo'yicha sizning tashkilotingizda o'quvchi topilmadi.`
        : `ID: ${numericId} bo'yicha o'quvchi topilmadi.`,
      'STUDENT_NOT_FOUND'
    );
  }

  let assignment: DtmAssignment | null = null;
  if (student.latestAssignmentId) {
    assignment = await getDtmAssignmentById(student.latestAssignmentId);
  }
  if (!assignment) {
    const assignQ = organizationId
      ? query(
          collection(db, 'dtmAssignments'),
          where('studentNumericId', '==', student.numericId),
          where('organizationId', '==', organizationId)
        )
      : query(collection(db, 'dtmAssignments'), where('studentNumericId', '==', student.numericId));
    const snap = await getDocs(assignQ);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DtmAssignment))
      .filter((a) => a.status !== 'CANCELLED' && a.status !== 'SUPERSEDED')
      .sort((a, b) => (b.version || 1) - (a.version || 1));
    assignment = list[0] || null;
  }

  return { student, assignment };
}

export async function updateDtmAssignmentStatus(
  assignmentId: string,
  status: DtmAssignmentStatus,
  studentId?: string
): Promise<void> {
  assertSignedInAdmin();
  try {
    await updateDoc(doc(db, 'dtmAssignments', assignmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
    if (studentId) {
      await updateDoc(doc(db, 'dtmStudents', studentId), {
        latestAssignmentStatus: status,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `dtmAssignments/${assignmentId}`);
    throw new DtmServiceError(formatDtmError(err, "Variant holatini yangilashda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 6. SERVER-SIDE PDF & ZIP GENERATION
// ==========================================
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function downloadTestBookletPdf(assignment: DtmAssignment): Promise<void> {
  assertSignedInAdmin();
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/dtm/pdf/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({ assignment }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new DtmServiceError(errData.error || "Test PDF yaratishda server xatoligi", 'PDF_ERROR');
    }
    const blob = await res.blob();
    triggerBlobDownload(blob, `Test_${assignment.studentNumericId}.pdf`);
    if (assignment.status === 'GENERATED') {
      await updateDtmAssignmentStatus(assignment.id, 'PDF_READY', assignment.studentId).catch(() => {});
    }
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    throw new DtmServiceError(formatDtmError(err, "Test PDF yuklab olishda xatolik"), 'PDF_ERROR');
  }
}

export async function downloadAnswerSheetPdf(assignment: DtmAssignment): Promise<void> {
  assertSignedInAdmin();
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/dtm/pdf/answer-sheet', {
      method: 'POST',
      headers,
      body: JSON.stringify({ assignment }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new DtmServiceError(errData.error || "Javoblar varaqasi PDF yaratishda server xatoligi", 'PDF_ERROR');
    }
    const blob = await res.blob();
    triggerBlobDownload(blob, `Javoblar_${assignment.studentNumericId}.pdf`);
    if (assignment.status === 'GENERATED') {
      await updateDtmAssignmentStatus(assignment.id, 'PDF_READY', assignment.studentId).catch(() => {});
    }
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    throw new DtmServiceError(formatDtmError(err, "Javoblar varaqasi PDF yuklab olishda xatolik"), 'PDF_ERROR');
  }
}

export async function downloadOrganizationZip(
  organizationName: string,
  assignments: DtmAssignment[]
): Promise<void> {
  assertSignedInAdmin();
  if (assignments.length === 0) {
    throw new DtmServiceError("ZIP yaratish uchun kamida bitta tayyor test varianti bo'lishi kerak.", 'NO_ASSIGNMENTS');
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/dtm/zip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ organizationName, assignments }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new DtmServiceError(errData.error || "ZIP arxiv yaratishda server xatoligi", 'ZIP_ERROR');
    }
    const blob = await res.blob();
    const safeOrg = sanitizeFilenamePart(organizationName);
    triggerBlobDownload(blob, `${safeOrg}_DTM.zip`);

    // Mark assignments as DOWNLOADED in batches (except already CHECKED ones)
    const toUpdate = assignments.filter((a) => a.status === 'GENERATED' || a.status === 'PDF_READY');
    for (let i = 0; i < toUpdate.length; i += 200) {
      const chunk = toUpdate.slice(i, i + 200);
      const batch = writeBatch(db);
      for (const a of chunk) {
        batch.update(doc(db, 'dtmAssignments', a.id), {
          status: 'DOWNLOADED',
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'dtmStudents', a.studentId), {
          latestAssignmentStatus: 'DOWNLOADED',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit().catch(() => {});
    }
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    throw new DtmServiceError(formatDtmError(err, "ZIP arxivini yuklab olishda xatolik"), 'ZIP_ERROR');
  }
}

// ==========================================
// 7. ANSWER CHECKING & RESULTS
// ==========================================
export async function submitAndCheckAnswerSheet(params: {
  student: DtmStudent;
  assignment: DtmAssignment;
  answers: Record<string, DtmAnswerOption | ''>;
  sourceType?: DtmAnswerSourceType;
  fileUrl?: string | null;
  fileName?: string | null;
}): Promise<DtmResult> {
  assertSignedInAdmin();
  const { student, assignment, answers, sourceType = 'MANUAL', fileUrl = null, fileName = null } = params;

  const allQuestions = [
    ...(assignment.block1Questions || []),
    ...(assignment.block2Questions || []),
  ].sort((a, b) => a.order - b.order);

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let block1Correct = 0;
  let block2Correct = 0;

  const questionBreakdown: DtmResultQuestionItem[] = allQuestions.map((q) => {
    const selected = (answers[String(q.order)] || '') as DtmAnswerOption | '';
    const isCorrect = selected !== '' && selected === q.correctAnswer;
    if (selected === '') {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
      if (q.order <= 30) block1Correct++;
      else block2Correct++;
    } else {
      wrongCount++;
    }

    return {
      order: q.order,
      subjectName: q.subjectName || (q.order <= 30 ? assignment.block1SubjectName : assignment.block2SubjectName),
      block: q.block || (q.order <= 30 ? '1-blok' : '2-blok'),
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  const totalQuestions = allQuestions.length || 60;
  const percentage = Math.round((correctCount / totalQuestions) * 1000) / 10;
  // Standard DTM block score: 1-blok * 3.1 + 2-blok * 2.1 (max 156.0 ball)
  const score = Math.round((block1Correct * 3.1 + block2Correct * 2.1) * 10) / 10;

  try {
    const batch = writeBatch(db);
    const sheetRef = doc(collection(db, 'dtmAnswerSheets'));
    const resultRef = doc(collection(db, 'dtmResults'));
    const checker = auth.currentUser?.email || auth.currentUser?.uid || 'admin';

    const sheetPayload: Omit<DtmAnswerSheet, 'id'> = {
      studentNumericId: student.numericId,
      studentId: student.id,
      assignmentId: assignment.id,
      assignmentCode: assignment.assignmentCode,
      organizationId: assignment.organizationId,
      sourceType,
      fileUrl,
      fileName,
      answers,
      ocrConfidence: sourceType === 'MANUAL' ? 100 : null,
      status: 'CHECKED',
      checkedBy: checker,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const resultPayload: Omit<DtmResult, 'id'> = {
      organizationId: assignment.organizationId,
      organizationName: assignment.organizationName,
      studentId: student.id,
      studentNumericId: student.numericId,
      studentFullName: student.fullName,
      assignmentId: assignment.id,
      assignmentCode: assignment.assignmentCode,
      answerSheetId: sheetRef.id,
      block1SubjectName: assignment.block1SubjectName,
      block2SubjectName: assignment.block2SubjectName,
      totalQuestions,
      correctCount,
      wrongCount,
      unansweredCount,
      block1Correct,
      block2Correct,
      percentage,
      score,
      questionBreakdown,
      checkedBy: checker,
      checkedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(sheetRef, sheetPayload);
    batch.set(resultRef, resultPayload);
    batch.update(doc(db, 'dtmAssignments', assignment.id), {
      status: 'CHECKED',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'dtmStudents', student.id), {
      latestAssignmentStatus: 'CHECKED',
      latestResultId: resultRef.id,
      latestScore: score,
      latestPercentage: percentage,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return { id: resultRef.id, ...resultPayload } as DtmResult;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'dtmResults');
    throw new DtmServiceError(formatDtmError(err, "Javoblarni saqlashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function listDtmResults(organizationId?: string): Promise<DtmResult[]> {
  try {
    const q = organizationId
      ? query(collection(db, 'dtmResults'), where('organizationId', '==', organizationId))
      : collection(db, 'dtmResults');
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DtmResult));
    return list.sort((a, b) => {
      const ta = a.checkedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const tb = b.checkedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'dtmResults');
    throw new DtmServiceError(formatDtmError(err, "Natijalarni yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

// ==========================================
// 8. DASHBOARD AGGREGATION
// ==========================================
export async function getDtmDashboardData(): Promise<{
  stats: DtmDashboardStats;
  recentOrganizations: DtmOrganization[];
  recentAssignments: DtmAssignment[];
}> {
  try {
    const [orgs, students, questions, subjects, assignments, results] = await Promise.all([
      listDtmOrganizations(),
      listAllDtmStudents(),
      listDtmQuestions(),
      listDtmSubjects(),
      listDtmAssignments(),
      listDtmResults(),
    ]);

    const activeQuestions = questions.filter((q) => q.status === 'ACTIVE').length;
    const validAssignments = assignments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'SUPERSEDED');

    const totalPercentage = results.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
    const totalScore = results.reduce((acc, r) => acc + (Number(r.score) || 0), 0);

    const stats: DtmDashboardStats = {
      totalOrganizations: orgs.length,
      totalStudents: students.length,
      totalQuestions: questions.length,
      activeQuestions,
      totalSubjects: subjects.length,
      totalAssignments: validAssignments.length,
      checkedResultsCount: results.length,
      averagePercentage: results.length > 0 ? Math.round((totalPercentage / results.length) * 10) / 10 : 0,
      averageScore: results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0,
    };

    return {
      stats,
      recentOrganizations: orgs.slice(0, 6),
      recentAssignments: assignments.slice(0, 8),
    };
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    throw new DtmServiceError(formatDtmError(err, "Dashboard ma'lumotlarini yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}

export async function getDtmOrgDashboardData(organizationId: string): Promise<{
  organization: DtmOrganization | null;
  studentCount: number;
  assignmentCount: number;
  checkedResultsCount: number;
  averagePercentage: number;
  averageScore: number;
  recentAssignments: DtmAssignment[];
  recentResults: DtmResult[];
}> {
  try {
    const [organization, students, assignments, results] = await Promise.all([
      getDtmOrganizationById(organizationId),
      listDtmStudentsByOrg(organizationId),
      listDtmAssignments(organizationId),
      listDtmResults(organizationId),
    ]);

    const validAssignments = assignments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'SUPERSEDED');
    const totalPercentage = results.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
    const totalScore = results.reduce((acc, r) => acc + (Number(r.score) || 0), 0);

    return {
      organization,
      studentCount: students.length,
      assignmentCount: validAssignments.length,
      checkedResultsCount: results.length,
      averagePercentage: results.length > 0 ? Math.round((totalPercentage / results.length) * 10) / 10 : 0,
      averageScore: results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0,
      recentAssignments: assignments.slice(0, 6),
      recentResults: results.slice(0, 6),
    };
  } catch (err) {
    if (err instanceof DtmServiceError) throw err;
    throw new DtmServiceError(formatDtmError(err, "Tashkilot dashboard ma'lumotlarini yuklashda xatolik"), 'FIRESTORE_ERROR');
  }
}
