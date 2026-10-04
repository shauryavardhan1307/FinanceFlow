import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { HiSparkles, HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, googleAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      await googleAuth(credentialResponse.credential);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden selection:bg-accent-primary/30">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md p-8 sm:p-10 mx-4 bg-white rounded-3xl animate-slide-up border border-border shadow-xl shadow-black/5">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-accent-primary text-white shadow-lg shadow-accent-primary/20">
            <HiSparkles className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-display font-bold text-text-primary">
            Welcome Back
          </h2>
          <p className="mt-2 text-text-secondary">Sign in to continue to FinanceFlow</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-text-secondary">Email Address</label>
            <div className="relative">
              <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-input border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-input border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex justify-end mt-2">
              <a href="#" className="text-xs font-medium text-accent-primary hover:text-accent-secondary transition-colors">
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/90 hover:to-accent-secondary/90 shadow-lg shadow-accent-primary/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-border-hover border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-border w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-text-secondary uppercase">Or continue with</span>
          <span className="border-b border-border w-1/5 lg:w-1/4"></span>
        </div>
        
        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              toast.error('Google Login Failed');
            }}
            theme="filled_black"
            shape="pill"
            size="large"
          />
        </div>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-accent-primary hover:text-accent-secondary transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
