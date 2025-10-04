// routes/stockRoutes.js
import express from "express";

import { verifyToken } from "../middlewares/auth.js";
import { addStock, adjustStock, bulkUpdateStock, createStock, deleteStock, getAllStock, getLowStockItems, getOutOfStockItems, getStockById, getStockByProduct, getStockMovements, getStockStats, releaseStock, removeStock, reserveStock, updateStock } from "../controllers/stockController.js";

const router = express.Router();

// Public/Read-only routes
router.get("/", verifyToken, getAllStock);
router.get("/stats", verifyToken, getStockStats);
router.get("/low-stock", verifyToken, getLowStockItems);
router.get("/out-of-stock", verifyToken, getOutOfStockItems);
router.get("/product/:productId", verifyToken, getStockByProduct);
router.get("/:id", verifyToken, getStockById);
router.get("/:id/movements", verifyToken, getStockMovements);

// Stock management routes (admin/warehouse staff only)
router.post("/", verifyToken, createStock);
router.post("/bulk-update", verifyToken, bulkUpdateStock);
router.post("/:id/add", verifyToken, addStock);
router.post("/:id/remove", verifyToken, removeStock);
router.post("/:id/reserve", verifyToken, reserveStock);
router.post("/:id/release", verifyToken, releaseStock);
router.post("/:id/adjust", verifyToken, adjustStock);
router.put("/:id", verifyToken, updateStock);
router.delete("/:id", verifyToken, deleteStock);

export default router;