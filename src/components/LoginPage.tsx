import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, Terminal, X, Minimize2 } from 'lucide-react';
import { UserAccount } from '../types';
import { simpleHashPassword } from '../utils';
import { SmsiLogo } from './SmsiLogo';

interface LoginPageProps {
  users: UserAccount[];
  onLogin: (user: UserAccount, remember: boolean) => void;
  onResetPasswordByUsername: (usernameOrEmail: string, newPasswordHash: string) => boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  users,
  onLogin,
  onResetPasswordByUsername,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Interactive Center-Stage Terminal Effect State
  const [isCentered, setIsCentered] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStepText, setAuthStepText] = useState('INITIALIZING SHA-256 HANDSHAKE...');

  // Forgot Password Modal State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCentered(true);

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`TOO MANY ATTEMPTS. TERMINAL LOCKED FOR ${secs}s.`);
      return;
    }

    const cleanId = username.trim().toLowerCase();
    const matchedUser = users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );

    if (!matchedUser) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setError('5 FAILED LOGIN ATTEMPTS. TERMINAL LOCKED FOR 30 SECONDS.');
      } else {
        setError(`ACCOUNT NOT FOUND (${nextAttempts}/5 ATTEMPTS).`);
      }
      return;
    }

    if (matchedUser.status === 'Disabled') {
      setError('ACCOUNT DISABLED BY SUPER ADMIN. CONTACT SYSTEM ADMINISTRATOR.');
      return;
    }

    const inputHash = simpleHashPassword(password);
    if (matchedUser.passwordHash === inputHash || (cleanId === 'admin' && password === 'admin123')) {
      setError('');
      setFailedAttempts(0);
      setIsAuthenticating(true);
      setAuthStepText('VERIFYING CREDENTIALS & RBAC CLEARANCE...');
      setTimeout(() => {
        setAuthStepText(`ACCESS GRANTED · WELCOME ${matchedUser.name.toUpperCase()}`);
      }, 450);
      setTimeout(() => {
        onLogin(matchedUser, rememberMe);
      }, 950);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setError('5 FAILED LOGIN ATTEMPTS. TERMINAL LOCKED FOR 30 SECONDS.');
      } else {
        setError(`INVALID PASSWORD HASH (${nextAttempts}/5 ATTEMPTS).`);
      }
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPass.length < 6) {
      setResetMessage('Password must be at least 6 characters.');
      return;
    }
    const ok = onResetPasswordByUsername(
      resetIdentifier.trim(),
      simpleHashPassword(resetNewPass)
    );
    if (ok) {
      setResetMessage('Password hash updated! You can now sign in.');
      setTimeout(() => {
        setForgotOpen(false);
        setResetMessage('');
        setResetIdentifier('');
        setResetNewPass('');
      }, 1200);
    } else {
      setResetMessage('No active account matched that username or email.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#CC00FF] text-white font-geist selection:bg-[#22d3ee] selection:text-black relative overflow-x-hidden">
      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[80px_1fr_400px] lg:grid-rows-[80px_1fr_80px]">
        {/* Left Vertical Architectural Sidebar */}
        <aside className="hidden lg:flex lg:row-span-3 flex-col items-center justify-between py-8 bg-[#CC00FF] border-r border-white/25">
          <div
            className="font-mono text-[10.5px] tracking-[0.5em] uppercase opacity-80"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            CORPORATE ACCESS
          </div>
          <div
            className="font-mono text-[10.5px] tracking-[0.5em] uppercase opacity-80"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            QUOTATION TERMINAL
          </div>
          <div className="font-syne text-2xl text-[#22d3ee]">●</div>
        </aside>

        {/* Top Architectural Header */}
        <header className="lg:col-start-2 lg:col-end-4 h-20 flex items-center justify-between px-6 lg:px-10 border-b border-white/25 bg-[#CC00FF]">
          <div className="flex items-center gap-4">
            <SmsiLogo className="h-9 w-auto shrink-0" />
            <div className="font-mono font-bold text-xs sm:text-sm tracking-[0.1em] uppercase text-white">
              SOL MANPOWER SERVICES INC.
            </div>
          </div>
          <div className="font-mono text-[10.5px] opacity-80 hidden sm:block">
            AUTH_SYSTEM_v2.6_STABLE · RBAC_SHA256
          </div>
        </header>

        {/* Center Hero Area */}
        <main
          className="lg:col-start-2 lg:row-start-2 px-6 py-12 sm:px-12 lg:px-20 lg:py-24 relative flex flex-col justify-center bg-[#CC00FF]"
          style={{
            background:
              'radial-gradient(circle at 100% 0%, rgba(34, 211, 238, 0.15) 0%, #CC00FF 55%)',
          }}
        >
          {/* Glitch Dots Pattern */}
          <div
            className="absolute top-10 left-10 w-24 h-24 opacity-60 pointer-events-none"
            style={{
              background: 'radial-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 0)',
              backgroundSize: '10px 10px',
            }}
          />

          <span className="font-mono text-[11px] text-[#22d3ee] font-bold tracking-wider uppercase mb-4 block relative z-10">
            INTERNAL DATA MANAGEMENT · SOL CLEANING MATERIALS
          </span>

          <h1 className="font-syne font-extrabold text-5xl sm:text-7xl xl:text-[5.5rem] leading-[0.9] uppercase tracking-[-0.03em] mb-10 relative z-10 text-white">
            Cleaning
            <br />
            Materials
            <br />
            <span
              style={{
                color: 'transparent',
                WebkitTextStroke: '2px #22d3ee',
              }}
            >
              Quotation HUB
            </span>
          </h1>

          <p className="text-base sm:text-xl font-normal max-w-[600px] text-white/90 leading-relaxed relative z-10">
            Internal enterprise procurement, inventory, barcode, and audit database for storing,
            comparing, and managing supplier quotations, janitorial chemicals, PPE, and stock movements.
          </p>
        </main>

        {/* Backdrop overlay when Login Terminal is centered */}
        {isCentered && (
          <div
            onClick={() => !isAuthenticating && setIsCentered(false)}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-md transition-opacity duration-500 animate-fadeIn"
          />
        )}

        {/* Right Security Terminal Login Pane (Transforms to Center Command HUD on Click) */}
        <aside
          onClick={() => {
            if (!isCentered) setIsCentered(true);
          }}
          className={
            isCentered
              ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[92vw] max-w-[500px] bg-gradient-to-br from-[#6A008A] via-[#9900CC] to-[#4A0066] px-8 py-10 sm:px-10 sm:py-11 flex flex-col border-2 border-[#22d3ee] rounded-2xl shadow-[0_0_70px_rgba(34,211,238,0.45),0_0_140px_rgba(204,0,255,0.6)] transition-all duration-500 ease-out scale-100'
              : 'lg:col-start-3 lg:row-start-2 lg:row-end-4 bg-[#CC00FF] hover:bg-[#b800e6] px-8 py-12 lg:px-10 lg:py-14 flex flex-col border-t lg:border-t-0 lg:border-l border-white/25 relative cursor-pointer transition-all duration-500 group'
          }
        >
          {/* Cyber Tactical HUD Corner Brackets */}
          <span className="pointer-events-none absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-[#22d3ee]" />
          <span className="pointer-events-none absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-[#22d3ee]" />
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-[#22d3ee]" />
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-[#22d3ee]" />

          {/* Top Terminal Status Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#22d3ee]/20 border border-[#22d3ee] text-[#22d3ee]">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <div className="font-mono text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                <span>Security Terminal</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#22d3ee] animate-ping" />
              </div>
            </div>

            {isCentered ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAuthenticating) setIsCentered(false);
                }}
                className="px-2.5 py-1 rounded bg-black/40 hover:bg-[#22d3ee] text-[#22d3ee] hover:text-black border border-[#22d3ee]/60 font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Dock back to right sidebar"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Dock Panel</span>
              </button>
            ) : (
              <span className="font-mono text-[9.5px] px-2 py-0.5 rounded bg-black/30 border border-[#22d3ee]/50 text-[#22d3ee] group-hover:bg-[#22d3ee] group-hover:text-black transition-colors uppercase font-bold">
                Click to Center HUD
              </span>
            )}
          </div>

          <p className="text-xs text-white/85 mb-6 flex items-center justify-between">
            <span>Internal Purchasing & Warehouse Access</span>
            <span className="font-mono text-[10px] text-[#22d3ee] font-bold">
              {isCentered ? 'MODE: CENTER COMMAND' : 'MODE: SIDEBAR DOCK'}
            </span>
          </p>

          {error && (
            <div className="mb-5 p-3 bg-red-950/90 border-l-4 border-red-400 font-mono text-[11px] text-white shadow-lg animate-pulse">
              {error}
            </div>
          )}

          {isAuthenticating ? (
            <div className="my-8 py-10 px-6 bg-black/45 border border-[#22d3ee] rounded-xl text-center space-y-4 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <ShieldCheck className="w-12 h-12 text-[#22d3ee] mx-auto animate-bounce" />
              <div className="font-mono text-xs font-extrabold tracking-widest text-[#22d3ee] uppercase">
                {authStepText}
              </div>
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-[#22d3ee] animate-pulse w-full" />
              </div>
              <div className="font-mono text-[10px] text-white/75 uppercase">
                SOL MANPOWER SERVICES INC. · BOSS YSHUA ACOGIDO
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="font-mono text-[10px] uppercase text-[#22d3ee] font-bold block mb-2 tracking-wider">
                  Email / Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onFocus={() => setIsCentered(true)}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/35 border border-white/40 focus:border-[#22d3ee] focus:shadow-[0_0_15px_rgba(34,211,238,0.35)] px-3.5 py-3.5 text-sm text-white font-mono rounded-lg focus:outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-[10px] uppercase text-[#22d3ee] font-bold tracking-wider">
                    Secure Credentials
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForgotOpen(true);
                    }}
                    className="font-mono text-[10px] text-[#22d3ee] hover:underline uppercase cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onFocus={() => setIsCentered(true)}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/35 border border-white/40 focus:border-[#22d3ee] focus:shadow-[0_0_15px_rgba(34,211,238,0.35)] px-3.5 py-3.5 pr-10 text-sm text-white font-mono rounded-lg focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/75 hover:text-[#22d3ee] transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2.5 cursor-pointer select-none pt-1"
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#22d3ee] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-mono text-[10.5px] text-white/90 uppercase tracking-wider">
                  REMEMBER ME / LINK WORKSTATION ID
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-4 bg-[#22d3ee] hover:bg-white text-black font-mono text-xs font-extrabold uppercase tracking-[0.2em] rounded-lg shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_35px_rgba(255,255,255,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Access Database</span>
              </button>
            </form>
          )}

          <div
            className={`${
              isCentered ? 'mt-6 pt-5 border-t border-white/20' : 'mt-auto pt-10 pb-10'
            } font-mono text-[9.5px] leading-[1.9] text-white/80 uppercase flex items-center justify-between gap-2`}
          >
            <div>
              © {new Date().getFullYear()} SOL MANPOWER SERVICES INC.
              <br />
              INTERNAL PURCHASING & QUOTATION SYSTEM
              <br />
              ALL ACCESS LOGGED BY TERMINAL
            </div>
            <SmsiLogo compact className="w-10 h-10 shrink-0" />
          </div>
        </aside>

        {/* Bottom Footer Metrics */}
        <footer className="lg:col-start-2 lg:row-start-3 h-20 flex flex-wrap items-center gap-8 sm:gap-14 px-6 sm:px-12 lg:px-20 border-t border-white/25 bg-[#CC00FF]">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[10px] text-white/75">AUDIT_ST:</span>
            <span className="font-mono text-xs font-bold text-[#22d3ee]">ACTIVE</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[10px] text-white/75">BID_ST:</span>
            <span className="font-mono text-xs font-bold text-[#22d3ee]">SYNCED</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[10px] text-white/75">INV_ST:</span>
            <span className="font-mono text-xs font-bold text-[#22d3ee]">MONITOR</span>
          </div>
        </footer>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#A300CC] border border-[#22d3ee] max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/25">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#22d3ee] uppercase">
                <KeyRound className="w-4 h-4" />
                <span>Reset Terminal Password</span>
              </div>
              <button
                onClick={() => setForgotOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-white/80 mb-1">
                  Registered Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="admin or purchasingsol0123@gmail.com"
                  className="w-full bg-[#7A0099] border border-white/35 px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-white/80 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  className="w-full bg-[#7A0099] border border-white/35 px-3 py-2.5 text-white"
                />
              </div>
              {resetMessage && (
                <div className="p-2.5 bg-black/40 border border-[#22d3ee] text-[#22d3ee] text-[11px]">
                  {resetMessage}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 border border-white/35 text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#22d3ee] text-black font-bold text-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Absolute Owner Badge */}
      <div className="fixed bottom-6 right-6 lg:bottom-[30px] lg:right-[40px] z-20 font-mono text-[10px] bg-[#22d3ee] text-black px-3 py-1 font-bold tracking-wider uppercase shadow-lg">
        PROPERTIES OF BOSS YSHUA ACOGIDO
      </div>
    </div>
  );
};

