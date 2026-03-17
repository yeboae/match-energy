'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import api from '../lib/api';
import ApplianceForm from './ApplianceForm';

const TYPE_COLORS = {
  cooling: '#38bdf8',
  heating: '#f97316',
  kitchen: '#a78bfa',
  entertainment: '#34d399',
  laundry: '#fbbf24',
  lighting: '#f9fafb',
  other: '#94a3b8',
};

const TYPE_ICONS = {
  cooling: '❄️', heating: '🔥', kitchen: '🍳',
  entertainment: '🖥️', laundry: '👕', lighting: '💡', other: '🔌',
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const rate = user?.ratePerKwh || 0.13;

  const fetchAppliances = async () => {
    try {
      const res = await api.get('/api/appliances');
      setAppliances(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppliances(); }, []);

  const filtered = useMemo(() => appliances.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || a.type === filterType;
    return matchSearch && matchType;
  }), [appliances, search, filterType]);

  const totalDailyKwh = useMemo(() =>
    appliances.reduce((sum, a) => sum + (a.wattage * a.hoursPerDay) / 1000, 0), [appliances]);
  const totalMonthlyKwh = totalDailyKwh * 30;
  const monthlyCost = totalMonthlyKwh * rate;

  const pieData = useMemo(() => {
    const byType = {};
    appliances.forEach(a => {
      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type] += (a.wattage * a.hoursPerDay * 30) / 1000;
    });
    return Object.entries(byType).map(([type, kwh]) => ({
      name: type, value: parseFloat(kwh.toFixed(1))
    }));
  }, [appliances]);

  const barData = useMemo(() =>
    [...appliances]
      .sort((a, b) => (b.wattage * b.hoursPerDay) - (a.wattage * a.hoursPerDay))
      .slice(0, 8)
      .map(a => ({
        name: a.name.length > 14 ? a.name.slice(0, 14) + '…' : a.name,
        kWh: parseFloat(((a.wattage * a.hoursPerDay * 30) / 1000).toFixed(1)),
        cost: parseFloat(((a.wattage * a.hoursPerDay * 30 * rate) / 1000).toFixed(2)),
      })), [appliances, rate]);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await api.put(`/api/appliances/${editing._id}`, formData);
      } else {
        await api.post('/api/appliances', formData);
      }
      setShowForm(false);
      setEditing(null);
      fetchAppliances();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this appliance?')) return;
    try {
      await api.delete(`/api/appliances/${id}`);
      fetchAppliances();
    } catch (err) {
      console.error(err);
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
            <span className="text-xs text-gray-600 hidden sm:block">
              ${rate.toFixed(2)}/kWh · {user.location}
            </span>
            <button onClick={onLogout} className="text-xs text-gray-500 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Your Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">
              {appliances.length} appliance{appliances.length !== 1 ? 's' : ''} tracked
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Daily Usage"
            value={`${totalDailyKwh.toFixed(1)} kWh`}
            sub="estimated consumption"
            accent="text-green-400"
          />
          <StatCard
            label="Monthly Usage"
            value={`${totalMonthlyKwh.toFixed(0)} kWh`}
            sub="30-day projection"
          />
          <StatCard
            label="Monthly Cost"
            value={`$${monthlyCost.toFixed(2)}`}
            sub={`@ $${rate}/kWh`}
            accent="text-yellow-400"
          />
          <StatCard
            label="Appliances"
            value={appliances.length}
            sub="currently tracked"
          />
        </div>

        {/* Charts */}
        {appliances.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pie */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Usage by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
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

            {/* Bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Appliances (kWh/mo)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#fff', fontSize: 12 }}
                    itemStyle={{ color: '#34d399', fontSize: 12 }}
                  />
                  <Bar dataKey="kWh" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Appliance List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          {/* Filters */}
          <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search appliances…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
            <select
              value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="all">All Types</option>
              {['cooling','heating','kitchen','entertainment','laundry','lighting','other'].map(t => (
                <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-600">Loading appliances…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🔌</div>
              <div className="text-gray-500 text-sm">
                {appliances.length === 0
                  ? 'No appliances yet. Add your first one to get started.'
                  : 'No appliances match your filter.'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtered.map(a => {
                const monthlyKwh = (a.wattage * a.hoursPerDay * 30) / 1000;
                const monthlyCostA = monthlyKwh * rate;
                const pct = totalMonthlyKwh > 0 ? (monthlyKwh / totalMonthlyKwh) * 100 : 0;
                return (
                  <div key={a._id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                    <div className="text-2xl w-8 text-center">{TYPE_ICONS[a.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{a.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.wattage}W · {a.hoursPerDay}h/day
                      </div>
                      {/* Usage bar */}
                      <div className="mt-2 h-1 bg-gray-800 rounded-full w-full max-w-xs">
                        <div
                          className="h-1 rounded-full bg-green-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold text-white">{monthlyKwh.toFixed(1)} kWh</div>
                      <div className="text-xs text-yellow-400">${monthlyCostA.toFixed(2)}/mo</div>
                    </div>
                    <div className="text-xs text-gray-600 hidden md:block w-12 text-right">
                      {pct.toFixed(0)}%
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => { setEditing(a); setShowForm(true); }}
                        className="text-gray-600 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="text-gray-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ApplianceForm
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          editing={editing}
        />
      )}
    </div>
  );
}
