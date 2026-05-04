/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Tests from './pages/Tests';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/StudentDashboard';
import TestExecute from './pages/student/TestExecute';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseView from './pages/CourseView';
import InfoDetail from './pages/InfoDetail';
import { Loader2 } from 'lucide-react';

import TeacherDashboard from './pages/teacher/TeacherDashboard';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'student' | 'teacher' | 'staff' }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (role) {
    if (role === 'teacher' && (user.role === 'teacher' || user.role === 'staff')) {
       // Allow both organization (teacher) and staff to access teacher routes
    } else if (user.role !== role) {
       return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="fixed inset-0 z-[-1] bg-[#fafafa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 min-h-screen font-sans">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/info" element={<InfoDetail />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<ProtectedRoute><CourseView /></ProtectedRoute>} />
              <Route path="/tests" element={<Tests />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Student Routes */}
              <Route path="/student/*" element={
                <ProtectedRoute role="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              
              {/* Teacher Routes */}
              <Route path="/teacher/*" element={
                <ProtectedRoute role="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/:testId" element={
                <ProtectedRoute>
                  <TestExecute />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/*" element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
