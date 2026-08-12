import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import AuthGateHarness from './testing/AuthGateHarness';
import { TOOLS } from './data/tools';

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
const Workspace = lazy(() => import('./pages/Workspace'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));

const TOOL_PAGES = { merge: Merge, sign: Sign, split: Split, compress: Compress, rotate: Rotate, watermark: Watermark, reorder: Reorder, 'image-to-pdf': Convert };

const LEGACY_REDIRECTS = { merge: '/merge', sign: '/sign', split: '/split', compress: '/compress', rotate: '/rotate', watermark: '/watermark', reorder: '/reorder', 'image-to-pdf': '/convert' };

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-purple-500 animate-spin dark:border-slate-700" />
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

              {TOOLS.map((tool) => {
                const Page = TOOL_PAGES[tool.slug];
                return (
                  <Route
                    key={tool.slug}
                    path={tool.path}
                    element={
                      <MainLayout>
                        <Page />
                      </MainLayout>
                    }
                  />
                );
              })}

              {TOOLS.map((tool) => (
                <Route
                  key={tool.slug}
                  path={LEGACY_REDIRECTS[tool.slug]}
                  element={<Navigate to={tool.path} replace />}
                />
              ))}

              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              {import.meta.env.DEV && (
                <Route path="/__dev/authgate" element={<AuthGateHarness />} />
              )}
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Workspace />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <MainLayout>
                      <AdminDashboard />
                    </MainLayout>
                  </AdminRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}