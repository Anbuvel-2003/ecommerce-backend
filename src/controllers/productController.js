// controllers/productController.js
import Product from "../models/Product.js";

// Create product
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Check if SKU already exists
    const existingSku = await Product.findOne({ sku: productData.sku });
    if (existingSku) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all products with filters
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      brandId,
      productStatus,
      isFeatured,
      isBestseller,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (productStatus) filter.productStatus = productStatus;
    if (isFeatured) filter.isFeatured = isFeatured === 'true';
    if (isBestseller) filter.isBestseller = isBestseller === 'true';
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter['pricing.sellingPrice'] = {};
      if (minPrice) filter['pricing.sellingPrice'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['pricing.sellingPrice'].$lte = parseFloat(maxPrice);
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ 'seo.slug': req.params.slug });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    console.error("Get product by slug error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.findFeatured(limit);

    res.json({
      products,
      count: products.length
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get bestseller products
export const getBestsellerProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.findBestsellers(limit);

    res.json({
      products,
      count: products.length
    });
  } catch (error) {
    console.error("Get bestseller products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get new products
export const getNewProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.find({ 
      isNew: true, 
      productStatus: 'active' 
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      products,
      count: products.length
    });
  } catch (error) {
    console.error("Get new products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ 
      categoryId, 
      productStatus: 'active' 
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ categoryId, productStatus: 'active' });

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get products by brand
export const getProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ 
      brandId, 
      productStatus: 'active' 
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ brandId, productStatus: 'active' });

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get products by brand error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      $or: [
        { productName: { $regex: query, $options: 'i' } },
        { shortDescription: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } }
      ],
      productStatus: 'active'
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({
      $or: [
        { productName: { $regex: query, $options: 'i' } },
        { shortDescription: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } }
      ],
      productStatus: 'active'
    });

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Recalculate final price after update
    product.calculateFinalPrice();
    await product.save();

    res.json({
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update product status
export const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'draft', 'discontinued'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { productStatus: status },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product status updated successfully",
      product
    });
  } catch (error) {
    console.error("Update product status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.id });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add product rating
export const addProductRating = async (req, res) => {
  try {
    const { rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const product = await Product.findOne({ productId: req.params.id });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.updateRating(rating);
    await product.save();

    res.json({
      message: "Rating added successfully",
      averageRating: product.averageRating,
      totalReviews: product.totalReviews
    });
  } catch (error) {
    console.error("Add rating error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get product statistics
export const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ productStatus: 'active' });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });
    const bestsellerProducts = await Product.countDocuments({ isBestseller: true });
    
    const avgPrice = await Product.aggregate([
      { $match: { productStatus: 'active' } },
      { $group: { _id: null, avgPrice: { $avg: '$pricing.sellingPrice' } } }
    ]);

    res.json({
      statistics: {
        totalProducts,
        activeProducts,
        featuredProducts,
        bestsellerProducts,
        averagePrice: avgPrice[0]?.avgPrice || 0
      }
    });
  } catch (error) {
    console.error("Get product stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};