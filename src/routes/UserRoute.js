import express from "express";
import {
  registerUser,
  loginUser,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// ================= User Routes =================
router.post("/register", registerUser);       // Public
router.post("/login", loginUser);             // Public

router.post("/", verifyToken, createUser);    // Admin create user
router.get("/", verifyToken, getUsers);       // Get all users (with pagination, filter, sort)
router.get("/:userid", verifyToken, getUserById); 
router.put("/:userid", verifyToken, updateUser);
router.delete("/:userid", verifyToken, deleteUser);

export default router;
