import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Wind, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!username.trim()) {
      setLocalError('Please enter username');
      return;
    }
    if (!password) {
      setLocalError('Please enter password');
      return;
    }

    await login(username, password);
  };

  const handlePresetLogin = async (userPreset, passPreset) => {
    setLocalError('');
    clearError();
    setUsername(userPreset);
    setPassword(passPreset);
    await login(userPreset, passPreset);
  };

  const errorMsg = localError || apiError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-[#1a1f2e] to-neutral-900 p-6">
      
      {/* Dynamic particles or visual background */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 z-10"
      >
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-3">
            <Wind className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Welcome to AeroSense</h1>
          <p className="text-neutral-500 text-sm mt-1 text-center">Indoor Air Quality Monitoring Platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-danger/10 text-danger p-3 rounded-lg border border-danger/20 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username" 
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-[14px] font-medium outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-[14px] font-medium outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-neutral-400 font-bold tracking-wider">Quick Presets</span>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePresetLogin('admin', 'admin123')}
            className="flex flex-col items-center justify-center p-3.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-xl text-left transition-all group"
          >
            <span className="text-[13px] font-bold text-primary">Admin Account</span>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Read & Write Access</span>
          </button>
          <button
            type="button"
            onClick={() => handlePresetLogin('viewer', 'viewer123')}
            className="flex flex-col items-center justify-center p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-all group"
          >
            <span className="text-[13px] font-bold text-neutral-700">Viewer Account</span>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Read-Only Access</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
