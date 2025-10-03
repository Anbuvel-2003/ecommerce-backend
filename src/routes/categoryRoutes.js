// routes/categoryRoutes.js
import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, getCategoryTree, getRootCategories, toggleCategoryStatus, updateCategory } from "../controllers/categoryController.js";

const router = express.Router();

// Public routes
router.get("/", getAllCategories);
router.get("/roots", getRootCategories);
router.get("/tree", getCategoryTree);
router.get("/:id", getCategoryById);

// Protected routes (admin only)
router.post("/", verifyToken, createCategory);
router.put("/:id", verifyToken, updateCategory);
router.delete("/:id", verifyToken, deleteCategory);
router.patch("/:id/toggle-status", verifyToken, toggleCategoryStatus);

export default router;