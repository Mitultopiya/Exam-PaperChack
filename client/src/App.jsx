import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import Students from './pages/Students';
import AnswerKeys from './pages/AnswerKeys';
import Evaluate from './pages/Evaluate';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import UploadAnswerKey from './pages/UploadAnswerKey';
import UploadStudentPDF from './pages/UploadStudentPDF';
import SubjectiveResults from './pages/SubjectiveResults';
import SubjectiveResult from './pages/SubjectiveResult';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master-key" element={<UploadAnswerKey />} />
        <Route path="/student-pdf" element={<UploadStudentPDF />} />
        <Route path="/ai-results" element={<SubjectiveResults />} />
        <Route path="/ai-results/:id" element={<SubjectiveResult />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/students" element={<Students />} />
        <Route path="/answer-keys" element={<AnswerKeys />} />
        <Route path="/evaluate" element={<Evaluate />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/:id" element={<ResultDetail />} />
      </Route>

      <Route path="/" element={<Navigate to="/master-key" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
