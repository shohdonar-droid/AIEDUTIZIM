import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { auth, db } from '../../lib/firebase';
import { collection, query, where } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminOverview from './AdminOverview';
import AdminBanner from './AdminBanner';
import AdminInfo from './AdminInfo';
import AdminFooter from './AdminFooter';
import AdminCourses from './AdminCourses';
import AdminDepartments from './AdminDepartments';
import AdminTests from './AdminTests';
import AdminUsers from './AdminUsers';
import AdminJurnal from './AdminJurnal';
import AdminCertificates from './AdminCertificates';
import AdminNotifications from './AdminNotifications';
import AdminBilling from './AdminBilling';
import AdminBotUsers from './AdminBotUsers';
import AdminBot from './AdminBot';
import AdminQuizizz from './AdminQuizizz';
import AdminServices from './AdminServices';
import AdminSubjects from '../../components/SubjectsManager';
import SubjectRead from '../SubjectRead';
import ChatSection from '../ChatSection';
import AdminProfile from './AdminProfile';
import AdminAiAssistant from './AdminAiAssistant';
import AdminStorage from './AdminStorage';
import AdminAcademic from './AdminAcademic';
import AdminSystemLogs from './AdminSystemLogs';
import AdminBackup from './AdminBackup';
import { AdminLayout } from '../../components/admin/AdminLayout';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let count1 = 0;
    let count2 = 0;

    const q1 = query(
      collection(db, 'messages'),
      where('isRead', '==', false),
      where('receiverId', '==', user.uid)
    );

    const q2 = query(
      collection(db, 'messages'),
      where('isRead', '==', false),
      where('receiverRole', '==', 'admin')
    );

    const unsub1 = safeOnSnapshot(q1, (snap) => {
      count1 = snap.docs.length;
      setUnreadCount(count1 + count2);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count 1)'));

    const unsub2 = safeOnSnapshot(q2, (snap) => {
      count2 = snap.docs.length;
      setUnreadCount(count1 + count2);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count 2)'));

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  return (
    <AdminLayout unreadCount={unreadCount} user={user}>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/profile" element={<AdminProfile />} />
        <Route path="/ai-assistant" element={<AdminAiAssistant />} />
        
        {/* Academic Structure */}
        <Route path="/academic" element={<AdminAcademic />} />
        
        {/* Users */}
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/users/:tab" element={<AdminUsers />} />
        
        {/* Educational Resources */}
        <Route path="/courses" element={<AdminCourses />} />
        <Route path="/subjects" element={<AdminSubjects />} />
        <Route path="/subjects/read/:id" element={<SubjectRead />} />
        <Route path="/tests" element={<AdminTests />} />
        <Route path="/quizizz" element={<AdminQuizizz />} />
        <Route path="/certificates" element={<AdminCertificates />} />
        
        {/* Monitoring */}
        <Route path="/attendance" element={<div className="p-10 font-bold">Davomat (Tez kunda)</div>} />
        <Route path="/jurnal" element={<AdminJurnal />} />
        <Route path="/reports" element={<div className="p-10 font-bold">Hisobotlar (Tez kunda)</div>} />
        
        {/* Site Management */}
        <Route path="/banner" element={<AdminBanner />} />
        <Route path="/info" element={<AdminInfo />} />
        <Route path="/footer" element={<AdminFooter />} />
        
        {/* Billing */}
        <Route path="/billing" element={<AdminBilling />} />
        <Route path="/active-subscriptions" element={<div className="p-10 font-bold">Faol obunalar (Tez kunda)</div>} />
        <Route path="/payment-history" element={<div className="p-10 font-bold">To'lovlar tarixi (Tez kunda)</div>} />
        <Route path="/connection-requests" element={<AdminServices />} />
        <Route path="/promo-codes" element={<div className="p-10 font-bold">Promo kodlar (Tez kunda)</div>} />
        
        <Route path="/notifications" element={<AdminNotifications />} />
        <Route path="/chat" element={<ChatSection />} />
        
        {/* Site Settings */}
        <Route path="/system-logs" element={<AdminSystemLogs />} />
        <Route path="/backup" element={<AdminBackup />} />
        <Route path="/settings/:section" element={<div className="p-10 font-bold">Sozlamalar (Tez kunda)</div>} />
        
        {/* Legacy / Others */}
        <Route path="/storage" element={<AdminStorage />} />
        <Route path="/bot-users" element={<AdminBotUsers />} />
        <Route path="/bot" element={<AdminBot />} />
      </Routes>
    </AdminLayout>
  );
}
