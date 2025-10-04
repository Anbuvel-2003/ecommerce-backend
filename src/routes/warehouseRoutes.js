// routes/warehouseRoutes.js
import express from "express";
import {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  getWarehouseByCode,
  getActiveWarehouses,
  getWarehousesByCity,
  getWarehousesByState,
  findNearestWarehouse,
  updateWarehouse,
  updateWarehouseStatus,
  deleteWarehouse,
  getWarehouseStockSummary,
  getWarehouseStats,
  updateWarehouseUtilization
} from "../controllers/warehouseController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Public/Read-only routes
router.get("/", verifyToken, getAllWarehouses);
router.get("/active", verifyToken, getActiveWarehouses);
router.get("/stats", verifyToken, getWarehouseStats);
router.get("/nearest", verifyToken, findNearestWarehouse);
router.get("/city/:city", verifyToken, getWarehousesByCity);
router.get("/state/:state", verifyToken, getWarehousesByState);
router.get("/code/:code", verifyToken, getWarehouseByCode);
router.get("/:id", verifyToken, getWarehouseById);
router.get("/:id/stock-summary", verifyToken, getWarehouseStockSummary);

// Management routes (admin only)
router.post("/", verifyToken, createWarehouse);
router.put("/:id", verifyToken, updateWarehouse);
router.patch("/:id/status", verifyToken, updateWarehouseStatus);
router.patch("/:id/update-utilization", verifyToken, updateWarehouseUtilization);
router.delete("/:id", verifyToken, deleteWarehouse);

export default router;