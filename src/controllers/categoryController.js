// controllers/categoryController.js
import Category from "../models/Category.js";

// Create category
export const createCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription, categoryImage, parentCategoryId, categoryLevel, categoryPath, sortOrder } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // If parentCategoryId is provided, validate it exists
    if (parentCategoryId) {
      const parentCategory = await Category.findOne({ categoryId: parentCategoryId });
      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const category = new Category({
      categoryName,
      categoryDescription,
      categoryImage,
      parentCategoryId,
      categoryLevel,
      categoryPath,
      sortOrder
    });

    await category.save();

    res.status(201).json({
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const { isActive, parentCategoryId, categoryLevel } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (parentCategoryId) filter.parentCategoryId = parentCategoryId;
    if (categoryLevel) filter.categoryLevel = parseInt(categoryLevel);

    const categories = await Category.find(filter).sort({ sortOrder: 1, categoryName: 1 });
    
    res.json({
      categories,
      count: categories.length
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({ categoryId: req.params.id });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get subcategories
    const subcategories = await category.getSubcategories();

    res.json({
      category,
      subcategories
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get root categories (top-level)
export const getRootCategories = async (req, res) => {
  try {
    const categories = await Category.find({ 
      parentCategoryId: null,
      isActive: true 
    }).sort({ sortOrder: 1, categoryName: 1 });

    res.json({
      categories,
      count: categories.length
    });
  } catch (error) {
    console.error("Get root categories error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get category tree (hierarchical structure)
export const getCategoryTree = async (req, res) => {
  try {
    const buildTree = async (parentId = null) => {
      const categories = await Category.find({ 
        parentCategoryId: parentId,
        isActive: true 
      }).sort({ sortOrder: 1, categoryName: 1 });

      const tree = await Promise.all(
        categories.map(async (category) => ({
          ...category.toObject(),
          children: await buildTree(category.categoryId)
        }))
      );

      return tree;
    };

    const tree = await buildTree();

    res.json({
      categories: tree
    });
  } catch (error) {
    console.error("Get category tree error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { categoryId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    // Check if category has subcategories
    const subcategories = await Category.find({ parentCategoryId: req.params.id });
    if (subcategories.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with subcategories",
        subcategoriesCount: subcategories.length
      });
    }

    const category = await Category.findOneAndDelete({ categoryId: req.params.id });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle category active status
export const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findOne({ categoryId: req.params.id });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      category
    });
  } catch (error) {
    console.error("Toggle category status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};