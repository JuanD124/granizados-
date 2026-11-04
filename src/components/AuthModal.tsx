import React, { useState } from 'react';
import { Shield, User, Lock, KeyRound, AlertCircle, X, Check } from 'lucide-react';
import { AuthState, UserRole } from '../types';
import { verifyPin } from '../utils/billing';
import { sounds } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthState;
  onAuthenticate: (role: UserRole) => void;
  targetRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  auth,
  onAuthenticate,
  targetRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    targetRole || (auth.currentRole === 'empleado' ? 'administrador' : 'empleado')
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    sounds.playClick();
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleClear = () => {
    sounds.playClick();
    setPin('');
    setError(null);
  };

  const handleBackspace = () => {
    sounds.playClick();
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        sounds.playClick();
        setPin((prev) => (prev.length < 8 ? prev + e.key : prev));
        setError(null);
      } else if (e.key === 'Backspace') {
        sounds.playClick();
        setPin((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedRole, auth]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const isValid = verifyPin(selectedRole, pin, {
      employeePin: auth.employeePin,
      adminPin: auth.adminPin,
    });

    if (isValid) {
      sounds.playSuccess();
      onAuthenticate(selectedRole);
      setPin('');
      setError(null);
      onClose();
    } else {
      sounds.playWarning();
      setError(
        selectedRole === 'administrador'
          ? 'Clave de Administrador incorrecta'
          : 'Clave de Empleado incorrecta'
      );
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,242,254,0.25)] text-slate-100">
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-3 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            Control de Acceso Seguro
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa la clave de seguridad para autorizar el perfil
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setSelectedRole('empleado');
              setPin('');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === 'empleado'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Empleado / Cajero</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setSelectedRole('administrador');
              setPin('');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedRole === 'administrador'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Administrador</span>
          </button>
        </div>

        {/* PIN Display Input */}
        <div className="mb-6">
          <div className="relative">
            <div className="flex items-center justify-center h-14 bg-slate-900/90 border border-slate-700 rounded-2xl px-4 tracking-[0.5em] text-2xl font-mono text-cyan-400 shadow-inner">
              {pin ? '•'.repeat(pin.length) : (
                <span className="text-slate-600 tracking-normal text-sm font-sans">
                  Ingresa clave numérico
                </span>
              )}
            </div>
            <Lock className="absolute right-4 top-4.5 w-5 h-5 text-slate-500" />
          </div>

          {error && (
            <div className="flex items-center space-x-2 mt-2 text-rose-400 text-xs font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit.toString())}
              className="h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold text-lg hover:bg-cyan-950/40 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 font-bold text-xs hover:bg-slate-800 hover:text-white active:scale-95 transition-all"
          >
            BORRAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold text-lg hover:bg-cyan-950/40 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 font-bold text-xs hover:bg-slate-800 hover:text-white active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={pin.length === 0}
          className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg ${
            selectedRole === 'administrador'
              ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)]'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Check className="w-5 h-5" />
          <span>Acceder como {selectedRole === 'administrador' ? 'Administrador' : 'Empleado'}</span>
        </button>
      </div>
    </div>
  );
};
