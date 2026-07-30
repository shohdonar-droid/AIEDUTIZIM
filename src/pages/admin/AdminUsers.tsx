import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import safeOnSnapshot from "../../lib/safeSnapshot";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import { UserProfile, Department, Group, Faculty } from "../../types";
import {
  Search,
  Download,
  Trash2,
  Key,
  Filter,
  Edit,
  Plus,
  Users,
  LayoutDashboard,
  Loader2,
  Save,
  X,
} from "lucide-react";
import firebaseConfig from "../../../firebase-applet-config.json";
import * as XLSX from "xlsx";
import { useAuth } from "../../hooks/useAuth";
import { logSystemAction } from "../../lib/logUtils";
import { getNextSequentialId } from "../../lib/idUtils";
import { generatePassword } from "../../lib/helpers";

export default function AdminUsers() {
  const { user } = useAuth();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [independentTeachers, setIndependentTeachers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [subadmins, setSubadmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "students" | "teachers" | "staff" | "subadmins" | "botUsers"
  >("teachers");

  useEffect(() => {
    if (tab === 'students') setActiveTab('students');
    else if (tab === 'organizations') setActiveTab('teachers');
    else if (tab === 'staff') setActiveTab('staff');
    else if (tab === 'admins') setActiveTab('subadmins');
    else if (tab === 'botUsers') setActiveTab('botUsers');
  }, [tab]);

  const handleTabChange = (newTab: "students" | "teachers" | "staff" | "subadmins" | "botUsers") => {
    setActiveTab(newTab);
    const path = newTab === 'teachers' ? 'organizations' : (newTab === 'subadmins' ? 'admins' : newTab);
    navigate(`/admin/users/${path}`);
  };

  const [telegramUsers, setTelegramUsers] = useState<any[]>([]);
  const [allBotUsersConfigs, setAllBotUsersConfigs] = useState<any[]>([]);

  // Sub-admin Creation
  const [editingSubadmin, setEditingSubadmin] =
    useState<Partial<UserProfile> | null>(null);
  const [subadminSaving, setSubadminSaving] = useState(false);

  // Student Creation
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    displayName: "",
    phone: "",
    teacherId: "",
    facultyId: "",
    departmentId: "",
    groupId: "",
  });
  const [studentCreating, setStudentCreating] = useState(false);

  // Teacher Creation/Edit
  const [editingTeacher, setEditingTeacher] =
    useState<Partial<UserProfile> | null>(null);
  const [teacherSaving, setTeacherSaving] = useState(false);

  // Student Edit
  const [editingStudent, setEditingStudent] =
    useState<Partial<UserProfile> | null>(null);
  const [studentSaving, setStudentSaving] = useState(false);

  // Independent Teacher Creation/Edit
  const [editingMustaqilTeacher, setEditingMustaqilTeacher] = useState<Partial<UserProfile> | null>(null);
  const [mustaqilTeacherSaving, setMustaqilTeacherSaving] = useState(false);
  const [showLimitPricesModal, setShowLimitPricesModal] = useState(false);

  // Student Password Reset Modal State
  const [resetPasswordState, setResetPasswordState] = useState<{
    uid: string;
    displayName: string;
    mode: "choose" | "manual";
    manualPassword?: string;
  } | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  // Staff Creation
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    displayName: "",
    phone: "",
    login: "",
    password: "",
    teacherId: "",
  });
  const [staffCreating, setStaffCreating] = useState(false);

  // Specific one-time cleanup requested by user for "ortiqov" and "zulqaynar"
  useEffect(() => {
    const runCleanup = async () => {
      // ONLY run cleanup if the logged in user is the super admin
      if (user?.email !== 'shohdonar@gmail.com') return;

      const key = "cleanup_ortiqov_zulqaynar_v1";
      if (!localStorage.getItem(key)) {
        const loginsToDelete = ["ortiqov", "zulqaynar"];
        try {
          for (const login of loginsToDelete) {
            const q = query(
              collection(db, "users"),
              where("login", "==", login),
              where("role", "==", "teacher"),
            );
            const snap = await getDocs(q);
            if (snap.empty) continue;

            const orgDoc = snap.docs[0];
            const orgUid = orgDoc.id;

            // Delete students
            const sQ = query(
              collection(db, "users"),
              where("teacherId", "==", orgUid),
              where("role", "==", "student"),
            );
            const sSnap = await getDocs(sQ);
            for (const s of sSnap.docs) {
              await deleteDoc(doc(db, "users", s.id));
              // delete student enrollments
              const eQ = query(
                collection(db, "enrollments"),
                where("userId", "==", s.id),
              );
              const eSnap = await getDocs(eQ);
              for (const d of eSnap.docs)
                await deleteDoc(doc(db, "enrollments", d.id));
            }

            // Delete staff
            const stQ = query(
              collection(db, "users"),
              where("teacherId", "==", orgUid),
              where("role", "==", "staff"),
            );
            const stSnap = await getDocs(stQ);
            for (const st of stSnap.docs)
              await deleteDoc(doc(db, "users", st.id));

            // Delete courses and their tests
            const cQ = query(
              collection(db, "courses"),
              where("teacherId", "==", orgUid),
            );
            const cSnap = await getDocs(cQ);
            for (const c of cSnap.docs) {
              const tQ = query(
                collection(db, "tests"),
                where("courseId", "==", c.id),
              );
              const tSnap = await getDocs(tQ);
              for (const t of tSnap.docs) await deleteDoc(doc(db, "tests", t.id));
              await deleteDoc(doc(db, "courses", c.id));
            }

            // Delete other related entities
            const dQ = query(
              collection(db, "departments"),
              where("creatorId", "==", orgUid),
            );
            const dSnap = await getDocs(dQ);
            for (const d of dSnap.docs)
              await deleteDoc(doc(db, "departments", d.id));

            const gQ = query(
              collection(db, "groups"),
              where("creatorId", "==", orgUid),
            );
            const gSnap = await getDocs(gQ);
            for (const g of gSnap.docs) await deleteDoc(doc(db, "groups", g.id));

            const bQ = query(
              collection(db, "billing"),
              where("teacherId", "==", orgUid),
            );
            const bSnap = await getDocs(bQ);
            for (const b of bSnap.docs) await deleteDoc(doc(db, "billing", b.id));

            // Delete the organization
            await deleteDoc(doc(db, "users", orgUid));
            console.log(`Deleted organization: ${login}`);
          }
          localStorage.setItem(key, "true");
        } catch (err) {
          console.error("Auto-cleanup error:", err);
        }
      }

      // Cleanup requested admins: admin@eduai.uz and admin1@admin.uz
      const keyAdmins = "cleanup_requested_admins_v1";
      if (!localStorage.getItem(keyAdmins)) {
        try {
          const emailsToDelete = ["admin@eduai.uz", "admin1@admin.uz"];
          for (const email of emailsToDelete) {
            const q = query(
              collection(db, "users"),
              where("email", "==", email)
            );
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await deleteDoc(doc(db, "users", d.id));
              console.log(`Deleted admin by email: ${email}`);
            }
          }
          localStorage.setItem(keyAdmins, "true");
        } catch (e) {
          console.error("Requested admin cleanup error:", e);
        }
      }

      try {
        // Cleanup old chatbot students
        const sQ = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("isAnonymousContact", "==", true),
        );
        const sSnap = await getDocs(sQ);
        for (const s of sSnap.docs) {
          await deleteDoc(doc(db, "users", s.id));
        }
      } catch (e) {}
    };
    runCleanup();
  }, []);

  const loadData = async (force = false) => {
    const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));
    
    // Only load if forced or if cache is stale (> 20 mins)
    const cachedTime = localStorage.getItem("admin_users_last_load_time");
    const CACHE_TTL = 20 * 60 * 1000;
    if (isSuperAdmin && !force && cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
      console.log("AdminUsers: Skip fetch, cache is fresh");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isSuperAdmin) {
        // Core metadata (always needed for context)
        const [deptsSnap, groupsSnap, facultiesSnap] = await Promise.all([
          getDocs(collection(db, "departments")),
          getDocs(collection(db, "groups")),
          getDocs(collection(db, "faculties")),
        ]);
        const depts = deptsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Department);
        const grps = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Group);
        const facs = facultiesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Faculty);
        setDepartments(depts);
        setGroups(grps);
        setFaculties(facs);

        // Data by role - Fetching with a safety limit to prevent quota drain
        // We load them sequentially or parallel but with LIMIT(300)
        const [studentsSnap, teachersSnap, independentTeachersSnap, staffSnap, subadminsSnap, tgSnap, botConfigsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "student"), limit(300))),
          getDocs(query(collection(db, "users"), where("role", "==", "teacher"), limit(300))),
          getDocs(query(collection(db, "users"), where("role", "==", "mustaqil_o_qituvchi"), limit(300))),
          getDocs(query(collection(db, "users"), where("role", "==", "staff"), limit(300))),
          getDocs(query(collection(db, "users"), where("role", "in", ["subadmin", "admin"]), limit(100))),
          getDocs(query(collection(db, "telegram_users"), limit(300))),
          getDocs(query(collection(db, "users"), where("isBotUser", "==", true), limit(100)))
        ]);

        const allUsers = [
          ...studentsSnap.docs,
          ...teachersSnap.docs,
          ...independentTeachersSnap.docs,
          ...staffSnap.docs,
          ...subadminsSnap.docs
        ];
        console.log("ALL_USER_IDS:", allUsers.map(d => {
          const data = d.data();
          return { id: d.id, displayName: data.displayName, login: data.login, systemId: data.systemId };
        }));

        const students = studentsSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .filter(u => !u.isBotUser && !u.fromTelegram && !u.displayName?.endsWith("(Telegram)"))
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));
        const teachersList = teachersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));
        const independentList = independentTeachersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));
        const staffList = staffSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));
        const subadminsList = subadminsSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => {
            // Sort by role first ('admin' before 'subadmin')
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            // Then sort by displayName
            return (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ");
          });
        const tgUsers = tgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const botConfigs = botConfigsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setUsers(students);
        setTeachers(teachersList);
        setIndependentTeachers(independentList);
        setStaffUsers(staffList);
        setSubadmins(subadminsList);
        setTelegramUsers(tgUsers);
        setAllBotUsersConfigs(botConfigs);

        // Save to cache
        localStorage.setItem("admin_users_depts_cache", JSON.stringify(depts));
        localStorage.setItem("admin_users_groups_cache", JSON.stringify(grps));
        localStorage.setItem("admin_users_faculties_cache", JSON.stringify(facs));
        localStorage.setItem("admin_users_students_cache", JSON.stringify(students));
        localStorage.setItem("admin_users_teachers_cache", JSON.stringify(teachersList));
        localStorage.setItem("admin_users_independent_cache", JSON.stringify(independentList));
        localStorage.setItem("admin_users_staff_cache", JSON.stringify(staffList));
        localStorage.setItem("admin_users_subadmins_cache", JSON.stringify(subadminsList));
        localStorage.setItem("admin_users_last_load_time", Date.now().toString());
      } else {
        // Teacher/Staff of organization fetch (filtered to single organization)
        const orgUid = user?.role === 'teacher' ? user?.uid : (user?.teacherId || '');
        const [deptsSnap, groupsSnap, studentsSnap, staffSnap, facultiesSnap] = await Promise.all([
          getDocs(collection(db, "departments")),
          getDocs(collection(db, "groups")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"), where("teacherId", "==", orgUid))),
          getDocs(query(collection(db, "users"), where("role", "==", "staff"), where("teacherId", "==", orgUid))),
          getDocs(query(collection(db, "faculties"), where("teacherId", "==", orgUid)))
        ]);

        const facs = facultiesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Faculty);
        const facsIds = facs.map(f => f.id);
        const allDepts = deptsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Department);
        const depts = allDepts.filter(d => facsIds.includes(d.facultyId));
        const deptsIds = depts.map(d => d.id);
        const allGrps = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Group);
        const grps = allGrps.filter(g => deptsIds.includes(g.departmentId));

        const students = studentsSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));
        const staffList = staffSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
          .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ"));

        setDepartments(depts);
        setGroups(grps);
        setFaculties(facs);
        setUsers(students);
        setStaffUsers(staffList);
      }

    } catch (err: any) {
      if (!err?.message?.includes("quota")) {
        handleFirestoreError(err, OperationType.LIST, "admin-users-all");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));
    if (isSuperAdmin) {
      // Load from cache first for instant UI
      const cacheKeys = ["depts", "groups", "faculties", "students", "teachers", "independent", "staff", "subadmins"];
      cacheKeys.forEach((k) => {
        const cached = localStorage.getItem(`admin_users_${k}_cache`);
        if (cached) {
          const data = JSON.parse(cached);
          if (k === "depts") setDepartments(data);
          else if (k === "groups") setGroups(data);
          else if (k === "faculties") setFaculties(data);
          else if (k === "students") setUsers(data);
          else if (k === "teachers") setTeachers(data);
          else if (k === "independent") setIndependentTeachers(data);
          else if (k === "staff") setStaffUsers(data);
          else if (k === "subadmins") setSubadmins(data);
        }
      });
    }

    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));
    const orgUid = user?.role === 'teacher' ? user?.uid : (user?.teacherId || '');
    if (user && !isSuperAdmin) {
      setNewStudent((prev) => ({ ...prev, teacherId: orgUid }));
      setNewStaff((prev) => ({ ...prev, teacherId: orgUid }));
    }
  }, [user]);

  const resetPassword = async (uid: string) => {
    const targetUser = users.find(usr => usr.uid === uid);
    if (targetUser) {
      setResetPasswordState({
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        mode: "choose",
        manualPassword: ""
      });
    }
  };

  const saveMustaqilTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMustaqilTeacher?.displayName || !editingMustaqilTeacher?.password) {
      alert("Ism va parolni to'ldiring.");
      return;
    }
    setMustaqilTeacherSaving(true);
    try {
      if (editingMustaqilTeacher.uid) {
        // Updating existing mustaqil_o_qituvchi
        const cleanLogin = editingMustaqilTeacher.login?.trim() || await getNextSequentialId('mustaqil_o_qituvchi');
        const pass = editingMustaqilTeacher.password?.trim() || generatePassword();
        await setDoc(doc(db, "users", editingMustaqilTeacher.uid), {
          displayName: editingMustaqilTeacher.displayName,
          phone: editingMustaqilTeacher.phone || "",
          login: cleanLogin,
          password: pass,
          customLimitPrices: editingMustaqilTeacher.customLimitPrices || {},
        }, { merge: true });
        alert("Mustaqil o'qituvchi ma'lumotlari muvaffaqiyatli saqlandi!");
      } else {
        // Creating new mustaqil_o_qituvchi
        const cleanLogin = editingMustaqilTeacher.login?.trim() || await getNextSequentialId('mustaqil_o_qituvchi');
        const pass = editingMustaqilTeacher.password?.trim() || generatePassword();
        const q = query(
          collection(db, "users"),
          where("login", "==", cleanLogin),
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          alert("Login band!");
          setMustaqilTeacherSaving(false);
          return;
        }

        // Get UY Home organization Id as teacherId
        let uyOrgId = "";
        const qUy = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
        const uySnap = await getDocs(qUy);
        if (!uySnap.empty) {
          uyOrgId = uySnap.docs[0].id;
        } else {
          const uyRef = await addDoc(collection(db, 'users'), {
            displayName: 'UY',
            role: 'teacher',
            status: 'active',
            createdAt: serverTimestamp(),
            limit_departments: 9999,
            limit_groups: 9999,
            limit_students: 9999,
            limit_subjects: 9999,
            limit_tests: 9999,
            limit_quizizz: 9999,
            limit_exams: 9999,
            limit_certificates: 9999
          });
          uyOrgId = uyRef.id;
        }

        const email = `${cleanLogin.toLowerCase()}@teacher.uz`;
        
        // Create Firebase Auth user
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: pass,
              returnSecureToken: false,
            }),
          },
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || "Yaratishda xatolik");
        }
        const data = await response.json();
        const uid = data.localId;

        const defaultLimits = {
          limit_departments: 1,
          limit_groups: 1,
          limit_students: 5,
          limit_subjects: 2,
          limit_tests: 2,
          limit_quizizz: 1,
          limit_exams: 1,
          limit_courses: 0,
          limit_certificates: 5,
          limit_tests_per_subject: 10,
          limit_questions_per_test: 10,
          limit_questions_per_quizizz: 5,
          limit_questions_per_exam: 10,
        };

        await setDoc(doc(db, "users", uid), {
          uid: uid,
          displayName: editingMustaqilTeacher.displayName,
          phone: editingMustaqilTeacher.phone || "",
          login: cleanLogin,
          systemId: cleanLogin,
          password: pass,
          role: "mustaqil_o_qituvchi",
          teacherId: uyOrgId,
          email: email,
          status: 'active',
          total_spent: 0,
          customLimitPrices: editingMustaqilTeacher.customLimitPrices || {},
          createdAt: serverTimestamp(),
          ...defaultLimits
        });
        alert("Mustaqil o'qituvchi muvaffaqiyatli yaratildi!");
      }
      setEditingMustaqilTeacher(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMustaqilTeacherSaving(false);
    }
  };

  const deleteSingleUser = async (uid: string, silent = false) => {
    if (!uid) {
      if (!silent) alert("Foydalanuvchi ID topilmadi");
      return;
    }

    if (
      !silent &&
      !confirm(
        "Haqiqatan ham o'chirmoqchimisiz? Foydalanuvchi profiliga kirish bloklanadi va ID qayta ishlatilmaydi!",
      )
    )
      return;
      
    try {
      // 1. Soft delete user document
      const targetUser = users.find(u => u.uid === uid);
      await updateDoc(doc(db, "users", uid), { status: "deleted" });
      await logSystemAction(
        `Foydalanuvchi bloklandi (o'chirildi): ${targetUser?.displayName || uid}`,
        "Foydalanuvchilar",
        user?.displayName || "Admin",
        user?.role || "Admin"
      );
      
      // 2. Cleanup related data (enrollments, testResults) - This part remains to keep DB clean
      try {
        const eQ = query(collection(db, "enrollments"), where("userId", "==", uid));
        const eSnap = await getDocs(eQ);
        await Promise.all(eSnap.docs.map(d => deleteDoc(doc(db, "enrollments", d.id))));
      } catch (err) {
        console.warn("Error cleaning up enrollments:", err);
      }

      try {
        const rQ = query(collection(db, "testResults"), where("userId", "==", uid));
        const rSnap = await getDocs(rQ);
        await Promise.all(rSnap.docs.map(d => deleteDoc(doc(db, "testResults", d.id))));
      } catch (err) {
        console.warn("Error cleaning up testResults:", err);
      }

      if (!silent) {
        alert("Foydalanuvchi muvaffaqiyatli bloklandi!");
        loadData(true); // Refresh UI
      }
    } catch (error: any) {
      console.error("Block user error:", error);
      if (!silent) alert("Bloklashda xatolik yuz berdi: " + (error?.message || error));
    }
  };

  const saveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTeacher?.displayName ||
      !editingTeacher?.password
    ) {
      alert("Nomi va parolni to'ldiring.");
      return;
    }
    setTeacherSaving(true);
    try {
      const cleanLogin = editingTeacher.login?.trim() || await getNextSequentialId('teacher');
      const pass = editingTeacher.password?.trim() || generatePassword();
      if (editingTeacher.uid) {
        await setDoc(doc(db, "users", editingTeacher.uid), {
          displayName: editingTeacher.displayName,
          phone: editingTeacher.phone || "",
          login: cleanLogin,
          password: pass,
          ball: Number(editingTeacher.ball) || 0,
          aiTestLimit: Number(editingTeacher.aiTestLimit) || 999999,
          assignedTariff: editingTeacher.assignedTariff || "START",
          tariffPrice: Number(editingTeacher.tariffPrice) || 0,
        }, { merge: true });
      } else {
        const q = query(
          collection(db, "users"),
          where("login", "==", cleanLogin),
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          alert("Login band!");
          setTeacherSaving(false);
          return;
        }

        const email = `${cleanLogin.toLowerCase()}@teacher.uz`;
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: pass,
              returnSecureToken: false,
            }),
          },
        );
        if (!response.ok) throw new Error("Yaratishda xatolik");
        const data = await response.json();
        const uid = data.localId;

        await setDoc(doc(db, "users", uid), {
          uid: uid,
          displayName: editingTeacher.displayName,
          phone: editingTeacher.phone || "",
          login: cleanLogin,
          systemId: cleanLogin,
          password: pass,
          ball: Number(editingTeacher.ball) || 0,
          role: "teacher",
          email: email,
          assignedTariff: editingTeacher.assignedTariff || "START",
          tariffPrice: Number(editingTeacher.tariffPrice) || 0,
          createdAt: serverTimestamp(),
        });
      }
      setEditingTeacher(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTeacherSaving(false);
    }
  };

  const saveSubadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingSubadmin?.displayName ||
      !editingSubadmin?.login ||
      !editingSubadmin?.password
    ) {
      alert("Barcha maydonlarni to'ldiring.");
      return;
    }
    setSubadminSaving(true);
    try {
      if (editingSubadmin.uid) {
        const email = `${editingSubadmin.login.trim().toLowerCase()}@subadmin.uz`;
        await setDoc(doc(db, "users", editingSubadmin.uid), {
          displayName: editingSubadmin.displayName,
          phone: editingSubadmin.phone || "",
          login: editingSubadmin.login.trim(),
          email: email,
          password: editingSubadmin.password,
        }, { merge: true });
      } else {
        const q = query(
          collection(db, "users"),
          where("login", "==", editingSubadmin.login.trim()),
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          alert("Login band!");
          setSubadminSaving(false);
          return;
        }

        const email = `${editingSubadmin.login.trim().toLowerCase()}@subadmin.uz`;
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: editingSubadmin.password,
              returnSecureToken: false,
            }),
          },
        );
        if (!response.ok) throw new Error("Yaratishda xatolik");
        const data = await response.json();
        const uid = data.localId;

        await setDoc(doc(db, "users", uid), {
          uid: uid,
          displayName: editingSubadmin.displayName,
          phone: editingSubadmin.phone || "",
          login: editingSubadmin.login.trim(),
          password: editingSubadmin.password,
          role: "subadmin",
          email: email,
          createdAt: serverTimestamp(),
        });
      }
      setEditingSubadmin(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubadminSaving(false);
    }
  };

  const impersonateTeacher = (uid: string) => {
    localStorage.setItem("impersonateUserId", uid);
    window.location.href = "/teacher";
  };

  const createStudentAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));
    const orgUid = user?.role === 'teacher' ? user?.uid : (user?.teacherId || '');
    const targetTeacherId = isSuperAdmin ? newStudent.teacherId : orgUid;

    if (
      !newStudent.displayName ||
      !targetTeacherId ||
      !newStudent.facultyId ||
      !newStudent.departmentId ||
      !newStudent.groupId
    ) {
      alert("To'ldiring.");
      return;
    }
    setStudentCreating(true);
    try {
      const org = isSuperAdmin ? teachers.find((t) => t.uid === targetTeacherId) : user;
      const orgName = org?.displayName || "";
      const login = await getNextSequentialId("student");
      const email = `${login}@student.uz`;
      const pass = generatePassword();
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: pass,
            returnSecureToken: false,
          }),
        },
      );
      if (!res.ok) throw new Error("Xato");
      const d = await res.json();
      await setDoc(doc(db, "users", d.localId), {
        uid: d.localId,
        displayName: newStudent.displayName,
        phone: newStudent.phone,
        login: login,
        systemId: login,
        password: pass,
        email: email,
        role: "student",
        teacherId: targetTeacherId,
        teacherName: orgName,
        facultyId: newStudent.facultyId,
        facultyName: faculties.find((f) => f.id === newStudent.facultyId)?.name || "",
        departmentId: newStudent.departmentId,
        departmentName: departments.find(
          (dep) => dep.id === newStudent.departmentId,
        )?.name,
        groupId: newStudent.groupId,
        groupName: groups.find((g) => g.id === newStudent.groupId)?.name,
        createdAt: serverTimestamp(),
      });
      setShowStudentModal(false);
      loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStudentCreating(false);
    }
  };

  const createStaffAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));
    const orgUid = user?.role === 'teacher' ? user?.uid : (user?.teacherId || '');
    const targetTeacherId = isSuperAdmin ? newStaff.teacherId : orgUid;

    if (
      !newStaff.displayName ||
      !targetTeacherId ||
      !newStaff.password
    ) {
      alert("Majburiy maydonlarni to'ldiring");
      return;
    }

    setStaffCreating(true);
    try {
      const staffLogin = newStaff.login.trim() || await getNextSequentialId("staff");
      const gEmail = `${staffLogin}@teacher.uz`;
      const pass = newStaff.password.trim() || generatePassword();
      const signupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: gEmail,
            password: pass,
            returnSecureToken: false,
          }),
        },
      );

      const d = await signupRes.json();
      if (!signupRes.ok) throw new Error(d.error.message || "Xato yuz berdi");

      const org = isSuperAdmin ? teachers.find((t) => t.uid === targetTeacherId) : user;
      const orgName = org?.displayName || "";

      await setDoc(doc(db, "users", d.localId), {
        uid: d.localId,
        displayName: newStaff.displayName,
        login: staffLogin,
        systemId: staffLogin,
        password: pass,
        phone: newStaff.phone,
        email: gEmail,
        role: "staff",
        teacherId: targetTeacherId,
        teacherName: orgName,
        createdAt: serverTimestamp(),
        spentBalls: 0,
      });

      setShowStaffModal(false);
      setNewStaff({
        displayName: "",
        phone: "",
        login: "",
        password: "",
        teacherId: "",
      });
      alert("Xodim muvaffaqiyatli yaratildi!");
      loadData(true);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setStaffCreating(false);
    }
  };

  const exportToCSV = () => {
    if (filteredUsers.length === 0) {
      alert("Yuklash uchun talabalar mavjud emas.");
      return;
    }
    const dataToExport = filteredUsers.map((u, i) => {
      const org = teachers.find((t) => t.uid === u.teacherId);
      return {
        "№": i + 1,
        "F.I.SH (Talaba)": u.displayName || "-",
        Tashkilot: org?.displayName || u.teacherName || "-",
        Telefon: u.phone || "-",
        "E-pochta": u.email || "-",
        "Yo'nalish": u.departmentName || "-",
        Guruh: u.groupName || "-",
        Login: u.login || "-",
        Parol: u.password || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Talabalar");
    XLSX.writeFile(workbook, "Talabalar_Ro'yxati.xlsx");
  };

  const exportTeachersCSV = () => {
    if (filteredTeachers.length === 0) {
      alert("Yuklash uchun tashkilotlar mavjud emas.");
      return;
    }
    const dataToExport = filteredTeachers.map((t, i) => ({
      "№": i + 1,
      "Tashkilot nomi": t.displayName || "-",
      Telefon: t.phone || "-",
      "E-pochta": t.email || "-",
      Login: t.login || "-",
      Parol: t.password || "-",
      "Test Limiti": t.aiTestLimit || 999999,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tashkilotlar");
    XLSX.writeFile(workbook, "Tashkilotlar_Ro'yxati.xlsx");
  };

  const exportStaffXLSX = () => {
    if (filteredStaff.length === 0) {
      alert("Yuklash uchun xodimlar mavjud emas.");
      return;
    }
    const dataToExport = filteredStaff.map((s, i) => {
      const org = teachers.find((t) => t.uid === s.teacherId);
      return {
        "№": i + 1,
        "F.I.SH (Xodim)": s.displayName || "-",
        Tashkilot: org?.displayName || s.teacherName || "-",
        Telefon: s.phone || "-",
        "E-pochta": s.email || "-",
        Login: s.login || "-",
        Parol: s.password || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Xodimlar");
    XLSX.writeFile(workbook, "Xodimlar_Ro'yxati.xlsx");
  };

  const saveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.uid) return;
    setStudentSaving(true);
    try {
      const facultyObj = faculties.find((f) => f.id === editingStudent.facultyId);
      const facultyName = facultyObj?.name || "";
      const deptName =
        departments.find((d) => d.id === editingStudent.departmentId)?.name ||
        "";
      const grpName =
        groups.find((g) => g.id === editingStudent.groupId)?.name || "";
      await setDoc(doc(db, "users", editingStudent.uid), {
        facultyId: editingStudent.facultyId || "",
        facultyName: facultyName,
        departmentId: editingStudent.departmentId || "",
        departmentName: deptName,
        groupId: editingStudent.groupId || "",
        groupName: grpName,
      }, { merge: true });
      setEditingStudent(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStudentSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = !filterOrg || u.teacherId === filterOrg;
    const matchesDept = !filterDept || u.departmentId === filterDept;
    const matchesGrp = !filterGrp || u.groupId === filterGrp;
    return matchesSearch && matchesOrg && matchesDept && matchesGrp;
  });
  const filteredTeachers = teachers.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredIndependentTeachers = independentTeachers.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredStaff = staffUsers.filter((u) => {
    const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = !filterOrg || u.teacherId === filterOrg;
    return matchesSearch && matchesOrg;
  });
  const filteredSubadmins = subadmins.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const availableGroups = groups.filter((g) => {
    const matchesDept = !filterDept || g.departmentId === filterDept;
    const matchesOrg = !filterOrg || (() => {
      const dept = departments.find((d) => d.id === g.departmentId);
      if (!dept) return false;
      const fac = faculties.find((f) => f.id === dept.facultyId);
      return fac?.teacherId === filterOrg;
    })();
    return matchesDept && matchesOrg;
  });

  const isSuperAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));

  if (loading)
    return (
      <div className="p-10 flex items-center gap-2">
        <Loader2 className="animate-spin" /> Yuklanmoqda...
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {isSuperAdmin ? (
          <>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                Foydalanuvchilar
              </h1>
              <p className="text-gray-500 mt-2 text-lg">
                Tashkilotlar va Talabalar boshqaruvi.
              </p>
            </div>
            <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm overflow-x-auto max-w-full">
              <button
                onClick={() => handleTabChange("teachers")}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "teachers" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
              >
                Tashkilotlar ({teachers.length})
              </button>
              <button
                onClick={() => handleTabChange("staff")}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "staff" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
              >
                Xodimlar ({staffUsers.length})
              </button>
              <button
                onClick={() => handleTabChange("students")}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "students" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
              >
                Talabalar ({users.length})
              </button>
              <button
                onClick={() => handleTabChange("subadmins")}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "subadmins" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
              >
                Adminlar ({subadmins.length})
              </button>
              <button
                onClick={() => handleTabChange("botUsers")}
                className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "botUsers" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
              >
                Bot foydalanuvchilari ({telegramUsers.length})
              </button>
            </div>
          </>
        ) : (
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              {activeTab === "staff" ? "Xodimlar boshqaruvi" : "Talabalar boshqaruvi"}
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              {activeTab === "staff" ? "O'zingizga tegishli xodimlar ro'yxati va boshqaruvi." : "O'zingizning talabalaringiz ro'yxati va boshqaruvi."}
            </p>
          </div>
        )}
      </header>

      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">
                Yangi Talaba Yaratish
              </h2>
              <button
                onClick={() => setShowStudentModal(false)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X />
              </button>
            </div>
            <form onSubmit={createStudentAdmin} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  F.I.SH (To'liq ism)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="Ism Familiya Sharif"
                  value={newStudent.displayName}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      displayName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  Telefon raqam
                </label>
                <input
                  type="tel"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="+998 90 123 45 67"
                  value={newStudent.phone}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, phone: e.target.value })
                  }
                />
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                    Tashkilotni tanlang
                  </label>
                  <select
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    value={newStudent.teacherId}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        teacherId: e.target.value,
                        facultyId: "",
                        departmentId: "",
                        groupId: "",
                      })
                    }
                  >
                    <option value="">Tanlang</option>
                    {teachers.map((t, idx) => (
                      <option key={`${t.uid || "teacher"}_${idx}`} value={t.uid}>
                        {t.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                    Fakultet
                  </label>
                  <select
                    required
                    disabled={!newStudent.teacherId}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium disabled:opacity-50"
                    value={newStudent.facultyId}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        facultyId: e.target.value,
                        departmentId: "",
                        groupId: "",
                      })
                    }
                  >
                    <option value="">Tanlang</option>
                    {faculties
                      .filter((f) => f.teacherId === newStudent.teacherId)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                    Yo'nalish
                  </label>
                  <select
                    required
                    disabled={!newStudent.facultyId}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium disabled:opacity-50"
                    value={newStudent.departmentId}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        departmentId: e.target.value,
                        groupId: "",
                      })
                    }
                  >
                    <option value="">Tanlang</option>
                    {departments
                      .filter((d) => d.facultyId === newStudent.facultyId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  Guruh
                </label>
                <select
                  required
                  disabled={!newStudent.departmentId}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium disabled:opacity-50"
                  value={newStudent.groupId}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, groupId: e.target.value })
                  }
                >
                  <option value="">Tanlang</option>
                  {groups
                    .filter((g) => g.departmentId === newStudent.departmentId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200"
                >
                  BEKOR QILISH
                </button>
                <button
                  type="submit"
                  disabled={studentCreating}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {studentCreating ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}{" "}
                  SAQLASH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">
                Yangi Xodim Yaratish
              </h2>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X />
              </button>
            </div>
            <form onSubmit={createStaffAdmin} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  FISH (To'liq ism)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="Ism Familiya Sharif"
                  value={newStaff.displayName}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, displayName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  Telefon raqam
                </label>
                <input
                  type="tel"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="+998"
                  value={newStaff.phone}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase ml-1">
                  Tashkilot
                </label>
                <select
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  value={newStaff.teacherId}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, teacherId: e.target.value })
                  }
                >
                  <option value="">Tanlang</option>
                  {teachers.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Manual login and password inputs removed as per request - now automatically generated */}
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={staffCreating}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {staffCreating ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  SAQLASH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "teachers" && (
        <div className="space-y-6">
          {editingTeacher ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl max-w-3xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  {editingTeacher.uid
                    ? "Tashkilotni tahrirlash"
                    : "Yangi tashkilot"}
                </h2>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg"
                >
                  <X />
                </button>
              </div>
              <form
                onSubmit={saveTeacher}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Tashkilot nomi
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={editingTeacher.displayName || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Tel raqam
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={editingTeacher.phone || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                {/* Login removed for auto-generation */}
                {/* Password removed for auto-generation */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Test generatsiyasi limiti
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={editingTeacher.aiTestLimit || 999999}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        aiTestLimit: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Tarif rejimi
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                    value={editingTeacher.assignedTariff || "START"}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        assignedTariff: e.target.value,
                      })
                    }
                  >
                    <option value="START">START</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="CORPORATE">CORPORATE</option>
                    <option value="EXTRA">EXTRA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Oylik to'lov summasi (so'mda)
                  </label>
                  <input
                    type="number"
                    placeholder="Masalan: 150000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-blue-600"
                    value={editingTeacher.tariffPrice || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        tariffPrice: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={teacherSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {teacherSaving ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}{" "}
                    SAQLASH
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="relative w-full md:w-96 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 placeholder:text-gray-400"
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={exportTeachersCSV}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
                >
                  <Download className="w-5 h-5" /> YUKLAB OLISH
                </button>
                <button
                  onClick={() =>
                    setEditingTeacher({
                      displayName: "",
                      login: "",
                      password: "",
                      phone: "",
                      ball: 0,
                    })
                  }
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  <Plus className="w-5 h-5" /> YANGI TASHKILOT
                </button>
              </div>
            </div>
          )}

          {!editingTeacher && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      №
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      Tashkilot nomi
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      Tel raqam
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      Login
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                      Parol
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTeachers.map((t, i) => (
                    <tr
                      key={`${t.uid || "teacher"}_${i}`}
                      className="hover:bg-gray-50/30 group transition"
                    >
                      <td className="px-6 py-4 font-bold text-gray-400">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">
                        {t.systemId || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => impersonateTeacher(t.uid)}
                          className="font-black text-blue-600 hover:underline inline-flex items-center gap-1"
                          title="Teacher profiliga kirish"
                        >
                          <LayoutDashboard className="w-4 h-4" />{" "}
                          {t.displayName}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">
                        {t.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-500">
                        {t.login || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-400">
                        {t.password || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingTeacher(t)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSingleUser(t.uid)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!editingTeacher && (
            <div className="mt-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Hamkor Mustaqil o'qituvchilar
                </h3>
                <button
                  onClick={() =>
                    setEditingMustaqilTeacher({
                      displayName: "",
                      login: "",
                      password: "",
                      phone: "",
                    })
                  }
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all text-xs uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> Mustaqil o'qituvchi qo'shish
                </button>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        №
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        F.I.SH (O'qituvchi)
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        Tel raqam
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        Login
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">
                        Parol
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase">
                        Amallar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredIndependentTeachers.map((t, i) => (
                      <tr
                        key={`${t.uid || "ind_teacher"}_${i}`}
                        className="hover:bg-gray-50/30 group transition"
                      >
                        <td className="px-6 py-4 font-bold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {t.systemId || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => impersonateTeacher(t.uid)}
                            className="font-black text-indigo-600 hover:underline inline-flex items-center gap-1"
                            title="O'qituvchi profiliga kirish"
                          >
                            <LayoutDashboard className="w-4 h-4" />{" "}
                            {t.displayName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {t.phone || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-500">
                          {t.login || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                          {t.password || "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingMustaqilTeacher(t)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                              title="Tahrirlash"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSingleUser(t.uid)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredIndependentTeachers.length === 0 && (
                  <div className="p-10 text-center text-gray-400 italic opacity-50">
                    Mustaqil o'qituvchilar topilmadi.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
              <div className="relative w-full md:w-80 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-600"
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {isSuperAdmin && (
                <select
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-blue-600 w-full md:w-auto outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Barcha tashkilotlar</option>
                  {teachers.map((t, idx) => (
                    <option key={`${t.uid || "teacher"}_${idx}`} value={t.uid}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={exportStaffXLSX}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                <Download className="w-5 h-5" /> YUKLAB OLISH
              </button>
              <button
                onClick={() => setShowStaffModal(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                <Plus className="w-5 h-5" /> XODIM YARATISH
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    №
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    ID
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    F.I.SH (Xodim)
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                      Tashkilot
                    </th>
                  )}
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    Tel/Email
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    Login
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    Parol
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.map((s, i) => (
                  <tr key={`${s.uid || "staff"}_${i}`} className="hover:bg-gray-50/30 group">
                    <td className="px-6 py-4 font-bold text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                      {s.systemId || "-"}
                    </td>
                    <td className="px-6 py-4 font-black uppercase text-sm">
                      {s.displayName}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight">
                          {s.teacherName ||
                            teachers.find((t) => t.uid === s.teacherId)
                              ?.displayName ||
                            "-"}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      <div>{s.phone || "-"}</div>
                      <div className="text-gray-400 mt-0.5">
                        {s.email || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600 bg-indigo-50/50 text-center">
                      {s.login || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400 text-center">
                      {s.password || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => deleteSingleUser(s.uid)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="p-20 text-center text-gray-400 font-bold italic opacity-30">
                Hech qanday xodim topilmadi.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-80 flex-shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-600"
                placeholder="Qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
              {isSuperAdmin && (
                <select
                  value={filterOrg}
                  onChange={(e) => {
                    setFilterOrg(e.target.value);
                    setFilterDept("");
                    setFilterGrp("");
                  }}
                  className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-blue-600 w-full md:w-auto outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Barcha tashkilotlar</option>
                  {teachers.map((t, idx) => (
                    <option key={`${t.uid || "teacher"}_${idx}`} value={t.uid}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterGrp("");
                }}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha yo'nalishlar</option>
                {departments
                  .filter((d) => {
                    if (!filterOrg) return true;
                    const faculty = faculties.find((f) => f.id === d.facultyId);
                    return faculty?.teacherId === filterOrg;
                  })
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
              <select
                value={filterGrp}
                onChange={(e) => setFilterGrp(e.target.value)}
                disabled={!filterDept}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha guruhlar</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={exportToCSV}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 whitespace-nowrap transition-all shadow-lg shadow-green-100"
              >
                <Download className="w-5 h-5" /> YUKLAB OLISH
              </button>
              <button
                onClick={() => {
                  const orgUid = user?.role === 'teacher' ? user?.uid : (user?.teacherId || '');
                  setNewStudent({
                    displayName: "",
                    phone: "",
                    teacherId: isSuperAdmin ? "" : orgUid,
                    facultyId: "",
                    departmentId: "",
                    groupId: "",
                  });
                  setShowStudentModal(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                <Plus className="w-5 h-5" /> TALABA YARATISH
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                      №
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                      ID
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase">
                        Tashkilot
                      </th>
                    )}
                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                      FISH (Talaba)
                    </th>
                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                      Tel raqami
                    </th>
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                      Yo'nalish
                    </th>
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                      Guruh
                    </th>
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                      Login
                    </th>
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                      Parol
                    </th>
                    <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u, i) => {
                    const org = teachers.find((t) => t.uid === u.teacherId);
                    return (
                      <tr key={`${u.uid || "user"}_${i}`} className="hover:bg-gray-50/30 group">
                        <td className="px-6 py-4 font-bold text-gray-400 whitespace-nowrap">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {u.systemId || "-"}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight">
                              {org?.displayName || "-"}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 font-black uppercase text-sm">
                          {u.displayName}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                          {u.phone || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 text-center uppercase">
                          {u.departmentName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-gray-500 text-center uppercase">
                          {u.groupName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-indigo-600 bg-indigo-50/50 text-center">
                          {u.login || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-400 text-center">
                          {u.password || "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingStudent(u)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm"
                              title="Tahrirlash"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => resetPassword(u.uid)}
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition shadow-sm"
                              title="Parolni tiklash"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSingleUser(u.uid)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-20 text-center text-gray-400 font-bold italic opacity-30">
                  Hech qanday talaba topilmadi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">
                Talabani tahrirlash
              </h2>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveStudentEdit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    FISH
                  </label>
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-gray-500 border border-gray-100">
                    {editingStudent.displayName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Fakultet
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                    value={editingStudent.facultyId || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        facultyId: e.target.value,
                        departmentId: "",
                        groupId: "",
                      })
                    }
                  >
                    <option value="">Tanlang...</option>
                    {faculties
                      .filter((f) => f.teacherId === editingStudent.teacherId)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Yo'nalish
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium disabled:opacity-50"
                    disabled={!editingStudent.facultyId}
                    value={editingStudent.departmentId || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        departmentId: e.target.value,
                        groupId: "",
                      })
                    }
                  >
                    <option value="">Tanlang...</option>
                    {departments
                      .filter((d) => d.facultyId === editingStudent.facultyId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Guruh
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium disabled:opacity-50"
                    value={editingStudent.groupId || ""}
                    disabled={!editingStudent.departmentId}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        groupId: e.target.value,
                      })
                    }
                  >
                    <option value="">Tanlang...</option>
                    {groups
                      .filter((g) => g.departmentId === editingStudent.departmentId)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={studentSaving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {studentSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  SAQLASH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMustaqilTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">
                {editingMustaqilTeacher.uid ? "Mustaqil o'qituvchini tahrirlash" : "Yangi mustaqil o'qituvchi"}
              </h2>
              <button
                onClick={() => setEditingMustaqilTeacher(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveMustaqilTeacher} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    FISh (O'qituvchi)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="F.I.SH kiriting"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                    value={editingMustaqilTeacher.displayName || ""}
                    onChange={(e) =>
                      setEditingMustaqilTeacher({
                        ...editingMustaqilTeacher,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    placeholder="+998"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                    value={editingMustaqilTeacher.phone || ""}
                    onChange={(e) =>
                      setEditingMustaqilTeacher({
                        ...editingMustaqilTeacher,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                {/* Login and password removed for auto-generation */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLimitPricesModal(true)}
                    className="w-full py-3 px-4 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    ⚙️ Maxsus limit narxlari (Arzonroq narx belgilash)
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingMustaqilTeacher(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={mustaqilTeacherSaving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {mustaqilTeacherSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  SAQLASH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLimitPricesModal && editingMustaqilTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900">Mustaqil o'qituvchi limit narxlari</h3>
                <p className="text-xs text-gray-500">{editingMustaqilTeacher.displayName} uchun maxsus narxlarni kiriting (bo'sh qoldirilsa standart narx ishlaydi)</p>
              </div>
              <button
                onClick={() => setShowLimitPricesModal(false)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {[
                { key: 'limit_departments', label: "Yo'nalishlar narxi" },
                { key: 'limit_groups', label: "Guruhlar narxi" },
                { key: 'limit_students', label: "Talabalar narxi" },
                { key: 'limit_subjects', label: "Mavzular narxi" },
                { key: 'limit_tests', label: "Testlar narxi" },
                { key: 'limit_quizizz', label: "Quizizz / Savollar narxi" },
                { key: 'limit_exams', label: "Imtihonlar narxi" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <label className="text-sm font-bold text-gray-700 flex-1">{item.label}</label>
                  <div className="flex items-center gap-2 w-40">
                    <input
                      type="number"
                      placeholder="Standart"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-sm"
                      value={editingMustaqilTeacher.customLimitPrices?.[item.key] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setEditingMustaqilTeacher({
                          ...editingMustaqilTeacher,
                          customLimitPrices: {
                            ...(editingMustaqilTeacher.customLimitPrices || {}),
                            [item.key]: val
                          }
                        });
                      }}
                    />
                    <span className="text-xs text-gray-400 font-medium shrink-0">so'm</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLimitPricesModal(false)}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">
                Parolni o'zgartirish
              </h2>
              <button
                onClick={() => setResetPasswordState(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm font-medium text-gray-600">
                Talaba: <span className="font-bold text-gray-950 uppercase">{resetPasswordState.displayName}</span>
              </p>

              {resetPasswordState.mode === "choose" ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setResetSaving(true);
                      try {
                        await setDoc(doc(db, "users", resetPasswordState.uid), {
                          password: "123456",
                        }, { merge: true });
                        alert("Parol muvaffaqiyatli '123456' ga o'zgartirildi!");
                        setResetPasswordState(null);
                        loadData();
                      } catch (error) {
                        console.error(error);
                        alert("Xatolik yuz berdi");
                      } finally {
                        setResetSaving(false);
                      }
                    }}
                    disabled={resetSaving}
                    className="w-full py-3 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Parol 123456 ga o'zgartirilsin
                  </button>
                  <button
                    onClick={() => {
                      setResetPasswordState({
                        ...resetPasswordState,
                        mode: "manual"
                      });
                    }}
                    className="w-full py-3 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold transition-colors"
                  >
                    Qo'lda kiritish
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">
                      YANGI PAROL
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                      placeholder="Yangi parolni kiriting"
                      value={resetPasswordState.manualPassword || ""}
                      onChange={(e) =>
                        setResetPasswordState({
                          ...resetPasswordState,
                          manualPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setResetPasswordState({
                          ...resetPasswordState,
                          mode: "choose"
                        });
                      }}
                      className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Orqaga
                    </button>
                    <button
                      onClick={async () => {
                        if (!resetPasswordState.manualPassword?.trim()) {
                          alert("Iltimos parolni kiriting!");
                          return;
                        }
                        setResetSaving(true);
                        try {
                          await setDoc(doc(db, "users", resetPasswordState.uid), {
                            password: resetPasswordState.manualPassword.trim(),
                          }, { merge: true });
                          alert(`Parol muvaffaqiyatli '${resetPasswordState.manualPassword.trim()}' ga o'zgartirildi!`);
                          setResetPasswordState(null);
                          loadData();
                        } catch (error) {
                          console.error(error);
                          alert("Xatolik yuz berdi");
                        } finally {
                          setResetSaving(false);
                        }
                      }}
                      disabled={resetSaving}
                      className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {resetSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Saqlash
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "subadmins" && (
        <div className="space-y-6">
          {editingSubadmin ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl max-w-3xl animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  {editingSubadmin.uid
                    ? "Adminni tahrirlash"
                    : "Yangi admin"}
                </h2>
                <button
                  onClick={() => setEditingSubadmin(null)}
                  className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg"
                >
                  <X />
                </button>
              </div>
              <form
                onSubmit={saveSubadmin}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    FISh (To'liq ism)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    placeholder="To'liq ismi"
                    value={editingSubadmin.displayName || ""}
                    onChange={(e) =>
                      setEditingSubadmin({
                        ...editingSubadmin,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    placeholder="+998"
                    value={editingSubadmin.phone || ""}
                    onChange={(e) =>
                      setEditingSubadmin({
                        ...editingSubadmin,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Login (Kirish u-n)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium disabled:opacity-55"
                    placeholder="Login kiriting"
                    value={editingSubadmin.login || ""}
                    onChange={(e) =>
                      setEditingSubadmin({
                        ...editingSubadmin,
                        login: e.target.value,
                      })
                    }
                    disabled={!!editingSubadmin.uid}
                  />
                  {editingSubadmin.uid && (
                    <p className="text-xs text-orange-500 mt-1">
                      Loginni o'zgartirib bo'lmaydi
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Parol
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                    placeholder="Kamida 6 xonali"
                    value={editingSubadmin.password || ""}
                    onChange={(e) =>
                      setEditingSubadmin({
                        ...editingSubadmin,
                        password: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={subadminSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {subadminSaving ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}{" "}
                    SAQLASH
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="relative w-full md:w-96 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 placeholder:text-gray-400 text-sm font-medium"
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() =>
                    setEditingSubadmin({
                      displayName: "",
                      login: "",
                      password: "",
                      phone: "",
                    })
                  }
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all text-xs uppercase tracking-wider"
                >
                  <Plus className="w-5 h-5" /> YANGI ADMIN
                </button>
              </div>
            </div>
          )}

          {!editingSubadmin && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      №
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                      Admin ismi
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                      Tel raqam
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                      Login
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                      Parol
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSubadmins.map((t, i) => (
                    <tr
                      key={`${t.uid || "subadmin"}_${i}`}
                      className="hover:bg-gray-50/30 group transition"
                    >
                      <td className="px-6 py-4 font-bold text-gray-400 whitespace-nowrap">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">
                        {t.login || "-"}
                      </td>
                      <td className="px-6 py-4 font-black text-sm uppercase text-gray-800">
                        <div className="flex flex-col">
                          <span>{t.displayName}</span>
                          <span className={`text-[10px] lowercase font-bold ${t.role === 'admin' ? 'text-red-500' : 'text-blue-500'}`}>
                            {t.role === 'admin' ? 'superadmin' : 'subadmin'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {t.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">
                        <span className="bg-blue-50 text-blue-700 px-2 rounded-md">
                          {t.login || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-400">
                        {t.password || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(t.role !== 'admin' || user?.login === 'Elyorbek' || user?.email === 'shohdonar@gmail.com' || user?.email === 'elyorbek@admin.uz') ? (
                            <>
                              <button
                                onClick={() => setEditingSubadmin(t)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSingleUser(t.uid)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter px-3 py-1 bg-gray-50 rounded-md">Himoyalangan</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubadmins.length === 0 && (
                <div className="p-16 text-center text-gray-400 font-bold italic opacity-40">
                  Hech qanday admin topilmadi. Yaratish tugmasi orqali
                  yangisini qo'shing.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "botUsers" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-80 flex-shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                    placeholder="Foydalanuvchini qidirish..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-xs text-gray-400 font-extrabold ml-auto">
                  Tizimda ulangan telegram bot a'zolari soni: {telegramUsers.length} ta
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-50">
                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                          №
                        </th>
                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Telegramdagi Ism-sharifi
                        </th>
                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Username
                        </th>
                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Telegram ID
                        </th>
                        <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                          Mavjud Balans (Ball)
                        </th>
                        <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                          Amallar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {telegramUsers
                        .filter(tu => {
                          const searchLower = searchTerm.toLowerCase();
                          const firstName = (tu.firstName || "").toLowerCase();
                          const lastName = (tu.lastName || "").toLowerCase();
                          const username = (tu.username || "").toLowerCase();
                          const idStr = String(tu.telegramId || tu.id || "").toLowerCase();
                          return firstName.includes(searchLower) || 
                                 lastName.includes(searchLower) || 
                                 username.includes(searchLower) || 
                                 idStr.includes(searchLower);
                        })
                        .map((tu, i) => {
                          const tgId = tu.telegramId || tu.id;
                          const matchedUser = allBotUsersConfigs.find(u => 
                            Number(u.telegramId) === Number(tgId) || 
                             String(u.telegramId) === String(tgId)
                          );
                          const currentBall = matchedUser ? (matchedUser.ball !== undefined ? matchedUser.ball : (matchedUser.balance || 0)) : 0;
                          return (
                            <tr key={`${tgId}_${i}`} className="hover:bg-gray-50/30 group transition">
                              <td className="px-6 py-4 font-bold text-gray-400 whitespace-nowrap">
                                {i + 1}
                              </td>
                              <td className="px-6 py-4 font-black text-sm uppercase text-gray-800">
                                {tu.firstName || ""} {tu.lastName || ""}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                                {tu.username ? `@${tu.username}` : "yo'q"}
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                {tgId}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-100 text-sm inline-flex items-center gap-1">
                                  💎 {currentBall} ball
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      const newBallStr = prompt("Yangi balans (ball) miqdorini kiriting:", String(currentBall));
                                      if (newBallStr === null) return;
                                      const newBall = Number(newBallStr.trim());
                                      if (isNaN(newBall)) {
                                        alert("Iltimos, to'g'ri son kiriting!");
                                        return;
                                      }
                                      try {
                                        if (matchedUser) {
                                          await setDoc(doc(db, "users", matchedUser.id), {
                                            ball: newBall,
                                            balance: newBall
                                          }, { merge: true });
                                        } else {
                                          await setDoc(doc(db, "users", `tg_${tgId}`), {
                                            telegramId: Number(tgId),
                                            uid: `tg_${tgId}`,
                                            displayName: `${tu.firstName || ""} ${tu.lastName || ""}`.trim() || "Telegram Foydalanuvchi",
                                            role: "bot_user",
                                            ball: newBall,
                                            balance: newBall,
                                            spentBalls: 0,
                                            isBotUser: true,
                                            isTelegramUser: true,
                                            createdAt: serverTimestamp()
                                          });
                                        }
                                        alert("Balans muvaffaqiyatli o'zgartirildi!");
                                      } catch (e) {
                                        console.error(e);
                                        alert("Balansni saqlashda xatolik yuz berdi");
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-sm cursor-pointer"
                                  >
                                    Balansni o'zgartirish
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm("Haqiqatan ham ushbu bot foydalanuvchisini o'chirmoqchimisiz?")) return;
                                      try {
                                        await deleteDoc(doc(db, "telegram_users", String(tu.id || tgId)));
                                        if (matchedUser) {
                                          await deleteDoc(doc(db, "users", matchedUser.id));
                                        }
                                        alert("Foydalanuvchi muvaffaqiyatli o'chirildi!");
                                        loadData();
                                      } catch (e) {
                                        console.error(e);
                                        alert("Xatolik yuz berdi!");
                                      }
                                    }}
                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shadow-sm cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {telegramUsers.length === 0 && (
                    <div className="p-16 text-center text-gray-400 font-bold italic opacity-40">
                      Telegram botga hali hech kim a'zo bo'lmagan.
                    </div>
                  )}
                </div>
              </div>
            </div>
      )}
    </div>
  );
}
