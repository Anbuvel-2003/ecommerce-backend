// routes/productRoutes.js
import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { addProductRating, createProduct, deleteProduct, getAllProducts, getBestsellerProducts, getFeaturedProducts, getNewProducts, getProductById, getProductBySlug, getProductsByBrand, getProductsByCategory, getProductStats, searchProducts, updateProduct, updateProductStatus } from "../controllers/productController.js";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/bestsellers", getBestsellerProducts);
router.get("/new", getNewProducts);
router.get("/stats", getProductStats);
router.get("/search/:query", searchProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/brand/:brandId", getProductsByBrand);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);

// Protected routes (admin/seller only)
router.post("/", verifyToken, createProduct);
router.put("/:id", verifyToken, updateProduct);
router.patch("/:id/status", verifyToken, updateProductStatus);
router.delete("/:id", verifyToken, deleteProduct);

// Rating route (authenticated users)
router.post("/:id/rating", verifyToken, addProductRating);

export default router;