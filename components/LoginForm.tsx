
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { APP_BASE_URL } from '../constants';
import { Lock, Mail, Loader2, AlertCircle, LayoutGrid } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                // This redirects the user back to the Cloud Run URL (or localhost) after Supabase auth
                redirectTo: APP_BASE_URL,
                scopes: 'email openid profile',
            }
        });
        if (error) throw error;
    } catch (err: any) {
        console.error("Azure Login Error", err);
        setError(err.message || "Failed to connect to Microsoft");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
            <Lock className="text-yellow-500" size={32} />
          </div>
          <h2 className="serif text-3xl font-bold text-white">Admin Access</h2>
          <p className="text-zinc-500 text-sm mt-2">Sign in to manage the Velana Awards</p>
        </div>

        <div className="space-y-4">
           {/* Azure Button */}
           <button
            type="button"
            onClick={handleAzureLogin}
            disabled={loading}
            className="w-full bg-[#0078D4] hover:bg-[#006bbd] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <LayoutGrid size={20} />}
            Sign in with Microsoft
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs font-bold uppercase tracking-wider">Or using email</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="admin@velana.com"
                />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="••••••••"
                />
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In with Email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
