'use client';
import { useState, useEffect } from 'react';

const PRESETS = {
  cooling: [
    { name: 'Window AC Unit', wattage: 1000 },
    { name: 'Central AC', wattage: 3500 },
    { name: 'Portable AC', wattage: 1400 },
    { name: 'Box Fan', wattage: 100 },
    { name: 'Ceiling Fan', wattage: 75 },
  ],
  heating: [
    { name: 'Space Heater', wattage: 1500 },
    { name: 'Electric Furnace', wattage: 10000 },
    { name: 'Electric Blanket', wattage: 200 },
    { name: 'Hair Dryer', wattage: 1875 },
  ],
  kitchen: [
    { name: 'Refrigerator', wattage: 150 },
    { name: 'Microwave', wattage: 1200 },
    { name: 'Dishwasher', wattage: 1800 },
    { name: 'Electric Oven', wattage: 2400 },
    { name: 'Coffee Maker', wattage: 1000 },
    { name: 'Toaster', wattage: 850 },
  ],
  entertainment: [
    { name: 'Desktop Computer', wattage: 400 },
    { name: 'Gaming PC', wattage: 600 },
    { name: 'Laptop', wattage: 65 },
    { name: 'TV (55")', wattage: 100 },
    { name: 'TV (32")', wattage: 50 },
    { name: 'Game Console', wattage: 150 },
  ],
  laundry: [
    { name: 'Washing Machine', wattage: 500 },
    { name: 'Electric Dryer', wattage: 5000 },
    { name: 'Clothes Iron', wattage: 1000 },
  ],
  lighting: [
    { name: 'LED Bulb', wattage: 10 },
    { name: 'CFL Bulb', wattage: 23 },
    { name: 'Incandescent Bulb', wattage: 60 },
    { name: 'LED Strip Lights', wattage: 30 },
  ],
  other: [
    { name: 'EV Charger (Level 2)', wattage: 7200 },
    { name: 'Pool Pump', wattage: 1500 },
    { name: 'Treadmill', wattage: 600 },
    { name: 'Custom Appliance', wattage: 0 },
  ],
};

const TYPE_LABELS = {
  cooling: '❄️ Cooling',
  heating: '🔥 Heating',
  kitchen: '🍳 Kitchen',
  entertainment: '🖥️ Entertainment',
  laundry: '👕 Laundry',
  lighting: '💡 Lighting',
  other: '🔌 Other',
};

export default function ApplianceForm({ onSave, onClose, editing }) {
  const [form, setForm] = useState({
    name: '', type: 'kitchen', wattage: '', hoursPerDay: ''
  });
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        type: editing.type,
        wattage: editing.wattage,
        hoursPerDay: editing.hoursPerDay,
      });
    }
  }, [editing]);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const applyPreset = (preset) => {
    setSelectedPreset(preset.name);
    setForm(f => ({ ...f, name: preset.name, wattage: preset.wattage || '' }));
  };

  const dailyKwh = form.wattage && form.hoursPerDay
    ? ((form.wattage * form.hoursPerDay) / 1000).toFixed(2)
    : null;

  const submit = () => {
    if (!form.name || !form.wattage || !form.hoursPerDay) return;
    onSave({
      ...form,
      wattage: parseFloat(form.wattage),
      hoursPerDay: parseFloat(form.hoursPerDay),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            {editing ? 'Edit Appliance' : 'Add Appliance'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setForm(f => ({ ...f, type: val })); setSelectedPreset(''); }}
                  className={`py-2 px-1 rounded-lg text-xs font-medium text-center transition-all ${
                    form.type === val
                      ? 'bg-green-500 text-gray-950'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS[form.type]?.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    selectedPreset === p.name
                      ? 'bg-green-500 text-gray-950 font-semibold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Appliance Name</label>
            <input
              name="name" value={form.name} onChange={handle}
              placeholder="e.g. Bedroom AC"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
            />
          </div>

          {/* Wattage + Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Wattage (W)</label>
              <input
                name="wattage" type="number" value={form.wattage} onChange={handle}
                placeholder="e.g. 1000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hours / Day</label>
              <input
                name="hoursPerDay" type="number" step="0.5" value={form.hoursPerDay} onChange={handle}
                placeholder="e.g. 8"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
          </div>

          {/* Live estimate */}
          {dailyKwh && (
            <div className="bg-green-950/40 border border-green-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{dailyKwh} kWh</div>
              <div className="text-xs text-gray-400 mt-1">estimated daily consumption</div>
              <div className="text-sm text-gray-300 mt-1">{(dailyKwh * 30).toFixed(1)} kWh / month</div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!form.name || !form.wattage || !form.hoursPerDay}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-gray-950 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {editing ? 'Save Changes' : 'Add Appliance'}
          </button>
        </div>
      </div>
    </div>
  );
}
