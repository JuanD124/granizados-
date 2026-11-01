import React, { useState } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuthState, UserRole } from '../types';
import { verifyLoginCredentials } from '../utils/billing';
import { sounds } from '../utils/audio';
import { SlushCupIcon } from './SlushCupIcon';

interface LoginScreenProps {
  auth: AuthState;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ auth, onLoginSuccess }) => {
  // Completely empty by default as requested
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedPass && !trimmedUser) {
      sounds.playWarning();
      setErrorMessage('Por favor ingresa usuario y contraseña (o clave 4321 para Admin, 1234 para Empleado).');
      return;
    }

    const result = verifyLoginCredentials(trimmedUser, trimmedPass, {
      employeeUser: auth.employeeUser || 'empleado',
      adminUser: auth.adminUser || 'administrador',
      employeePin: auth.employeePin || '1234',
      adminPin: auth.adminPin || '4321',
    });

    if (result.success && result.role) {
      sounds.playSuccess();
      onLoginSuccess(result.role);
    } else {
      sounds.playWarning();
      setErrorMessage(
        result.error ||
          'Credenciales incorrectas. Para Administrador usa usuario "administrador" y contraseña "4321".'
      );
    }
  };

  const handleQuickFill = (role: 'admin' | 'empleado') => {
    sounds.playClick();
    if (role === 'admin') {
      setUsername('administrador');
      setPassword('4321');
    } else {
      setUsername('empleado');
      setPassword('1234');
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient Neon Lighting Background */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-slate-950/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.2)] backdrop-blur-xl">
        {/* Brand Logo with Slush Cup and Straw */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-600/20 to-fuchsia-600/20 p-1 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,242,254,0.4)] mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <SlushCupIcon size={48} className="w-12 h-12" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-fuchsia-400 drop-shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            ICE GRANIZADOS
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
            Sistema de Facturación & Control de Insumos
          </p>
        </div>

        {/* Clean Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input (starts completely blank) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Usuario:
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="administrador o empleado"
                autoComplete="username"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password Input (starts completely blank, no hints) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Contraseña:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="4321 (admin) o 1234 (empleado)"
                autoComplete="current-password"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-medium flex items-start space-x-2 animate-shake shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>INICIAR SESIÓN</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Collapsible Helper for credentials */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-[11px] text-cyan-400/80 hover:text-cyan-300 underline underline-offset-4 transition-colors"
            >
              {showHelp ? 'Ocultar ayuda de claves' : '¿Ayuda para iniciar sesión?'}
            </button>

            {showHelp && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-fuchsia-400">👑 Administrador</p>
                    <p className="text-slate-400 text-[11px]">Usuario: <span className="text-slate-200 font-mono">administrador</span></p>
                    <p className="text-slate-400 text-[11px]">Clave: <span className="text-slate-200 font-mono">4321</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40 hover:bg-fuchsia-600/50"
                  >
                    Usar
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-cyan-400">👤 Empleado</p>
                    <p className="text-slate-400 text-[11px]">Usuario: <span className="text-slate-200 font-mono">empleado</span></p>
                    <p className="text-slate-400 text-[11px]">Clave: <span className="text-slate-200 font-mono">1234</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('empleado')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/50"
                  >
                    Usar
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
