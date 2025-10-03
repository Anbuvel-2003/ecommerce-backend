// controllers/brandController.js
import Brand from "../models/Brand.js";

// Create brand
export const createBrand = async (req, res) => {
  try {
    const { brandName, brandDescription, brandLogo, brandWebsite } = req.body;

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ brandName });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand already exists" });
    }

    const brand = new Brand({
      brandName,
      brandDescription,
      brandLogo,
      brandWebsite
    });

    await brand.save();

    res.status(201).json({
      message: "Brand created successfully",
      brand
    });
  } catch (error) {
    console.error("Create brand error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all brands
export const getAllBrands = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Search by brand name
    if (search) {
      filter.brandName = { $regex: search, $options: 'i' };
    }

    const brands = await Brand.find(filter).sort({ brandName: 1 });
    
    res.json({
      brands,
      count: brands.length
    });
  } catch (error) {
    console.error("Get brands error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get brand by ID
export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.id });
    
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json({ brand });
  } catch (error) {
    console.error("Get brand error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get active brands only
export const getActiveBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ brandName: 1 });
    
    res.json({
      brands,
      count: brands.length
    });
  } catch (error) {
    console.error("Get active brands error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update brand
export const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { brandId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json({
      message: "Brand updated successfully",
      brand
    });
  } catch (error) {
    console.error("Update brand error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete brand
export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findOneAndDelete({ brandId: req.params.id });
    
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Delete brand error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle brand active status
export const toggleBrandStatus = async (req, res) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.id });
    
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    brand.isActive = !brand.isActive;
    await brand.save();

    res.json({
      message: `Brand ${brand.isActive ? 'activated' : 'deactivated'} successfully`,
      brand
    });
  } catch (error) {
    console.error("Toggle brand status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search brands by name
export const searchBrands = async (req, res) => {
  try {
    const { query } = req.params;
    
    const brands = await Brand.find({
      brandName: { $regex: query, $options: 'i' },
      isActive: true
    }).sort({ brandName: 1 });

    res.json({
      brands,
      count: brands.length
    });
  } catch (error) {
    console.error("Search brands error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};