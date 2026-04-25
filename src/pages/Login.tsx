import { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      await login(credentialResponse.credential);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian-950">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative max-w-sm w-full px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl" />
              <img src="/favicon.svg" alt="Tenet AI" className="relative h-14 w-14 rounded-2xl" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Tenet AI</h1>
          <p className="mt-1.5 text-sm text-slate-500">AI governance · audit dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-obsidian-900 border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {GOOGLE_CLIENT_ID ? (
            <div className="space-y-5">
              <p className="text-xs text-slate-500 text-center">Sign in with your Google workspace account</p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="280"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">Google OAuth not configured</p>
                  <p className="text-xs text-amber-500 mt-0.5">Set VITE_BYPASS_AUTH=true in .env.local to access the dashboard in development.</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-1.5">
                <p className="text-slate-500 font-semibold">To enable Google Sign-In:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Create OAuth credentials in Google Cloud Console</li>
                  <li>Set <code className="bg-white/[0.06] px-1 rounded font-mono text-neptune-400">VITE_GOOGLE_CLIENT_ID</code> in .env</li>
                  <li>Set backend credentials and restart</li>
                </ol>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-xs text-slate-600">
            <Shield className="h-3 w-3 text-neptune-500" />
            <span>Enterprise audit trail for AI agents</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
