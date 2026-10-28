'use client';
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

function LightningRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bolts = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight,
      speed: 1.5 + Math.random() * 3,
      size: 14 + Math.floor(Math.random() * 18),
      opacity: 0.15 + Math.random() * 0.5,
      wobble: (Math.random() - 0.5) * 0.4,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bolts.forEach(b => {
        ctx.font = `${b.size}px serif`;
        ctx.globalAlpha = b.opacity;
        ctx.fillText('⚡', b.x, b.y);
        b.y += b.speed;
        b.x += b.wobble;
        if (b.y > canvas.height + 30) {
          b.y = -30;
          b.x = Math.random() * canvas.width;
          b.speed = 1.5 + Math.random() * 3;
          b.opacity = 0.15 + Math.random() * 0.5;
        }
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

const STATE_MAP = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
  'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
  'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH',
  'Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District of Columbia':'DC'
};

async function getStateFromCoords(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'MatchEnergyApp/1.0' } }
  );
  const data = await res.json();
  const stateName = data?.address?.state;
  return { state: STATE_MAP[stateName] || null, stateName: stateName || null };
}

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '', password: '', ratePerKwh: '0.19', location: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [rateInfo, setRateInfo] = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    setRateInfo(null);
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = position.coords;
      const { state, stateName } = await getStateFromCoords(latitude, longitude);
      if (!state) throw new Error('Could not determine state');
      const rateRes = await api.get(`/api/rates/${state}`);
      const { ratePerKwh, rateCents, period, source } = rateRes.data;
      setForm(f => ({ ...f, location: stateName, ratePerKwh: ratePerKwh.toString() }));
      setRateInfo({ stateName, rateCents, period, source });
    } catch (err) {
      console.error('Location detection failed:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'register') detectLocation();
  }, [mode]);

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Email and password are required');
    if (mode === 'register' && form.password.length < 6) return setError('Password must be at least 6 characters');
    if (mode === 'register') {
      const rate = parseFloat(form.ratePerKwh);
      if (isNaN(rate) || rate <= 0 || rate > 5) return setError('Please enter a valid electricity rate between $0.01 and $5.00');
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, ratePerKwh: parseFloat(form.ratePerKwh), location: form.location || 'US Average' };
      const res = await api.post(endpoint, payload);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      <LightningRain />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Match Energy</h1>
          <p className="text-gray-400 text-sm">Stop getting finessed by your electric bill.</p>
        </div>

        <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded-2xl p-8">
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setRateInfo(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-green-500 text-gray-950' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

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
                  <div className="relative">
                    <input
                      name="location" value={form.location} onChange={handle}
                      placeholder={locationLoading ? 'Detecting your location...' : 'e.g. New York'}
                      disabled={locationLoading}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm disabled:opacity-60"
                    />
                    {locationLoading && (
                      <div className="absolute right-3 top-3">
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Electricity Rate ($/kWh)</label>
                  <input
                    name="ratePerKwh" type="number" step="0.01" value={form.ratePerKwh} onChange={handle}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  />

                  {rateInfo ? (
                    <div className="mt-2 bg-green-950/40 border border-green-800/40 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-green-400 text-xs">⚡</span>
                        <span className="text-xs font-semibold text-green-300">Real rate detected</span>
                        {rateInfo.source === 'EIA' && (
                          <span className="text-xs text-green-600 ml-auto">EIA · {rateInfo.period}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {rateInfo.rateCents}¢/kWh for {rateInfo.stateName}. You can edit this if your bill shows something different.
                      </p>
                    </div>
                  ) : !locationLoading && (
                    <p className="text-xs text-gray-600 mt-1">US avg is $0.19 — check your bill for your exact rate</p>
                  )}
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
            disabled={loading || locationLoading}
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