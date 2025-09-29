import express from "express";
import {
  getAddressById,
  updateAddress,
  deleteAddress,
  addAddress,
} from "../controllers/addressController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// ================= Address Routes =================
router.post("/:userid", verifyToken, addAddress);          // Add new address for user
router.get("/:userid", verifyToken, getAddressById);      // Get all addresses of a user
router.get("/:userid/:addressid", verifyToken, getAddressById); // Get specific address
router.put("/:userid/:addressid", verifyToken, updateAddress);  // Update address
router.delete("/:userid/:addressid", verifyToken, deleteAddress); // Delete address

export default router;
