import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, EyeOff, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { localStorageService, AuthUser } from '../../lib/localStorageService';
import { supabase } from '../../lib/supabase';

interface AuthLayoutProps {
  onAuthSuccess?: (user: AuthUser) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isLogin = authMode === 'login';
  const isSignup = authMode === 'signup';

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignup) {
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      if (supabase) {
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

          if (error) throw error;

          if (data.user) {
            const user: AuthUser = {
              id: data.user.id,
              email: data.user.email || formData.email.trim(),
              fullName: data.user.user_metadata?.full_name || '',
            };
            localStorageService.setSession(user);
            toast.success(`Welcome back, ${user.fullName || user.email.split('@')[0]}!`);
            if (onAuthSuccess) onAuthSuccess(user);
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: formData.email.trim(),
            password: formData.password,
            options: {
              data: {
                full_name: formData.fullName.trim(),
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            const user: AuthUser = {
              id: data.user.id,
              email: data.user.email || formData.email.trim(),
              fullName: formData.fullName.trim(),
            };
            localStorageService.setSession(user);

            if (!data.session) {
              toast.success('Registration successful! Please check your email to confirm your account, or sign in.');
            } else {
              toast.success('Account created and signed in with Supabase!');
              if (onAuthSuccess) onAuthSuccess(user);
            }
          }
        }
      } else {
        // Fallback to table auth if Supabase credentials are not present
        if (isLogin) {
          const user = await localStorageService.signIn(formData.email, formData.password);
          toast.success(`Welcome back, ${user.fullName || user.email.split('@')[0]}!`);
          if (onAuthSuccess) onAuthSuccess(user);
        } else {
          const user = await localStorageService.signUp(formData.email, formData.password, formData.fullName);
          toast.success('Account created successfully in database!');
          if (onAuthSuccess) onAuthSuccess(user);
        }
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Authentication failed. Please check credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrors({});
    try {
      const demoUser: AuthUser = {
        id: 'demo-trader-uuid-101',
        email: 'demo@tradex.pro',
        fullName: 'Demo Trader',
      };
      localStorageService.setSession(demoUser);
      toast.success('Signed in as Demo Trader!');
      if (onAuthSuccess) onAuthSuccess(demoUser);
    } catch (err: any) {
      setErrors({ general: err.message || 'Demo login failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-gradient-to-br from-primary via-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp className="w-8 h-8 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text-primary glow-text mb-1">TradeX</h1>
          <p className="text-sm text-text-secondary">
            {isLogin ? 'Sign in to access your trading journal' : 'Create your trader profile'}
          </p>
        </motion.div>

        <motion.div
          className="glass-card p-7 sm:p-8 border border-border"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-4 py-2.5 bg-background-card border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary text-sm transition-all"
                  placeholder="e.g. Alex Morgan"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-2.5 bg-background-card border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary text-sm transition-all"
                placeholder="trader@domain.com"
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 bg-background-card border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary text-sm transition-all"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 p-1 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
            </div>

            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 bg-background-card border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary text-sm transition-all"
                    placeholder="Repeat password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>}
              </div>
            )}

            {errors.general && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-danger/10 border border-danger/20 rounded-xl"
              >
                <p className="text-xs text-danger">{errors.general}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-black font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center text-sm"
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
            >
              {loading ? (
                <LoadingSpinner size="sm" className="text-black" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Trader Account'
              )}
            </motion.button>

            {/* Quick Demo Mode */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background-card px-2 text-text-muted">Or Explore Instantly</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-primary text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Demo Access
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(isLogin ? 'signup' : 'login');
                  setErrors({});
                  setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
                }}
                className="text-xs text-text-muted hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <span className="text-primary font-semibold">{isLogin ? 'Sign Up' : 'Log In'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};
