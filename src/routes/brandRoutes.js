// routes/brandRoutes.js
import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { createBrand, deleteBrand, getActiveBrands, getAllBrands, getBrandById, searchBrands, toggleBrandStatus, updateBrand } from "../controllers/brandController.js";

const router = express.Router();

// Public routes
router.get("/", getAllBrands);
router.get("/active", getActiveBrands);
router.get("/search/:query", searchBrands);
router.get("/:id", getBrandById);

// Protected routes (admin only)
router.post("/", verifyToken, createBrand);
router.put("/:id", verifyToken, updateBrand);
router.delete("/:id", verifyToken, deleteBrand);
router.patch("/:id/toggle-status", verifyToken, toggleBrandStatus);

export default router;