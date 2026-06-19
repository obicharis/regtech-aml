require('dotenv').config();
const express = require('express');
const cors = require('cors');
const riskLedgerRoutes = require('./routes/riskLedger');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'RegTech AML API running' });
});

app.use('/api/risk-ledger', riskLedgerRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
