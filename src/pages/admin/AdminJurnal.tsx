import { useState, useEffect } from "react";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Enrollment, Department, Group } from "../../types";
import {
  Loader2,
  Download,
  Search,
  FileText,
  Trash2,
  Filter,
  Award,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import CertificateViewer from "../../components/CertificateViewer";
import * as XLSX from "xlsx";

export default function AdminJurnal() {
  const [data, setData] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [allTests, setAllTests] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [allSystemUsers, setAllSystemUsers] = useState<
    { uid: string; name: string; dept?: string; grp?: string; org?: string }[]
  >([]);
  const [organizations, setOrganizations] = useState<
    { uid: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"course" | "test">("course");
  const [testPage, setTestPage] = useState(0);
  const [quizizzPage, setQuizizzPage] = useState(0);

  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [filterOrg, setFilterOrg] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterTestId, setFilterTestId] = useState("");

  const [selectedCert, setSelectedCert] = useState<any>(null);

  const [quizizzHistory, setQuizizzHistory] = useState<any[]>([]);
  const [viewedQuizResult, setViewedQuizResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const uSnap = await getDocs(collection(db, "users"));
        const dSnap = await getDocs(collection(db, "departments"));
        const gSnap = await getDocs(collection(db, "groups"));

        const depts = dSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Department,
        );
        const grps = gSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Group,
        );
        setDepartments(depts);
        setGroups(grps);

        const users: Record<
          string,
          {
            name: string;
            dept: string;
            grp: string;
            teacherId?: string;
            role: string;
          }
        > = {};
        const systemUsers: {
          uid: string;
          name: string;
          dept?: string;
          grp?: string;
          org?: string;
        }[] = [];
        const orgs: { uid: string; name: string }[] = [];

        uSnap.forEach((d) => {
          const userObj = d.data();
          users[d.id] = {
            name: userObj.displayName || "Noma'lum",
            dept: userObj.departmentId || "",
            grp: userObj.groupId || "",
            teacherId: userObj.teacherId,
            role: userObj.role,
          };

          if (userObj.role === "student") {
            systemUsers.push({
              uid: d.id,
              name: userObj.displayName || "Noma'lum",
              dept: userObj.departmentId,
              grp: userObj.groupId,
              org: userObj.teacherId,
            });
          }
          if (userObj.role === "teacher") {
            orgs.push({
              uid: d.id,
              name: userObj.displayName || "Noma'lum tashkilot",
            });
          }
        });
        setAllSystemUsers(systemUsers);
        setOrganizations(orgs);

        const cSnap = await getDocs(collection(db, "courses"));
        const coursesMap: Record<string, { title: string; role: string }> = {};
        const cArr: { id: string; name: string }[] = [];
        cSnap.forEach((d) => {
          const cData = d.data();
          const role = cData.creatorRole || "admin";
          coursesMap[d.id] = { title: cData.title, role: role };
          if (role === "admin") {
            cArr.push({ id: d.id, name: cData.title });
          }
        });
        setAllCourses(cArr);

        // Fetch enrollments
        const eSnap = await getDocs(collection(db, "enrollments"));
        const enrollments: any[] = [];
        eSnap.docs.forEach((doc) => {
          const en = doc.data() as Enrollment;
          const courseInfo = coursesMap[en.courseId];
          // Only show results for Admin-created courses in Admin Jurnal
          if (
            courseInfo?.role === "admin" &&
            users[en.userId] &&
            users[en.userId].role === "student"
          ) {
            enrollments.push({
              id: doc.id,
              userId: en.userId,
              studentName: users[en.userId].name,
              courseId: en.courseId,
              courseName: courseInfo.title || "Kurs",
              grades: en.grades,
              progress: en.currentModuleIndex,
              completed: en.completed,
              certificateId: en.certificateId,
              dept: users[en.userId].dept,
              grp: users[en.userId].grp,
              org: users[en.userId].teacherId,
            });
          }
        });
        setData(enrollments);

        // Fetch tests
        const tSnap = await getDocs(
          query(collection(db, "tests"), orderBy("createdAt", "asc")),
        );
        const testsMap: Record<string, { title: string; role: string }> = {};
        const tArr: { id: string; title: string }[] = [];
        tSnap.forEach((d) => {
          const tData = d.data();
          const role = tData.creatorRole || "admin";
          testsMap[d.id] = { title: tData.title, role: role };
          if (role === "admin") {
            tArr.push({ id: d.id, title: tData.title });
          }
        });
        setAllTests(tArr);

        // Fetch results
        const trSnap = await getDocs(
          query(collection(db, "testResults"), orderBy("createdAt", "desc")),
        );
        const results = trSnap.docs
          .map((doc) => {
            const d = doc.data() as any;
            const testInfo = testsMap[d.testId];
            return {
              id: doc.id,
              ...d,
              testAuthorRole: testInfo?.role || "admin",
              studentName: users[d.userId]?.name || d.userName || "Noma'lum",
              dept: users[d.userId]?.dept,
              grp: users[d.userId]?.grp,
              org: users[d.userId]?.teacherId,
            };
          })
          .filter(
            (r) =>
              r.testAuthorRole === "admin" &&
              users[r.userId] &&
              users[r.userId].role === "student",
          );
        setTestResults(results);

        // Fetch quiz_history
        const qhSnap = await getDocs(query(collection(db, "quiz_history")));
        const allQuizizz = qhSnap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, creatorObj: users[data.teacherId] };
        });
        allQuizizz.sort(
          (a: any, b: any) =>
            (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0),
        );
        setQuizizzHistory(allQuizizz);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "admin-jurnal-loader");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedCourse && allCourses.length > 0) {
      setSelectedCourse(allCourses[0].id);
    }
  }, [allCourses, selectedCourse]);

  // Unified Filtering for ALL tabs
  let filteredStudents = allSystemUsers;
  if (filterOrg)
    filteredStudents = filteredStudents.filter((s) => s.org === filterOrg);
  if (filterDept)
    filteredStudents = filteredStudents.filter((s) => s.dept === filterDept);
  if (filterGrp)
    filteredStudents = filteredStudents.filter((s) => s.grp === filterGrp);
  if (searchTerm)
    filteredStudents = filteredStudents.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  filteredStudents = filteredStudents.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const tableData = selectedCourse
    ? filteredStudents.map((su) => {
        const en = data.find(
          (r) => r.userId === su.uid && r.courseId === selectedCourse,
        );
        return {
          id: su.uid,
          studentName: su.name,
          courseName: en?.courseName || "",
          dept: su.dept,
          grp: su.grp,
          org: su.org,
          grades: en ? en.grades : {},
          isEnrolled: !!en,
        };
      })
    : [];

  const exportJurnal = () => {
    const filename = "Kurs_Jurnali.xlsx";
    const exportData = tableData.map((row, idx) => ({
      "№": idx + 1,
      FISH: row.studentName,
      "Modul 1": row.grades?.[0] || 0,
      "Modul 2": row.grades?.[1] || 0,
      "Modul 3": row.grades?.[2] || 0,
      "Modul 4": row.grades?.[3] || 0,
      "Modul 5 (Yakuniy)": row.grades?.[4] || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal");
    XLSX.writeFile(workbook, filename);
  };

  // TESTS MATRIX LOGIC
  const testsPerPage = 10;
  let testsToShow = allTests;
  if (filterTestId) {
    testsToShow = allTests.filter((t) => t.id === filterTestId);
  }

  const testCols = testsToShow.slice(
    testPage * testsPerPage,
    (testPage + 1) * testsPerPage,
  );
  const totalTestPages = Math.ceil(testsToShow.length / testsPerPage);

  // Group results by user
  const userTestMatrix: Record<string, Record<string, number>> = {};
  testResults.forEach((tr) => {
    if (!userTestMatrix[tr.userId]) {
      userTestMatrix[tr.userId] = {};
    }
    if (userTestMatrix[tr.userId][tr.testId] === undefined) {
      userTestMatrix[tr.userId][tr.testId] = tr.score;
    }
  });

  const matrixRows = filteredStudents.map((student) => ({
    uid: student.uid,
    name: student.name,
    dept: student.dept,
    grp: student.grp,
    org: student.org,
    scores: userTestMatrix[student.uid] || {},
  }));

  const exportTests = () => {
    const filename = "Test_Natijalari.xlsx";
    const exportData = matrixRows.map((row, idx) => {
      const item: any = {
        "№": idx + 1,
        Talaba: row.name,
      };
      testCols.forEach((t, i) => {
        item[`Test ${testPage * testsPerPage + i + 1}`] =
          row.scores[t.id] !== undefined ? row.scores[t.id] : 0;
      });
      return item;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Testlar");
    XLSX.writeFile(workbook, filename);
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center border-4 border-dashed border-gray-100 rounded-3xl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Jurnal
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Talabalar baholari va natijalari ro'yxati.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("course")}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition ${activeTab === "course" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              Kurs jurnali
            </button>
            <button
              onClick={() => setActiveTab("test")}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition ${activeTab === "test" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              Test jurnali
            </button>
          </div>
        </div>
      </header>

      {activeTab === "course" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center flex-1">
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-blue-600 font-medium"
                  placeholder="Talabani qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-700 font-bold"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Barcha kurslar</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="hidden sm:block text-gray-300">|</div>
              <Filter className="text-gray-400 w-5 h-5 hidden md:block" />

              <select
                value={filterOrg}
                onChange={(e) => {
                  setFilterOrg(e.target.value);
                  setFilterDept("");
                  setFilterGrp("");
                }}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha tashkilotlar</option>
                {organizations.map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterGrp("");
                }}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha yo'nalishlar</option>
                {departments
                  .filter((d) => !filterOrg || d.creatorId === filterOrg)
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
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
              >
                <option value="">Barcha guruhlar</option>
                {groups
                  .filter((g) => g.departmentId === filterDept)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={exportJurnal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              <Download className="h-5 w-5" /> Yuklash
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest w-16">
                      №
                    </th>
                    <th className="px-5 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest min-w-[200px]">
                      FISH
                    </th>
                    <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      1-modul
                    </th>
                    <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      2-modul
                    </th>
                    <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      3-modul
                    </th>
                    <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      4-modul
                    </th>
                    <th className="px-4 py-5 text-center text-xs font-black text-blue-600 uppercase tracking-widest whitespace-nowrap bg-blue-50/50 border-l border-white">
                      5-modul
                    </th>
                    <th className="px-4 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      Amal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableData.map((row, idx) => {
                    const mScores = [0, 1, 2, 3, 4].map((m) =>
                      row.grades?.[m] !== undefined ? row.grades[m] : null,
                    );
                    const allDone = mScores.every((s) => s !== null && s >= 60);

                    let rowColor = "hover:bg-gray-50/30";
                    if (!row.isEnrolled)
                      rowColor = "bg-red-100/30 hover:bg-red-100/50";
                    else if (allDone)
                      rowColor = "bg-green-100/30 hover:bg-green-100/50";
                    else rowColor = "bg-yellow-100/30 hover:bg-yellow-100/50";

                    return (
                      <tr
                        key={row.id}
                        className={`${rowColor} transition-colors`}
                      >
                        <td className="px-6 py-6 text-center text-gray-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-6">
                          <p className="font-bold text-gray-900 line-clamp-1">
                            {row.studentName}
                          </p>
                        </td>
                        {[0, 1, 2, 3, 4].map((m) => (
                          <td
                            key={m}
                            className={`px-4 py-6 text-center ${m === 4 ? "border-l border-white/50" : ""}`}
                          >
                            {row.grades?.[m] !== undefined ? (
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-black ${row.grades[m] >= 60 ? "bg-white text-gray-600 shadow-sm" : "bg-white/50 text-gray-500"}`}
                              >
                                {row.grades[m]}%
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-6 text-right">
                          {row.isEnrolled &&
                            data.find(
                              (en) =>
                                en.userId === row.id &&
                                en.courseId === selectedCourse,
                            )?.completed && (
                              <button
                                onClick={() => {
                                  const en = data.find(
                                    (x) =>
                                      x.userId === row.id &&
                                      x.courseId === selectedCourse,
                                  );
                                  setSelectedCert({
                                    ...en,
                                    studentName: row.studentName,
                                    courseTitle: row.courseName,
                                  });
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-bold text-[10px]"
                              >
                                <Award className="h-4 w-4" /> REYTING
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tableData.length === 0 && (
                <div className="p-10 text-center text-gray-400 font-bold opacity-50">
                  Kurs ko'rsatkichlari topilmadi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "test" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center flex-1">
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-blue-600 font-medium"
                  placeholder="Talabani qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="hidden sm:block text-gray-300">|</div>
              <Filter className="text-gray-400 w-5 h-5 hidden md:block" />

              <select
                value={filterOrg}
                onChange={(e) => {
                  setFilterOrg(e.target.value);
                  setFilterDept("");
                  setFilterGrp("");
                }}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha tashkilotlar</option>
                {organizations.map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterGrp("");
                }}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha yo'nalishlar</option>
                {departments
                  .filter((d) => !filterOrg || d.creatorId === filterOrg)
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
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
              >
                <option value="">Barcha guruhlar</option>
                {groups
                  .filter((g) => g.departmentId === filterDept)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>

              <select
                value={filterTestId}
                onChange={(e) => {
                  setFilterTestId(e.target.value);
                  setTestPage(0);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Barcha testlar</option>
                {allTests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={exportTests}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
            >
              <Download className="h-5 w-5" /> Yuklash
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest w-16">
                      №
                    </th>
                    <th className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest min-w-[200px]">
                      Talabalar ro'yxati
                    </th>
                    {testCols.map((tc, idx) => (
                      <th
                        key={tc.id}
                        className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap"
                        title={tc.title}
                      >
                        <span className="cursor-help hover:text-blue-600 border-b border-dashed border-gray-300">
                          Test {testPage * testsPerPage + idx + 1}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {matrixRows.map((row, idx) => {
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50/30 transition-colors"
                      >
                        <td className="px-6 py-6 text-center text-gray-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-8 py-6 border-r border-gray-50">
                          <p className="font-bold text-gray-900">{row.name}</p>
                        </td>
                        {testCols.map((tc) => {
                          const hasScore = row.scores[tc.id] !== undefined;
                          return (
                            <td
                              key={tc.id}
                              className={`px-4 py-6 text-center ${!hasScore ? "bg-red-50" : ""}`}
                            >
                              {hasScore ? (
                                <span
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black ${row.scores[tc.id] >= 60 ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-400"}`}
                                >
                                  {row.scores[tc.id]}%
                                </span>
                              ) : (
                                <span className="text-red-300 font-bold">
                                  --
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matrixRows.length === 0 && (
                <div className="p-10 text-center text-gray-400 font-bold opacity-50">
                  Test ishlagan talabalar reytingi hozircha bo'sh.
                </div>
              )}
            </div>
          </div>

          {totalTestPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                disabled={testPage === 0}
                onClick={() => setTestPage((p) => Math.max(0, p - 1))}
                className="px-4 py-2 font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                O'tdingi
              </button>
              <span className="font-bold text-gray-700 px-4">
                {testPage + 1} / {totalTestPages}
              </span>
              <button
                disabled={testPage === totalTestPages - 1}
                onClick={() =>
                  setTestPage((p) => Math.min(totalTestPages - 1, p + 1))
                }
                className="px-4 py-2 font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Keyingi
              </button>
            </div>
          )}
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
