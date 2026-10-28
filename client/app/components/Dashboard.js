'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import ApplianceForm from './ApplianceForm';
import ChatWidget from './ChatWidget';

const TYPE_COLORS = {
  cooling: '#38bdf8', heating: '#f97316', kitchen: '#a78bfa',
  entertainment: '#34d399', laundry: '#fbbf24', lighting: '#f9fafb', other: '#94a3b8',
};
const TYPE_ICONS = {
  cooling: '❄️', heating: '🔥', kitchen: '🍳',
  entertainment: '🖥️', laundry: '👕', lighting: '💡', other: '🔌',
};

function getGrade(kwh) {
  if (kwh <= 0) return null;
  if (kwh < 450) return { grade: 'A', color: '#22c55e', label: 'Excellent', desc: 'Well below average' };
  if (kwh < 675) return { grade: 'B', color: '#84cc16', label: 'Good', desc: 'Below average' };
  if (kwh < 900) return { grade: 'C', color: '#eab308', label: 'Average', desc: 'Near US average' };
  if (kwh < 1350) return { grade: 'D', color: '#f97316', label: 'High', desc: 'Above average' };
  return { grade: 'F', color: '#ef4444', label: 'Very High', desc: 'Far above average' };
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function EditRateModal({ currentRate, homeId, onSave, onClose }) {
  const [value, setValue] = useState(currentRate.toString());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const rate = parseFloat(value);
    if (isNaN(rate) || rate <= 0 || rate > 5) {
      setError('Enter a rate between $0.01 and $5.00 per kWh');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/api/homes/${homeId}`, { ratePerKwh: rate });
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Update Electricity Rate</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <label className="block text-xs text-gray-400 mb-1">Your rate ($/kWh)</label>
        <input
          type="number" step="0.01" min="0.01" max="5" value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
        />
        <p className="text-xs text-gray-600 mt-1 mb-4">Check your electricity bill for your exact rate</p>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-lg text-sm transition-colors">
          {saving ? 'Saving…' : 'Save Rate'}
        </button>
      </div>
    </div>
  );
}

function SetGoalModal({ current, homeId, onSave, onClose }) {
  const [goalType, setGoalType] = useState(current?.goalType || 'cost');
  const [goalValue, setGoalValue] = useState(current?.goalValue?.toString() || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(goalValue);
    if (isNaN(val) || val <= 0) { setError('Enter a positive number'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/api/homes/${homeId}`, { goalType, goalValue: val });
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Set Monthly Goal</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex gap-2 mb-4">
          {['cost', 'kwh'].map(t => (
            <button key={t} onClick={() => setGoalType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${goalType === t ? 'bg-green-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {t === 'cost' ? '$ Monthly Cost' : 'kWh Usage'}
            </button>
          ))}
        </div>
        <label className="block text-xs text-gray-400 mb-1">
          {goalType === 'cost' ? 'Target monthly cost ($)' : 'Target monthly usage (kWh)'}
        </label>
        <input type="number" min="1" value={goalValue} onChange={e => setGoalValue(e.target.value)}
          placeholder={goalType === 'cost' ? 'e.g. 80' : 'e.g. 600'}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
        />
        <p className="text-xs text-gray-600 mt-1 mb-4">
          {goalType === 'cost' ? 'Check your past bills for a realistic target' : 'US average household uses ~900 kWh/mo'}
        </p>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-lg text-sm transition-colors">
          {saving ? 'Saving…' : 'Save Goal'}
        </button>
      </div>
    </div>
  );
}

function AddHomeModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Home name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/api/homes', {
        name: name.trim(),
        location: location.trim() || 'US Average',
        ratePerKwh: parseFloat(rate) || 0.13,
      });
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Add New Home</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Home Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Beach House"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Location (optional)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Florida"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Electricity Rate ($/kWh)</label>
            <input type="number" step="0.01" min="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 0.13"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm" />
            <p className="text-xs text-gray-600 mt-1">Leave blank to use US average (0.13)</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full mt-5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-lg text-sm transition-colors">
          {saving ? 'Creating…' : 'Create Home'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onLogout, onUserUpdate, homes, currentHome, onHomeChange, onHomesUpdate }) {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [simOff, setSimOff] = useState(new Set());
  const homeMenuRef = useRef(null);

  const rate = currentHome?.ratePerKwh || 0.13;

  const fetchAppliances = async () => {
    try {
      const res = await api.get('/api/appliances', { params: { homeId: currentHome._id } });
      setAppliances(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load appliances. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setAppliances([]);
    setSimOff(new Set());
    fetchAppliances();
  }, [currentHome._id]);

  // Close home menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (homeMenuRef.current && !homeMenuRef.current.contains(e.target)) {
        setShowHomeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSim = (id) => {
    setSimOff(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => appliances.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || a.type === filterType;
    return matchSearch && matchType;
  }), [appliances, search, filterType]);

  const totalDailyKwh = useMemo(() =>
    appliances.reduce((sum, a) => sum + (a.wattage * a.hoursPerDay) / 1000, 0), [appliances]);
  const totalMonthlyKwh = totalDailyKwh * 30;
  const monthlyCost = totalMonthlyKwh * rate;

  const simMonthlyKwh = useMemo(() =>
    appliances.filter(a => !simOff.has(a._id))
      .reduce((sum, a) => sum + (a.wattage * a.hoursPerDay * 30) / 1000, 0),
    [appliances, simOff]);
  const simSavingsKwh = totalMonthlyKwh - simMonthlyKwh;
  const simSavingsCost = monthlyCost - simMonthlyKwh * rate;

  const grade = useMemo(() => getGrade(totalMonthlyKwh), [totalMonthlyKwh]);
  const co2kg = (totalMonthlyKwh * 0.386).toFixed(1);
  const milesEquiv = Math.round(totalMonthlyKwh * 0.386 / 0.355);
  const treesNeeded = Math.ceil(totalMonthlyKwh * 0.386 / 1.75);

  const topInsight = useMemo(() => {
    if (appliances.length < 2) return null;
    const sorted = [...appliances].sort((a, b) => (b.wattage * b.hoursPerDay) - (a.wattage * a.hoursPerDay));
    const top = sorted[0], second = sorted[1];
    const topUsage = top.wattage * top.hoursPerDay;
    const secondUsage = second.wattage * second.hoursPerDay;
    if (secondUsage === 0 || topUsage / secondUsage < 1.5) return null;
    return {
      topName: top.name, secondName: second.name,
      ratio: (topUsage / secondUsage).toFixed(1),
      topCost: ((top.wattage * top.hoursPerDay * 30 * rate) / 1000).toFixed(2),
      secondCost: ((second.wattage * second.hoursPerDay * 30 * rate) / 1000).toFixed(2),
    };
  }, [appliances, rate]);

  const pieData = useMemo(() => {
    const byType = {};
    appliances.forEach(a => {
      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type] += (a.wattage * a.hoursPerDay * 30) / 1000;
    });
    return Object.entries(byType).map(([type, kwh]) => ({ name: type, value: parseFloat(kwh.toFixed(1)) }));
  }, [appliances]);

  const barData = useMemo(() =>
    [...appliances]
      .sort((a, b) => (b.wattage * b.hoursPerDay) - (a.wattage * a.hoursPerDay))
      .slice(0, 8)
      .map(a => ({
        name: a.name.length > 14 ? a.name.slice(0, 14) + '…' : a.name,
        kWh: parseFloat(((a.wattage * a.hoursPerDay * 30) / 1000).toFixed(1)),
      })), [appliances]);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await api.put(`/api/appliances/${editing._id}`, formData);
      } else {
        await api.post('/api/appliances', { ...formData, homeId: currentHome._id });
      }
      setShowForm(false);
      setEditing(null);
      fetchAppliances();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save appliance. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this appliance?')) return;
    try {
      await api.delete(`/api/appliances/${id}`);
      setSimOff(prev => { const next = new Set(prev); next.delete(id); return next; });
      fetchAppliances();
    } catch (err) {
      setError('Failed to delete appliance. Please try again.');
    }
  };

  const handleHomeUpdate = async (updatedHome) => {
    await onHomesUpdate();
    setShowRateModal(false);
    setShowGoalModal(false);
  };

  const handleAddHome = async (newHome) => {
    await onHomesUpdate();
    onHomeChange(newHome);
    setShowAddHomeModal(false);
  };

  const handleDeleteHome = async () => {
    if (!confirm(`Delete "${currentHome.name}" and all its appliances? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/homes/${currentHome._id}`);
      await onHomesUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete home');
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-white">
          <div className="font-semibold capitalize">{TYPE_ICONS[d.name]} {d.name}</div>
          <div className="text-green-400">{d.value} kWh/mo</div>
          <div className="text-gray-400">${(d.value * rate).toFixed(2)}/mo</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold text-white">Match Energy</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>

            {/* Home Selector */}
            <div className="relative" ref={homeMenuRef}>
              <button
                onClick={() => setShowHomeMenu(o => !o)}
                className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-green-400 transition-colors"
              >
                🏠 <span>{currentHome.name}</span>
                <span className="text-gray-500 text-xs">▾</span>
              </button>
              {showHomeMenu && (
                <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-xl py-1 min-w-52 shadow-2xl z-20">
                  {homes.map(h => (
                    <button
                      key={h._id}
                      onClick={() => { onHomeChange(h); setShowHomeMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        h._id === currentHome._id ? 'text-green-400' : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {h._id === currentHome._id && <span className="text-xs">✓</span>}
                        <span>{h.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">{h.location} · ${h.ratePerKwh}/kWh</div>
                    </button>
                  ))}
                  <div className="border-t border-gray-700 mt-1 pt-1">
                    <button
                      onClick={() => { setShowAddHomeModal(true); setShowHomeMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-gray-700 transition-colors"
                    >
                      + Add New Home
                    </button>
                    {homes.length > 1 && (
                      <button
                        onClick={() => { handleDeleteHome(); setShowHomeMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-700 transition-colors"
                      >
                        Delete "{currentHome.name}"
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRateModal(true)}
              className="text-xs text-gray-500 hover:text-green-400 transition-colors hidden sm:block"
              title="Edit electricity rate"
            >
              ${rate.toFixed(2)}/kWh
            </button>
            <button onClick={onLogout} className="text-xs text-gray-500 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700/60 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-400 ml-4 text-lg leading-none">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">{currentHome.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {currentHome.location} · {appliances.length} appliance{appliances.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            <span>+</span> Add Appliance
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Daily Usage" value={`${totalDailyKwh.toFixed(1)} kWh`} sub="estimated consumption" accent="text-green-400" />
          <StatCard label="Monthly Usage" value={`${totalMonthlyKwh.toFixed(0)} kWh`} sub="30-day projection" />
          <StatCard label="Monthly Cost" value={`$${monthlyCost.toFixed(2)}`} sub={`@ $${rate}/kWh`} accent="text-yellow-400" />
          <StatCard label="Appliances" value={appliances.length} sub="currently tracked" />
        </div>

        {/* Energy Grade + Carbon + Goal */}
        {appliances.length > 0 && grade && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Grade */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black shrink-0"
                style={{ border: `4px solid ${grade.color}`, color: grade.color, boxShadow: `0 0 20px ${grade.color}33` }}>
                {grade.grade}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Energy Grade</div>
                <div className="text-xl font-bold" style={{ color: grade.color }}>{grade.label}</div>
                <div className="text-xs text-gray-400 mt-1">{grade.desc} · US avg 900 kWh/mo</div>
                <div className="mt-2 h-1.5 bg-gray-800 rounded-full w-40">
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((totalMonthlyKwh / 1350) * 100, 100)}%`, backgroundColor: grade.color }} />
                </div>
              </div>
            </div>

            {/* Carbon */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-xs text-gray-500 mb-1">Monthly Carbon Footprint</div>
              <div className="text-3xl font-bold text-white">{co2kg} <span className="text-lg font-normal text-gray-400">kg CO₂</span></div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>🚗</span>
                  <span>≈ <strong className="text-white">{milesEquiv.toLocaleString()} miles</strong> driven</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>🌳</span>
                  <span><strong className="text-white">{treesNeeded} tree{treesNeeded !== 1 ? 's' : ''}</strong> to offset/mo</span>
                </div>
              </div>
            </div>

            {/* Goal */}
            {(() => {
              const hasGoal = currentHome?.goalType && currentHome?.goalValue;
              const current = currentHome?.goalType === 'kwh' ? totalMonthlyKwh : monthlyCost;
              const target = currentHome?.goalValue;
              const pct = hasGoal ? Math.min((current / target) * 100, 120) : 0;
              const over = hasGoal && current > target;
              const diff = hasGoal ? Math.abs(current - target) : 0;
              const barColor = !over ? '#22c55e' : pct > 110 ? '#ef4444' : '#f97316';
              return (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">Monthly Goal</div>
                    <button onClick={() => setShowGoalModal(true)} className="text-xs text-gray-600 hover:text-green-400 transition-colors">
                      {hasGoal ? 'Edit' : '+ Set Goal'}
                    </button>
                  </div>
                  {hasGoal ? (
                    <>
                      <div className="text-2xl font-bold text-white">
                        {currentHome.goalType === 'cost' ? `$${target}` : `${target} kWh`}
                        <span className="text-sm font-normal text-gray-500 ml-1">target</span>
                      </div>
                      <div className={`text-xs mt-1 font-medium ${over ? 'text-red-400' : 'text-green-400'}`}>
                        {currentHome.goalType === 'cost' ? `$${diff.toFixed(2)}` : `${diff.toFixed(0)} kWh`} {over ? 'over' : 'under'} goal
                      </div>
                      <div className="mt-3 h-2 bg-gray-800 rounded-full">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>0</span>
                        <span>{currentHome.goalType === 'cost' ? `$${target}` : `${target} kWh`}</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-center py-3">
                      <div className="text-3xl mb-2">🎯</div>
                      <p className="text-xs text-gray-500">Set a monthly kWh or cost target</p>
                      <button onClick={() => setShowGoalModal(true)}
                        className="mt-3 text-xs bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-4 py-1.5 rounded-lg transition-colors">
                        Set Goal
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* What If banner */}
        {simOff.size > 0 && (
          <div className="mb-6 bg-blue-950/40 border border-blue-700/50 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔮</span>
                <div>
                  <div className="text-blue-300 font-semibold text-sm">What If Simulator</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    Turning off {simOff.size} appliance{simOff.size !== 1 ? 's' : ''} would save{' '}
                    <strong className="text-white">{simSavingsKwh.toFixed(0)} kWh</strong> and{' '}
                    <strong className="text-green-400">${simSavingsCost.toFixed(2)}/mo</strong>
                    {' '}→ new bill <strong className="text-white">${(monthlyCost - simSavingsCost).toFixed(2)}/mo</strong>
                  </div>
                </div>
              </div>
              <button onClick={() => setSimOff(new Set())}
                className="text-xs text-blue-400 hover:text-white border border-blue-700/50 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors">
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Cost insight */}
        {topInsight && (
          <div className="mb-6 bg-yellow-950/30 border border-yellow-700/40 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">💡</span>
            <div>
              <span className="text-yellow-300 font-semibold text-sm">Cost insight: </span>
              <span className="text-gray-300 text-sm">
                Your <strong className="text-white">{topInsight.topName}</strong> costs{' '}
                <strong className="text-yellow-300">{topInsight.ratio}x more</strong> per month than your{' '}
                <strong className="text-white">{topInsight.secondName}</strong>{' '}
                <span className="text-gray-500">(${topInsight.topCost} vs ${topInsight.secondCost}/mo)</span>.
              </span>
            </div>
          </div>
        )}

        {/* Charts */}
        {appliances.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Usage by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {pieData.map(entry => <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[d.name] }} />
                    <span className="capitalize">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Appliances (kWh/mo)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff', fontSize: 12 }} itemStyle={{ color: '#34d399', fontSize: 12 }} />
                  <Bar dataKey="kWh" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Appliance List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search appliances…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
              <option value="all">All Types</option>
              {['cooling','heating','kitchen','entertainment','laundry','lighting','other'].map(t => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            {appliances.length > 0 && <div className="text-xs text-gray-500 hidden sm:block whitespace-nowrap">Toggle appliances to simulate savings</div>}
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-600">Loading appliances…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🔌</div>
              <div className="text-gray-500 text-sm">
                {appliances.length === 0 ? 'No appliances yet. Add your first one to get started.' : 'No appliances match your filter.'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(a => {
                const monthlyKwh = (a.wattage * a.hoursPerDay * 30) / 1000;
                const monthlyCostA = monthlyKwh * rate;
                const pct = totalMonthlyKwh > 0 ? (monthlyKwh / totalMonthlyKwh) * 100 : 0;
                const isOff = simOff.has(a._id);
                return (
                  <div key={a._id} className={`px-5 py-4 flex items-center gap-4 transition-colors ${isOff ? 'opacity-40' : 'hover:bg-gray-800/50'}`}>
                    <div className="text-2xl w-8 text-center">{TYPE_ICONS[a.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isOff ? 'line-through text-gray-500' : 'text-white'}`}>{a.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{a.wattage}W · {a.hoursPerDay}h/day</div>
                      <div className="mt-2 h-1 bg-gray-800 rounded-full w-full max-w-xs">
                        <div className="h-1 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold text-white">{monthlyKwh.toFixed(1)} kWh</div>
                      <div className="text-xs text-yellow-400">${monthlyCostA.toFixed(2)}/mo</div>
                    </div>
                    <div className="text-xs text-gray-600 hidden md:block w-12 text-right">{pct.toFixed(0)}%</div>
                    <button onClick={() => toggleSim(a._id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                        isOff ? 'border-gray-600 text-gray-500 bg-gray-800' : 'border-blue-700/50 text-blue-400 hover:bg-blue-900/30'
                      }`}>
                      {isOff ? 'OFF' : 'ON'}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(a); setShowForm(true); }}
                        className="text-gray-600 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(a._id)}
                        className="text-gray-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ApplianceForm onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} editing={editing} />
      )}
      {showRateModal && (
        <EditRateModal currentRate={rate} homeId={currentHome._id} onSave={handleHomeUpdate} onClose={() => setShowRateModal(false)} />
      )}
      {showGoalModal && (
        <SetGoalModal current={currentHome} homeId={currentHome._id} onSave={handleHomeUpdate} onClose={() => setShowGoalModal(false)} />
      )}
      {showAddHomeModal && (
        <AddHomeModal onSave={handleAddHome} onClose={() => setShowAddHomeModal(false)} />
      )}

      <ChatWidget />
    </div>
  );
}
