'use client';
import { useState } from 'react';
import api from '../lib/api';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', ratePerKwh: '0.13', location: 'US Average' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, ratePerKwh: parseFloat(form.ratePerKwh), location: form.location };
      const res = await api.post(endpoint, payload);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-4xl">⚡</span>
            <h1 className="text-3xl font-bold text-white">Match Energy</h1>
          </div>
          <p className="text-gray-400 text-sm">Understand your electricity. Reduce your bill.</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handle}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                name="password" type="password" value={form.password} onChange={handle}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location</label>
                  <input
                    name="location" value={form.location} onChange={handle}
                    placeholder="e.g. New York, NY"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Electricity Rate ($/kWh)
                    <span className="ml-1 text-gray-600">— US avg is $0.13</span>
                  </label>
                  <input
                    name="ratePerKwh" type="number" step="0.01" value={form.ratePerKwh} onChange={handle}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Track your appliances. See your real costs.
        </p>
      </div>
    </div>
  );
}
