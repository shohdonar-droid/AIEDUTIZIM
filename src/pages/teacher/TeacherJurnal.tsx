import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  Enrollment,
  Department,
  Group,
  UserProfile,
  Course,
  Test,
} from "../../types";
import { compareUsersById } from "../../lib/idUtils";
import {
  Loader2,
  Download,
  Search,
  FileText,
  Trash2,
  Filter,
  FileSpreadsheet,
  Award,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { AnimatePresence } from "motion/react";
import CertificateViewer from "../../components/CertificateViewer";
import * as XLSX from "xlsx";

export default function TeacherJurnal() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [allTests, setAllTests] = useState<{ id: string; title: string }[]>([]);

  // Teacher's specific data
  const [teacherCourses, setTeacherCourses] = useState<
    { id: string; name: string }[]
  >([]);
  const [teacherDepts, setTeacherDepts] = useState<Department[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<Group[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<
    Record<string, UserProfile>
  >({});

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"course" | "test" | "exam">(
    user?.role === "staff" ? "test" : "course",
  );

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterTestId, setFilterTestId] = useState("");

  const [selectedCert, setSelectedCert] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const orgUid = user.role === "staff" ? user.teacherId : user.uid;
      if (!orgUid) return;

      try {
        // 1. Load Organization's Depts, Groups
        const dSnap = await getDocs(
          query(
            collection(db, "departments"),
            where("creatorId", "==", orgUid),
          ),
        );
        const depts = dSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Department,
        );
        setTeacherDepts(depts);

        const gSnap = await getDocs(
          query(collection(db, "groups"), where("creatorId", "==", orgUid)),
        );
        setTeacherGroups(
          gSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Group),
        );

        // 2. Load Organization's Students
        const sSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("teacherId", "==", orgUid),
          ),
        );
        const students: Record<string, UserProfile> = {};
        sSnap.forEach((d) => {
          students[d.id] = { uid: d.id, ...d.data() } as UserProfile;
        });
        setStudentProfiles(students);

        // 3. Load Organization's Courses + Admin Courses (as requested)
        const cSnap = await getDocs(collection(db, "courses"));
        const coursesMap: Record<string, string> = {};
        const cArr: { id: string; name: string }[] = [];
        cSnap.forEach((d) => {
          const cData = d.data();
          const isOrgCourse = cData.creatorId === orgUid;
          const isAdminCourse = cData.creatorRole === "admin";

          if (isOrgCourse || isAdminCourse) {
            coursesMap[d.id] = cData.title;
            cArr.push({ id: d.id, name: cData.title });
          }
        });
        setTeacherCourses(cArr);

        // 4. Load Enrollments for students (matching teacherId)
        const eSnap = await getDocs(
          query(
            collection(db, "enrollments"),
            where("teacherId", "==", orgUid),
          ),
        );
        const enrollments: any[] = [];
        eSnap.docs.forEach((doc) => {
          const en = doc.data() as Enrollment;
          const sp = students[en.userId];
          if (!sp) return;

          // Only show enrollment if the course is in our allowed map
          if (coursesMap[en.courseId]) {
            enrollments.push({
              id: doc.id,
              userId: en.userId,
              studentName: sp.displayName || "?",
              departmentId: sp.departmentId,
              groupId: sp.groupId,
              courseId: en.courseId,
              courseName: coursesMap[en.courseId],
              grades: en.grades,
              progress: en.currentModuleIndex,
              completed: en.completed,
              certificateId: en.certificateId,
            });
          }
        });
        setData(enrollments);

        // 5. Load tests and test results
        const tSnap = await getDocs(collection(db, "tests"));
        const testsInOrg: Record<string, string> = {};
        const tArr: { id: string; title: string }[] = [];
        tSnap.forEach((d) => {
          const tData = d.data();
          let shouldInclude = false;

          if (user.role === "staff") {
            shouldInclude = tData.creatorId === user.uid;
          } else {
            shouldInclude =
              tData.teacherId === orgUid ||
              tData.creatorId === orgUid ||
              tData.creatorRole === "admin";
          }

          if (shouldInclude) {
            testsInOrg[d.id] = tData.title;
            tArr.push({ id: d.id, title: tData.title });
          }
        });

        const subSnap = await getDocs(collection(db, "subjects"));
        subSnap.docs.forEach((d) => {
          const sData = d.data();
          const subjectTestId = "subject_" + d.id;
          let shouldInclude = false;

          if (user.role === "staff") {
            shouldInclude = sData.creatorId === user.uid;
          } else {
            shouldInclude =
              sData.creatorId === orgUid ||
              sData.creatorRole === "admin" ||
              (sData.organizationIds && sData.organizationIds.includes(orgUid));
          }

          if (shouldInclude) {
            testsInOrg[subjectTestId] = sData.title;
            tArr.push({ id: subjectTestId, title: sData.title });
          }
        });

        setAllTests(tArr);

        // Show results for all tests belonging to this org's students
        const trSnap = await getDocs(
          query(
            collection(db, "testResults"),
            where("teacherId", "==", orgUid),
          ),
        );
        const results: any[] = [];
        trSnap.docs.forEach((doc) => {
          const d = doc.data() as any;
          const sp = students[d.userId];
          if (!sp || !testsInOrg[d.testId]) return;

          results.push({
            id: doc.id,
            ...d,
            studentName: sp.displayName || d.userName || "?",
            departmentId: sp.departmentId,
            groupId: sp.groupId,
          });
        });
        setTestResults(results);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "teacher-jurnal-loader");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleDeleteCourseEnrollment = async (id: string) => {
    if (!confirm("Rostdan o'chirmoqchimisiz?")) return;
    await deleteDoc(doc(db, "enrollments", id));
    setData(data.filter((d) => d.id !== id));
  };

  const handleDeleteTestResult = async (id: string, isFromTable = false) => {
    if (!confirm("Rostdan o'chirmoqchimisiz?")) return;
    await deleteDoc(doc(db, "testResults", id));
    setTestResults(testResults.filter((d) => d.id !== id));
  };

  // Total Student List for "Matrix" like view
  const allTeacherStudents = Object.values(studentProfiles).sort((a, b) =>
    compareUsersById(a, b),
  );

  // Filtering Course
  const courseDataMap = new Map();
  data.forEach((d) => courseDataMap.set(`${d.userId}_${d.courseId}`, d));

  let displayedCourseStudents = allTeacherStudents;
  if (filterDept)
    displayedCourseStudents = displayedCourseStudents.filter(
      (s) => s.departmentId === filterDept,
    );
  if (filterGrp)
    displayedCourseStudents = displayedCourseStudents.filter(
      (s) => s.groupId === filterGrp,
    );
  if (searchTerm)
    displayedCourseStudents = displayedCourseStudents.filter((s) =>
      s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  // Filtering Tests
  const testResultsMap = new Map();
  testResults.forEach((r) => testResultsMap.set(`${r.userId}_${r.testId}`, r));

  let displayedTestStudents = allTeacherStudents;
  if (filterDept)
    displayedTestStudents = displayedTestStudents.filter(
      (s) => s.departmentId === filterDept,
    );
  if (filterGrp)
    displayedTestStudents = displayedTestStudents.filter(
      (s) => s.groupId === filterGrp,
    );
  if (searchTerm)
    displayedTestStudents = displayedTestStudents.filter((s) =>
      s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  if (filterTestId) {
    displayedTestStudents = displayedTestStudents.filter((s) =>
      testResults.some((r) => r.userId === s.uid && r.testId === filterTestId),
    );
  }

  const availableGroups = teacherGroups.filter(
    (g) => !filterDept || g.departmentId === filterDept,
  );

  const getResultGrade = (pct: number) => {
    if (pct < 30) return 1;
    if (pct <= 55) return 2;
    if (pct <= 71) return 3;
    if (pct <= 86) return 4;
    return 5;
  };

  const exportToExcel = (type: string) => {
    let exportData: any[] = [];
    let filename = "";

    if (type === "course") {
      filename = "Kurs_Jurnali.xlsx";
      exportData = displayedCourseStudents.map((student, i) => {
        const d = filterCourse
          ? data.find(
              (x) => x.userId === student.uid && x.courseId === filterCourse,
            )
          : data.find((x) => x.userId === student.uid);
        return {
          "№": i + 1,
          "F.I.SH": student.displayName,
          "Yo'nalish":
            teacherDepts.find((x) => x.id === student.departmentId)?.name ||
            "-",
          Guruh:
            teacherGroups.find((x) => x.id === student.groupId)?.name || "-",
          Kurs: d?.courseName || "-",
          "Modul 1": d?.grades["m1"] || "-",
          "Modul 2": d?.grades["m2"] || "-",
          "Modul 3": d?.grades["m3"] || "-",
          "Modul 4": d?.grades["m4"] || "-",
          Yakuniy: d?.grades["m5"] || "-",
          "O'rtacha (%)": d?.progress + "%",
        };
      });
    } else if (type === "test" || type === "exam") {
      const isExam = type === "exam";
      filename = isExam ? "Imtihon_Jurnali.xlsx" : "Test_Jurnali.xlsx";

      const filteredResults = testResults
        .filter((r) => {
          const student = studentProfiles[r.userId];
          if (!student) return false;

          const matchSearch =
            !searchTerm ||
            student.displayName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());
          const matchDept = !filterDept || student.departmentId === filterDept;
          const matchGrp = !filterGrp || student.groupId === filterGrp;
          const matchTest = !filterTestId || r.testId === filterTestId;
          const matchType = isExam
            ? r.testType === "exam"
            : r.testType !== "exam";

          return matchSearch && matchDept && matchGrp && matchTest && matchType;
        })
        .sort((a, b) => {
          const studentA = studentProfiles[a.userId];
          const studentB = studentProfiles[b.userId];
          return compareUsersById(studentA, studentB);
        });

      exportData = filteredResults.map((r, i) => {
        const student = studentProfiles[r.userId];
        const deptName =
          teacherDepts.find((x) => x.id === student?.departmentId)?.name || "-";
        const grpName =
          teacherGroups.find((x) => x.id === student?.groupId)?.name || "-";
        const pct = r.score;
        const correctCount =
          r.correctAnswers !== undefined
            ? r.correctAnswers
            : Math.round((r.score / 100) * r.totalQuestions);

        return {
          "№": i + 1,
          FISH: student?.displayName || r.userName || "-",
          "Yo'nalish": deptName,
          Guruh: grpName,
          "Test nomi": r.testTitle || "-",
          "To'g'ri ishlangan testlar soni": correctCount,
          "Jami test soni": r.totalQuestions || 0,
          "Foiz (%)": pct + "%",
          Baho: getResultGrade(pct),
          Sana: r.createdAt?.toDate
            ? r.createdAt.toDate().toLocaleString("uz-UZ")
            : "-",
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
    XLSX.writeFile(workbook, filename);
  };

  if (loading)
    return (
      <div className="text-gray-500 font-medium">
        Jurnal ma'lumotlari yuklanmoqda...
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {user?.role === "staff" ? "Xodim Jurnali" : "Tashkilot Jurnali"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            O'z kurslar va testlaringiz natijalari.
          </p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          {user?.role !== "staff" && (
            <button
              onClick={() => setActiveTab("course")}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "course" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
            >
              Kurs jurnali
            </button>
          )}
          <button
            onClick={() => setActiveTab("test")}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "test" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
          >
            Test jurnali
          </button>
          <button
            onClick={() => setActiveTab("exam")}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "exam" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-gray-600"}`}
          >
            Imtihon jurnali
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-medium"
            placeholder="Qidirish (Talaba)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <Filter className="text-gray-400 w-5 h-5 hidden md:block" />

          <button
            onClick={() => exportToExcel(activeTab)}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 transition-all text-sm uppercase"
          >
            <FileSpreadsheet className="w-5 h-5" /> EXCELGA YUKLASH
          </button>

          {activeTab === "course" && (
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto"
            >
              <option value="">Barcha Kurslar</option>
              {teacherCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {(activeTab === "test" || activeTab === "exam") && (
            <select
              value={filterTestId}
              onChange={(e) => setFilterTestId(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto"
            >
              <option value="">Barcha Testlar</option>
              {allTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
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
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto"
          >
            <option value="">Barcha yo'nalishlar</option>
            {teacherDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterGrp}
            onChange={(e) => setFilterGrp(e.target.value)}
            disabled={!filterDept}
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium w-full md:w-auto disabled:opacity-50"
          >
            <option value="">Barcha guruhlar</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeTab === "course" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    №
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    F.I.SH
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Yo'nalish
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Modul 1
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Modul 2
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Modul 3
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Modul 4
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Yakuniy
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Hujjat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedCourseStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-10 font-bold text-gray-400"
                    >
                      Hech narsa topilmadi
                    </td>
                  </tr>
                ) : (
                  displayedCourseStudents.map((student, i) => {
                    const d = filterCourse
                      ? data.find(
                          (x) =>
                            x.userId === student.uid &&
                            x.courseId === filterCourse,
                        )
                      : data.find((x) => x.userId === student.uid);
                    const deptName =
                      teacherDepts.find((x) => x.id === student.departmentId)
                        ?.name || "-";
                    return (
                      <tr key={i} className="hover:bg-gray-50/30">
                        <td className="px-6 py-4 font-bold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 font-black">
                          {student.displayName}
                        </td>
                        <td className="px-6 py-4 font-bold text-sm text-gray-500">
                          {deptName}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm text-gray-600">
                          {d?.grades?.["m1"] ? d.grades?.["m1"] + "%" : "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm text-gray-600">
                          {d?.grades?.["m2"] ? d.grades?.["m2"] + "%" : "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm text-gray-600">
                          {d?.grades?.["m3"] ? d.grades?.["m3"] + "%" : "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm text-gray-600">
                          {d?.grades?.["m4"] ? d.grades?.["m4"] + "%" : "-"}
                        </td>
                        <td className="px-6 py-4 text-center font-black">
                          <span
                            className={`px-3 py-1 rounded-lg ${d?.grades?.["m5"] && Number(d.grades["m5"]) >= 60 ? "bg-green-100 text-green-700" : d?.grades?.["m5"] ? "bg-red-100 text-red-700" : ""}`}
                          >
                            {d?.grades?.["m5"] ? d.grades?.["m5"] + "%" : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {d?.completed && (
                            <button
                              onClick={() =>
                                setSelectedCert({
                                  ...d,
                                  studentName: student.displayName,
                                  courseTitle: d.courseName,
                                })
                              }
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-bold text-xs"
                            >
                              <Award className="w-4 h-4" /> KO'RISH
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "exam" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    №
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    F.I.SH
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    Yo'nalish va Guruh
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    Imtihon nomi
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    Natija (5 ball)
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedTestStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 font-bold text-gray-400"
                    >
                      Hech narsa topilmadi
                    </td>
                  </tr>
                ) : (
                  displayedTestStudents.map((student, i) => {
                    const r = filterTestId
                      ? testResults.find(
                          (x) =>
                            x.userId === student.uid &&
                            x.testId === filterTestId &&
                            x.testType === "exam",
                        )
                      : testResults.find(
                          (x) =>
                            x.userId === student.uid && x.testType === "exam",
                        );
                    const pct = r
                      ? Math.round((r.score / r.totalQuestions) * 100)
                      : 0;
                    const gradeNum = r ? getResultGrade(pct) : 0;
                    const deptName =
                      teacherDepts.find((x) => x.id === student.departmentId)
                        ?.name || "-";
                    const grpName =
                      teacherGroups.find((x) => x.id === student.groupId)
                        ?.name || "-";
                    return (
                      <tr key={`${student.uid || "student"}_exam_${i}`}>
                        <td className="px-6 py-4 font-bold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 font-black">
                          {student.displayName}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-500 text-sm whitespace-nowrap">
                          {deptName} / {grpName}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">
                          {r?.testTitle || "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {r ? (
                            <span
                              className={`font-black px-6 py-2 rounded-xl text-xl ${gradeNum >= 4 ? "bg-green-500 text-white" : gradeNum === 3 ? "bg-yellow-500 text-white" : "bg-red-500 text-white"}`}
                            >
                              {gradeNum}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {r && (
                            <button
                              onClick={() => handleDeleteTestResult(r.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === "test" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    №
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    F.I.SH
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    Yo'nalish
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                    Guruh
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    To'gri / Jami
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    %
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    Baho (1-5)
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                    Sana
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                    Amal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedTestStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-10 font-bold text-gray-400"
                    >
                      Hech narsa topilmadi
                    </td>
                  </tr>
                ) : (
                  displayedTestStudents.map((student, i) => {
                    const r = filterTestId
                      ? testResults.find(
                          (x) =>
                            x.userId === student.uid &&
                            x.testId === filterTestId &&
                            x.testType !== "exam",
                        )
                      : testResults.find(
                          (x) =>
                            x.userId === student.uid && x.testType !== "exam",
                        );
                    const pct = r ? r.score : 0;
                    const correctCount = r
                      ? r.correctAnswers !== undefined
                        ? r.correctAnswers
                        : Math.round((r.score / 100) * r.totalQuestions)
                      : 0;
                    const gradeNum = r ? getResultGrade(pct) : 0;
                    const deptName =
                      teacherDepts.find((x) => x.id === student.departmentId)
                        ?.name || "-";
                    const grpName =
                      teacherGroups.find((x) => x.id === student.groupId)
                        ?.name || "-";
                    return (
                      <tr key={`${student.uid || "student"}_test_${i}`}>
                        <td className="px-6 py-4 font-bold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 font-black">
                          {student.displayName}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-500 text-sm whitespace-nowrap">
                          {deptName}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-500 text-sm whitespace-nowrap">
                          {grpName}
                        </td>
                        <td className="px-6 py-4 text-center font-bold">
                          {r ? `${correctCount}/${r.totalQuestions}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {r ? (
                            <span
                              className={`font-black px-3 py-1 rounded-lg text-sm ${pct >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {pct}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {r ? (
                            <span
                              className={`font-black px-4 py-1.5 rounded-xl text-lg ${gradeNum >= 4 ? "bg-green-500 text-white" : gradeNum === 3 ? "bg-yellow-500 text-white" : "bg-red-500 text-white"}`}
                            >
                              {gradeNum}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-gray-500 whitespace-nowrap">
                          {r?.createdAt?.toDate
                            ? r.createdAt.toDate().toLocaleString("uz-UZ")
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {r && (
                            <button
                              onClick={() => handleDeleteTestResult(r.id, true)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatePresence>
        {selectedCert && (
          <CertificateViewer
            selectedCert={selectedCert}
            onClose={() => setSelectedCert(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
