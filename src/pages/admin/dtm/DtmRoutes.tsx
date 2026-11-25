import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../hooks/useAuth';
import DtmDashboard from './DtmDashboard';
import DtmSubjects from './DtmSubjects';
import DtmQuestions from './DtmQuestions';
import DtmOrganizations from './DtmOrganizations';
import DtmOrganizationDetail from './DtmOrganizationDetail';
import DtmAssignments from './DtmAssignments';
import DtmResults from './DtmResults';
import DtmAnswerCheck from './DtmAnswerCheck';

export function DtmSubRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DtmDashboard />} />
      <Route path="questions" element={<DtmQuestions />} />
      <Route path="subjects" element={<DtmSubjects />} />
      <Route path="organizations" element={<DtmOrganizations />} />
      <Route path="organizations/:id" element={<DtmOrganizationDetail />} />
      <Route path="assignments" element={<DtmAssignments />} />
      <Route path="results" element={<DtmResults />} />
      <Route path="answer-check" element={<DtmAnswerCheck />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default function DtmModuleShell() {
  const { user } = useAuth();

  return (
    <AdminLayout unreadCount={0} user={user}>
      <DtmSubRoutes />
    </AdminLayout>
  );
}
