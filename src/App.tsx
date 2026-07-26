import { useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/ThemeContext';
import { I18nProvider } from './lib/I18nContext';
import { MarketingConfigProvider } from './lib/MarketingConfigContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Home from './pages/Home';
import Plans from './pages/Plans';
import Login from './pages/Login';
import Register from './pages/Register';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProductsPage from './pages/Products';
import CartPage from './pages/Cart';
import AiAssistantPage from './pages/AiAssistant';
import AiInsightsPage from './pages/AiInsights';
import AiMarketingConfig from './pages/AiMarketingConfig';
import ExpensesPage from './pages/Expenses';
import StorePage from './pages/Store';
import AdminAnalytics from './pages/AdminAnalytics';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
            <MarketingConfigProvider>
              <BrowserRouter>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col bg-bg-base text-text-primary transition-colors overflow-x-hidden max-w-[100vw]">
                  <Navigation />
                  <PWAInstallPrompt />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/plans" element={<Plans />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/dashboard" element={<ProtectedRoute><VendorDashboard /></ProtectedRoute>} />
                      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/store/:vendorId" element={<StorePage />} />
                      <Route path="/ai-assistant" element={<ProtectedRoute><AiAssistantPage /></ProtectedRoute>} />
                      <Route path="/ai-insights" element={<ProtectedRoute><AiInsightsPage /></ProtectedRoute>} />
                      <Route path="/ai-marketing" element={<ProtectedRoute><AiMarketingConfig /></ProtectedRoute>} />
                      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/login" element={<AdminDashboard />} />
                      <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              </BrowserRouter>
            </MarketingConfigProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
