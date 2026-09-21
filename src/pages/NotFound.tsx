import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4 sm:p-6 bg-bg-base">
      <div className="w-full max-w-md text-center bg-bg-surface border border-border-subtle rounded-3xl p-8 sm:p-10 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-xs font-bold uppercase tracking-wider mb-3">
          404 Error
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-text-secondary mb-8 leading-relaxed">
          The page you are looking for doesn't exist or may have been moved to a new URL.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 px-4 rounded-xl border border-border-subtle bg-bg-base hover:bg-bg-surface text-text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            to={user ? "/dashboard" : "/"}
            className="flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md shadow-brand-500/20"
          >
            {user ? (
              <>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </>
            ) : (
              <>
                <Home className="w-4 h-4" />
                Home Page
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
