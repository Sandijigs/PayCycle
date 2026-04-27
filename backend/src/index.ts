import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { planMetadataDb, usersDb, feedbackDb } from "./db";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
}));
app.use(express.json());

// ─── Health ──────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "paycycle-api", timestamp: new Date().toISOString() });
});

// ─── Plan Metadata ───────────────────────────────────────

app.post("/api/plans/:id/metadata", (req, res) => {
  const planId = Number(req.params.id);
  if (isNaN(planId) || planId < 1) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const { description, image_url } = req.body;
  if (!description && !image_url) {
    res.status(400).json({ error: "Provide at least description or image_url" });
    return;
  }

  planMetadataDb.upsert(planId, description || null, image_url || null);

  const metadata = planMetadataDb.get(planId);
  res.json({ success: true, metadata });
});

app.get("/api/plans/:id/metadata", (req, res) => {
  const planId = Number(req.params.id);
  if (isNaN(planId) || planId < 1) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const metadata = planMetadataDb.get(planId);
  if (!metadata) {
    res.status(404).json({ error: "No metadata found for this plan" });
    return;
  }

  res.json(metadata);
});

// ─── Users ───────────────────────────────────────────────

app.post("/api/users", (req, res) => {
  const { address, display_name, role } = req.body;

  if (!address || typeof address !== "string" || !address.startsWith("G") || address.length !== 56) {
    res.status(400).json({ error: "Invalid Stellar address" });
    return;
  }
  if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
    res.status(400).json({ error: "display_name is required" });
    return;
  }

  const validRoles = ["merchant", "subscriber"];
  const userRole = validRoles.includes(role) ? role : "subscriber";

  usersDb.upsert(address, display_name.trim(), userRole);

  const user = usersDb.get(address);
  res.json({ success: true, user });
});

app.get("/api/users/:address", (req, res) => {
  const { address } = req.params;

  if (!address.startsWith("G") || address.length !== 56) {
    res.status(400).json({ error: "Invalid Stellar address" });
    return;
  }

  const user = usersDb.get(address);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// ─── Feedback ────────────────────────────────────────────

app.post("/api/feedback", (req, res) => {
  const { address, category, message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.trim().length > 2000) {
    res.status(400).json({ error: "message must be under 2000 characters" });
    return;
  }

  const validCategories = ["general", "bug", "feature", "ux"];
  const feedbackCategory = validCategories.includes(category) ? category : "general";

  feedbackDb.insert(address || null, feedbackCategory, message.trim());

  res.status(201).json({ success: true });
});

app.get("/api/feedback", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const items = feedbackDb.list(limit, offset);
  const total = feedbackDb.count();

  res.json({ items, total, limit, offset });
});

// ─── Start ───────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PayCycle API running on port ${PORT}`);
});
