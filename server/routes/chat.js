const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Appliance = require('../models/Appliance');
const User = require('../models/User');

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/', auth, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const [appliances, user] = await Promise.all([
      Appliance.find({ user: req.user.id }),
      User.findById(req.user.id),
    ]);

    const rate = user?.ratePerKwh || 0.13;
    const location = user?.location || 'your area';

    const totalMonthlyKwh = appliances.reduce(
      (sum, a) => sum + (a.wattage * a.hoursPerDay * 30) / 1000, 0
    );
    const monthlyCost = (totalMonthlyKwh * rate).toFixed(2);

    const applianceList = appliances.length
      ? appliances
          .map(a => {
            const mo = ((a.wattage * a.hoursPerDay * 30) / 1000).toFixed(1);
            const cost = (parseFloat(mo) * rate).toFixed(2);
            return `- ${a.name} (${a.type}): ${a.wattage}W, ${a.hoursPerDay}h/day → ${mo} kWh/mo ($${cost}/mo)`;
          })
          .join('\n')
      : 'No appliances tracked yet.';

    const goalLine = user?.goalType && user?.goalValue
      ? user.goalType === 'kwh'
        ? `The user's monthly goal is ${user.goalValue} kWh. They are currently ${totalMonthlyKwh > user.goalValue ? `${(totalMonthlyKwh - user.goalValue).toFixed(0)} kWh OVER` : `${(user.goalValue - totalMonthlyKwh).toFixed(0)} kWh under`} their goal.`
        : `The user's monthly cost goal is $${user.goalValue}. They are currently ${monthlyCost > user.goalValue ? `$${(parseFloat(monthlyCost) - user.goalValue).toFixed(2)} OVER` : `$${(user.goalValue - parseFloat(monthlyCost)).toFixed(2)} under`} their goal.`
      : 'The user has not set a monthly goal yet.';

    const systemPrompt = `You are an energy assistant for Match Energy, a home energy monitoring app.
The user's electricity rate is $${rate}/kWh in ${location}.
Their total estimated monthly usage is ${totalMonthlyKwh.toFixed(0)} kWh costing $${monthlyCost}.
${goalLine}

Their tracked appliances:
${applianceList}

Answer energy-related questions helpfully and concisely. Give practical tips to reduce usage and costs based on their specific appliances. If they are over their goal, proactively suggest which appliances to cut back on. Keep responses under 120 words unless a longer explanation is clearly needed. Do not use markdown headers or bullet symbols.`;

    const chatHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(502).json({ error: data.error?.message || 'Groq API error' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
