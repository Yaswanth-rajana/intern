import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Wind, Lock, User, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import loginBanner from '../../assets/login_banner.png';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setLocalError('Please enter your username');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    await login(username, password);
  };

  const errorMsg = localError || apiError;

  return (
    <div className="min-h-screen w-full flex bg-neutral-950 text-neutral-100 font-sans overflow-hidden">

      {/* LEFT SECTION: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative z-10 bg-neutral-950/80 backdrop-blur-xl">

        {/* Top Brand Bar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Wind className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-wide text-white">AeroSense</span>
        </div>

        {/* Center Login Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight">
                Welcome back
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Sign in to your AeroSense dashboard and monitor your indoor environment in real time.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    className="w-full pl-10 pr-4 py-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-neutral-600"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-11 py-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-900 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Platform Operational</span>
          </div>
          <span>AeroSense &copy; {new Date().getFullYear()}</span>
        </div>

      </div>

      {/* RIGHT SECTION: Image Banner & Feature Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 items-center justify-center overflow-hidden border-l border-neutral-800/60">

        {/* Background Image */}
        <img
          src={loginBanner}
          alt="AeroSense Air Quality Platform Showcase"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-85 scale-105 transition-transform duration-1000 hover:scale-100"
        />

        {/* Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-transparent to-transparent w-1/3"></div>

        {/* Floating Content Card at Bottom */}
        <div className="absolute bottom-12 left-12 right-12 z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 bg-primary/20 text-primary-light border border-primary/30 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Real-Time Telemetry
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role Secured
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Advanced Indoor Air Quality Intelligence
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Continuous MQTT sensor streams, dynamic AQI index calculation, custom threshold alerts, and fine-grained administrative access controls.
              </p>
            </div>
          </motion.div>
        </div>

      </div>

    </div>
  );
}
