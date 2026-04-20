import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClassDetails from './pages/ClassDetails';
import Classwork from './components/Classwork';
import Stream from './components/Stream';
import MaterialDetails from './pages/MaterialDetails';
import WorkspaceLayout from './components/WorkspaceLayout';
import UploadMaterial from './components/UploadMaterial';
import Assessments from './pages/Assessments';
import LoginPage from './pages/LoginPage';
import { getAuthStatus } from './api';
import { Loader2 } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount and when window gets focus
  const checkAuth = async () => {
    try {
      const status = await getAuthStatus();
      setIsAuthenticated(status.authenticated);
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Re-check auth when the window gets focus (e.g. returning from Google login)
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f1a]">
         <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // If not authenticated, only show the login page
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route element={<WorkspaceLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          {/* Class Details nested routing */}
          <Route path="/course/:courseId" element={<ClassDetails />}>
            {/* Default view is now Classwork (Notes) as per user request */}
            <Route index element={<Navigate to="classwork" replace />} />
            
            {/* AI Chat workspace */}
            <Route path="stream" element={<Stream />} />
            
            {/* Classwork view */}
            <Route path="classwork" element={<Classwork />} />

            {/* Upload Material view */}
            <Route path="upload" element={<UploadMaterial />} />
            
            {/* Assessments view */}
            <Route path="assessments" element={<Assessments />} />
            
            {/* Material Details view */}
            <Route path="material/:fileName" element={<MaterialDetails />} />
            
            <Route path="*" element={<Navigate to="classwork" replace />} />
          </Route>

        </Route>

        {/* Global Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
