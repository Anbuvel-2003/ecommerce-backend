// controllers/stockController.js
import Stock from "../model/Stock.js";

// Create stock record
export const createStock = async (req, res) => {
  try {
    const stockData = req.body;

    // Check if stock record already exists for this product-variant-warehouse combination
    const existingStock = await Stock.findOne({
      productId: stockData.productId,
      variantId: stockData.variantId || null,
      warehouseId: stockData.warehouseId || null
    });

    if (existingStock) {
      return res.status(400).json({ 
        message: "Stock record already exists for this product/variant/warehouse combination" 
      });
    }

    const stock = new Stock(stockData);
    await stock.save();

    res.status(201).json({
      message: "Stock record created successfully",
      stock
    });
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all stock records
export const getAllStock = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      productId,
      warehouseId,
      stockStatus,
      isActive
    } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (stockStatus) filter.stockStatus = stockStatus;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stocks = await Stock.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Stock.countDocuments(filter);

    res.json({
      stocks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get stock by ID
export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    res.json({ stock });
  } catch (error) {
    console.error("Get stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get stock by product ID
export const getStockByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { warehouseId } = req.query;

    const filter = { productId, isActive: true };
    if (warehouseId) filter.warehouseId = warehouseId;

    const stocks = await Stock.find(filter);

    // Calculate total stock across all warehouses
    const totalStock = stocks.reduce((sum, stock) => sum + stock.currentStock, 0);
    const totalReserved = stocks.reduce((sum, stock) => sum + stock.reservedStock, 0);
    const totalAvailable = stocks.reduce((sum, stock) => sum + stock.availableStock, 0);

    res.json({
      stocks,
      summary: {
        totalStock,
        totalReserved,
        totalAvailable,
        warehouseCount: stocks.length
      }
    });
  } catch (error) {
    console.error("Get stock by product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get low stock items
export const getLowStockItems = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const stocks = await Stock.getLowStockItems(warehouseId);

    res.json({
      stocks,
      count: stocks.length
    });
  } catch (error) {
    console.error("Get low stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get out of stock items
export const getOutOfStockItems = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const stocks = await Stock.getOutOfStockItems(warehouseId);

    res.json({
      stocks,
      count: stocks.length
    });
  } catch (error) {
    console.error("Get out of stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add stock (Stock In)
export const addStock = async (req, res) => {
  try {
    const { quantity, reason, referenceId, notes } = req.body;
    const userId = req.user?.userId; // From auth middleware

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    stock.addStock(quantity, reason, referenceId, notes, userId);
    await stock.save();

    res.json({
      message: "Stock added successfully",
      stock
    });
  } catch (error) {
    console.error("Add stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove stock (Stock Out)
export const removeStock = async (req, res) => {
  try {
    const { quantity, reason, referenceId, notes } = req.body;
    const userId = req.user?.userId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    stock.removeStock(quantity, reason, referenceId, notes, userId);
    await stock.save();

    res.json({
      message: "Stock removed successfully",
      stock
    });
  } catch (error) {
    console.error("Remove stock error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Reserve stock
export const reserveStock = async (req, res) => {
  try {
    const { quantity, referenceId, notes } = req.body;
    const userId = req.user?.userId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    if (!referenceId) {
      return res.status(400).json({ message: "Reference ID is required" });
    }

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    stock.reserveStock(quantity, referenceId, notes, userId);
    await stock.save();

    res.json({
      message: "Stock reserved successfully",
      stock
    });
  } catch (error) {
    console.error("Reserve stock error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Release reserved stock
export const releaseStock = async (req, res) => {
  try {
    const { quantity, referenceId, notes } = req.body;
    const userId = req.user?.userId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    stock.releaseStock(quantity, referenceId, notes, userId);
    await stock.save();

    res.json({
      message: "Reserved stock released successfully",
      stock
    });
  } catch (error) {
    console.error("Release stock error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Adjust stock (Manual correction)
export const adjustStock = async (req, res) => {
  try {
    const { newQuantity, reason, notes } = req.body;
    const userId = req.user?.userId;

    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ message: "Valid new quantity is required" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    stock.adjustStock(newQuantity, reason, notes, userId);
    await stock.save();

    res.json({
      message: "Stock adjusted successfully",
      stock
    });
  } catch (error) {
    console.error("Adjust stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update stock record
export const updateStock = async (req, res) => {
  try {
    const { minimumStock, maximumStock, purchaseCost, warehouseId } = req.body;

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    // Update allowed fields
    if (minimumStock !== undefined) stock.minimumStock = minimumStock;
    if (maximumStock !== undefined) stock.maximumStock = maximumStock;
    if (purchaseCost !== undefined) stock.purchaseCost = purchaseCost;
    if (warehouseId !== undefined) stock.warehouseId = warehouseId;

    stock.updateStockStatus();
    await stock.save();

    res.json({
      message: "Stock record updated successfully",
      stock
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete stock record
export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOneAndDelete({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    res.json({ message: "Stock record deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get stock movements for a product
export const getStockMovements = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const stock = await Stock.findOne({ stockId: req.params.id });
    
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    // Get latest movements
    const movements = stock.stockMovements
      .sort((a, b) => b.movementDate - a.movementDate)
      .slice(0, parseInt(limit));

    res.json({
      movements,
      count: movements.length
    });
  } catch (error) {
    console.error("Get stock movements error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get stock statistics
export const getStockStats = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    const totalStock = await Stock.countDocuments({ isActive: true });
    const lowStock = await Stock.countDocuments({ stockStatus: 'lowstock', isActive: true });
    const outOfStock = await Stock.countDocuments({ stockStatus: 'outofstock', isActive: true });
    const inStock = await Stock.countDocuments({ stockStatus: 'instock', isActive: true });

    // Get stock value
    const stockValue = await Stock.getStockValue(warehouseId);

    res.json({
      statistics: {
        totalStockRecords: totalStock,
        inStock,
        lowStock,
        outOfStock,
        ...stockValue
      }
    });
  } catch (error) {
    console.error("Get stock stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Bulk stock update
export const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { stockId, operation, quantity, ... }
    const userId = req.user?.userId;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const stock = await Stock.findOne({ stockId: update.stockId });
        
        if (!stock) {
          errors.push({ stockId: update.stockId, error: "Stock not found" });
          continue;
        }

        switch (update.operation) {
          case 'add':
            stock.addStock(update.quantity, update.reason, update.referenceId, update.notes, userId);
            break;
          case 'remove':
            stock.removeStock(update.quantity, update.reason, update.referenceId, update.notes, userId);
            break;
          case 'reserve':
            stock.reserveStock(update.quantity, update.referenceId, update.notes, userId);
            break;
          case 'release':
            stock.releaseStock(update.quantity, update.referenceId, update.notes, userId);
            break;
          case 'adjust':
            stock.adjustStock(update.newQuantity, update.reason, update.notes, userId);
            break;
          default:
            errors.push({ stockId: update.stockId, error: "Invalid operation" });
            continue;
        }

        await stock.save();
        results.push({ stockId: update.stockId, status: "success" });
      } catch (err) {
        errors.push({ stockId: update.stockId, error: err.message });
      }
    }

    res.json({
      message: "Bulk update completed",
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};