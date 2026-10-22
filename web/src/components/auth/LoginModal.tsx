import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Shield, User, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, register, isAuthenticated, user, logout } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('admin@prostock.local');
  const [password, setPassword] = useState<string>('AdminProStockPassword2026!');
  const [fullName, setFullName] = useState<string>('Lead Quant Admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setEmail('admin@prostock.local');
    setPassword('AdminProStockPassword2026!');
    setFullName('Lead Quant Admin');
    setIsRegisterMode(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-1 border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-bg-2 border-b border-border">
          <div className="flex items-center gap-2 text-accent">
            <Shield size={20} />
            <h3 className="font-bold text-sm tracking-wide text-fg-0">
              {isAuthenticated ? 'ProStock Identity & Session' : isRegisterMode ? 'Create Quant Account' : 'Institutional Terminal Login'}
            </h3>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="text-fg-3 hover:text-fg-0 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isAuthenticated && user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-bg-2 border border-border flex items-center gap-3">
                <div className="p-3 rounded-full bg-accent/20 text-accent font-bold text-lg">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-fg-0">{user.fullName}</div>
                  <div className="text-xs font-mono text-fg-2">{user.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Role: {user.role}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>JWT Bearer active. Capital protection engines online.</span>
              </div>

              <button
                onClick={logout}
                className="w-full py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs font-mono border border-rose-500/40 transition-colors"
              >
                Sign Out Terminal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-fg-3 uppercase">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-2.5 text-fg-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-bg-2 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-fg-0 focus:outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-fg-3 uppercase">Institutional Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-2.5 text-fg-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="trader@prostock.local"
                    className="w-full bg-bg-2 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-fg-0 focus:outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-fg-3 uppercase">Master Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-2.5 text-fg-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-bg-2 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-fg-0 focus:outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs font-mono transition-colors shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : isRegisterMode ? 'Create Account' : 'Authorize Terminal'}
              </button>

              <div className="flex items-center justify-between text-[11px] font-mono text-fg-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleFillAdmin}
                  className="text-accent hover:underline"
                >
                  Fill Default Admin Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setError(null);
                  }}
                  className="hover:text-fg-1"
                >
                  {isRegisterMode ? 'Already have account? Login' : 'Need account? Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
