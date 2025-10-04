// routes/cartRoutes.js
import express from "express";
import {
  getOrCreateCart,
  getCartById,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  updateCartTaxAndShipping,
  getCartSummary,
  checkProductInCart,
  getAbandonedCarts,
  markCartAsAbandoned,
  convertCart,
  getAllCarts,
  getCartStats
} from "../controllers/cartController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// User cart routes (authenticated users)
router.get("/my-cart", verifyToken, getOrCreateCart);
router.get("/summary", verifyToken, getCartSummary);
router.get("/check-product", verifyToken, checkProductInCart);
router.post("/add-item", verifyToken, addItemToCart);
router.put("/update-quantity", verifyToken, updateCartItemQuantity);
router.delete("/remove-item/:cartItemId", verifyToken, removeItemFromCart);
router.delete("/clear", verifyToken, clearCart);
router.post("/apply-coupon", verifyToken, applyCoupon);
router.delete("/remove-coupon/:couponCode", verifyToken, removeCoupon);
router.patch("/update-tax-shipping", verifyToken, updateCartTaxAndShipping);
router.post("/convert", verifyToken, convertCart);

// Admin routes
router.get("/", verifyToken, getAllCarts);
router.get("/stats", verifyToken, getCartStats);
router.get("/abandoned", verifyToken, getAbandonedCarts);
router.patch("/:cartId/mark-abandoned", verifyToken, markCartAsAbandoned);
router.get("/:id", verifyToken, getCartById);

export default router;