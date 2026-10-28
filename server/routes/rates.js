const express = require('express');
const router = express.Router();

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

// GET /api/rates/:state
router.get('/:state', async (req, res) => {
  try {
    const state = req.params.state.toUpperCase();
    if (!STATE_NAMES[state]) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    const apiKey = process.env.EIA_API_KEY;
    const url =
      `https://api.eia.gov/v2/electricity/retail-sales/data/` +
      `?api_key=${apiKey}` +
      `&frequency=monthly` +
      `&data[0]=price` +
      `&facets[sectorid][]=RES` +
      `&facets[stateid][]=${state}` +
      `&sort[0][column]=period` +
      `&sort[0][direction]=desc` +
      `&length=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`EIA API returned ${response.status}`);
    }
    const data = await response.json();

    const record = data?.response?.data?.[0];
    if (!record || record.price == null) {
      return res.status(404).json({ error: 'Rate data not available for this state' });
    }

    const rateCents = parseFloat(record.price); // EIA returns cents/kWh
    const ratePerKwh = +(rateCents / 100).toFixed(4);

    res.json({
      state,
      stateName: STATE_NAMES[state],
      ratePerKwh,
      rateCents: rateCents.toFixed(1),
      period: record.period,
      source: 'EIA'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch electricity rate data' });
  }
});

module.exports = router;
