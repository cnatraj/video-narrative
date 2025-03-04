import express from "express";
import { checkHealth } from "../controllers/healthController.js";

const router = express.Router();

// Health check route
router.get("/", checkHealth);

// Simple ping endpoint for uptime monitoring services
router.get("/ping", pingHealth);

export default router;
