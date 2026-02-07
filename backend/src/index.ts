// PayCycle Backend API
// TODO: Blue Belt — Implement
//
// Routes:
// POST /api/plans/:id/metadata   — Store plan description, image
// GET  /api/plans/:id/metadata   — Get plan metadata
// POST /api/users                — Register user profile
// GET  /api/users/:address       — Get user profile
// POST /api/feedback             — Submit feedback
// GET  /api/metrics              — Protocol metrics (Black Belt)
// POST /api/webhooks/payment     — Webhook for payment events

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "paycycle-api" });
});

// TODO: Add routes at Blue Belt

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PayCycle API running on port ${PORT}`);
});
