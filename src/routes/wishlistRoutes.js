// routes/wishlistRoutes.js
import express from "express";
import {
  getOrCreateWishlist,
  getUserWishlists,
  getWishlistById,
  createWishlist,
  addItemToWishlist,
  removeItemFromWishlist,
  updateItemPriority,
  updateItemNotes,
  updateWishlist,
  deleteWishlist,
  clearWishlist,
  checkProductInWishlist,
  getItemsByPriority,
  getPriceDrops,
  moveItemToCart,
  getPublicWishlists,
  getWishlistStats
} from "../controllers/wishlistController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.get("/public", getPublicWishlists);

// User wishlist routes (authenticated users)
router.get("/my-wishlist", verifyToken, getOrCreateWishlist);
router.get("/my-wishlists", verifyToken, getUserWishlists);
router.get("/check-product", verifyToken, checkProductInWishlist);
router.get("/priority/:priority", verifyToken, getItemsByPriority);
router.get("/price-drops", verifyToken, getPriceDrops);
router.post("/", verifyToken, createWishlist);
router.post("/add-item", verifyToken, addItemToWishlist);
router.delete("/remove-item/:wishlistItemId", verifyToken, removeItemFromWishlist);
router.patch("/update-priority", verifyToken, updateItemPriority);
router.patch("/update-notes", verifyToken, updateItemNotes);
router.post("/move-to-cart", verifyToken, moveItemToCart);
router.delete("/:wishlistId/clear", verifyToken, clearWishlist);
router.put("/:wishlistId", verifyToken, updateWishlist);
router.delete("/:wishlistId", verifyToken, deleteWishlist);

// Admin routes
router.get("/stats", verifyToken, getWishlistStats);

// Get specific wishlist (check access)
router.get("/:id", verifyToken, getWishlistById);

export default router;