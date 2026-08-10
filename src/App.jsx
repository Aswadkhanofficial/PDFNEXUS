import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

const Merge = lazy(() => import('./pages/Merge'));
const Sign = lazy(() => import('./pages/Sign'));
const Split = lazy(() => import('./pages/Split'));
const Convert = lazy(() => import('./pages/Convert'));
const Compress = lazy(() => import('./pages/Compress'));
const Rotate = lazy(() => import('./pages/Rotate'));
const Watermark = lazy(() => import('./pages/Watermark'));
const Reorder = lazy(() => import('./pages/Reorder'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/merge" element={<Merge />} />
              <Route path="/sign" element={<Sign />} />
              <Route path="/split" element={<Split />} />
              <Route path="/convert" element={<Convert />} />
              <Route path="/compress" element={<Compress />} />
              <Route path="/rotate" element={<Rotate />} />
              <Route path="/watermark" element={<Watermark />} />
              <Route path="/reorder" element={<Reorder />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}