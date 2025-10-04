// controllers/warehouseController.js
import Warehouse from "../model/Warehouse.js";

// Create warehouse
export const createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;

    // Check if warehouse code already exists
    const existingCode = await Warehouse.findOne({ warehouseCode: warehouseData.warehouseCode });
    if (existingCode) {
      return res.status(400).json({ message: "Warehouse code already exists" });
    }

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();

    res.status(201).json({
      message: "Warehouse created successfully",
      warehouse
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all warehouses
export const getAllWarehouses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      city,
      state,
      warehouseType,
      search
    } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (warehouseType) filter.warehouseType = warehouseType;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');
    
    // Search by warehouse name or code
    if (search) {
      filter.$or = [
        { warehouseName: { $regex: search, $options: 'i' } },
        { warehouseCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const warehouses = await Warehouse.find(filter)
      .sort({ warehouseName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Warehouse.countDocuments(filter);

    res.json({
      warehouses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalWarehouses: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouse by ID
export const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ warehouseId: req.params.id });
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Update utilization
    await warehouse.updateUtilization();
    await warehouse.save();

    res.json({ 
      warehouse,
      utilizationPercentage: warehouse.getUtilizationPercentage(),
      availableCapacity: warehouse.getAvailableCapacity(),
      isFull: warehouse.isFull()
    });
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouse by code
export const getWarehouseByCode = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ 
      warehouseCode: req.params.code.toUpperCase() 
    });
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Update utilization
    await warehouse.updateUtilization();
    await warehouse.save();

    res.json({ 
      warehouse,
      utilizationPercentage: warehouse.getUtilizationPercentage(),
      availableCapacity: warehouse.getAvailableCapacity()
    });
  } catch (error) {
    console.error("Get warehouse by code error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get active warehouses
export const getActiveWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.findActive();

    res.json({
      warehouses,
      count: warehouses.length
    });
  } catch (error) {
    console.error("Get active warehouses error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouses by city
export const getWarehousesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const warehouses = await Warehouse.findByCity(city);

    res.json({
      warehouses,
      count: warehouses.length
    });
  } catch (error) {
    console.error("Get warehouses by city error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouses by state
export const getWarehousesByState = async (req, res) => {
  try {
    const { state } = req.params;
    const warehouses = await Warehouse.findByState(state);

    res.json({
      warehouses,
      count: warehouses.length
    });
  } catch (error) {
    console.error("Get warehouses by state error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Find nearest warehouse
export const findNearestWarehouse = async (req, res) => {
  try {
    const { city, state } = req.query;

    if (!city || !state) {
      return res.status(400).json({ message: "City and state are required" });
    }

    const warehouse = await Warehouse.findNearest(city, state);

    if (!warehouse) {
      return res.status(404).json({ 
        message: "No warehouse found in the specified location" 
      });
    }

    res.json({ warehouse });
  } catch (error) {
    console.error("Find nearest warehouse error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update warehouse
export const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate(
      { warehouseId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json({
      message: "Warehouse updated successfully",
      warehouse
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update warehouse status
export const updateWarehouseStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: "isActive field is required" });
    }

    const warehouse = await Warehouse.findOneAndUpdate(
      { warehouseId: req.params.id },
      { isActive },
      { new: true }
    );

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json({
      message: `Warehouse ${isActive ? 'activated' : 'deactivated'} successfully`,
      warehouse
    });
  } catch (error) {
    console.error("Update warehouse status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete warehouse
export const deleteWarehouse = async (req, res) => {
  try {
    // Check if warehouse has any stock
    const Stock = mongoose.model('Stock');
    const stockCount = await Stock.countDocuments({ 
      warehouseId: req.params.id,
      currentStock: { $gt: 0 }
    });

    if (stockCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete warehouse with existing stock",
        stockCount
      });
    }

    const warehouse = await Warehouse.findOneAndDelete({ warehouseId: req.params.id });
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouse stock summary
export const getWarehouseStockSummary = async (req, res) => {
  try {
    const Stock = mongoose.model('Stock');
    
    const warehouse = await Warehouse.findOne({ warehouseId: req.params.id });
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Get stock statistics for this warehouse
    const stocks = await Stock.find({ 
      warehouseId: req.params.id,
      isActive: true 
    });

    const totalProducts = stocks.length;
    const totalStock = stocks.reduce((sum, stock) => sum + stock.currentStock, 0);
    const totalReserved = stocks.reduce((sum, stock) => sum + stock.reservedStock, 0);
    const totalAvailable = stocks.reduce((sum, stock) => sum + stock.availableStock, 0);
    
    const lowStockItems = stocks.filter(stock => stock.stockStatus === 'lowstock').length;
    const outOfStockItems = stocks.filter(stock => stock.stockStatus === 'outofstock').length;

    // Calculate total value
    const totalValue = stocks.reduce((sum, stock) => {
      return sum + (stock.currentStock * (stock.averageCost || 0));
    }, 0);

    res.json({
      warehouse: {
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.warehouseName,
        warehouseCode: warehouse.warehouseCode
      },
      stockSummary: {
        totalProducts,
        totalStock,
        totalReserved,
        totalAvailable,
        lowStockItems,
        outOfStockItems,
        totalValue: Math.round(totalValue * 100) / 100
      },
      capacity: {
        total: warehouse.capacity,
        current: warehouse.currentUtilization,
        available: warehouse.getAvailableCapacity(),
        utilizationPercentage: warehouse.getUtilizationPercentage()
      }
    });
  } catch (error) {
    console.error("Get warehouse stock summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get warehouse statistics
export const getWarehouseStats = async (req, res) => {
  try {
    const totalWarehouses = await Warehouse.countDocuments();
    const activeWarehouses = await Warehouse.countDocuments({ isActive: true });
    const inactiveWarehouses = await Warehouse.countDocuments({ isActive: false });

    // Get total capacity
    const capacityStats = await Warehouse.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalUtilization: { $sum: '$currentUtilization' }
        }
      }
    ]);

    const stats = capacityStats[0] || { totalCapacity: 0, totalUtilization: 0 };
    const utilizationPercentage = stats.totalCapacity > 0 
      ? Math.round((stats.totalUtilization / stats.totalCapacity) * 100) 
      : 0;

    // Get warehouses by type
    const byType = await Warehouse.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$warehouseType', count: { $sum: 1 } } }
    ]);

    res.json({
      statistics: {
        totalWarehouses,
        activeWarehouses,
        inactiveWarehouses,
        totalCapacity: stats.totalCapacity,
        totalUtilization: stats.totalUtilization,
        utilizationPercentage,
        availableCapacity: stats.totalCapacity - stats.totalUtilization,
        byType
      }
    });
  } catch (error) {
    console.error("Get warehouse stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update warehouse utilization (manual trigger)
export const updateWarehouseUtilization = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ warehouseId: req.params.id });
    
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const utilization = await warehouse.updateUtilization();
    await warehouse.save();

    res.json({
      message: "Utilization updated successfully",
      currentUtilization: utilization,
      utilizationPercentage: warehouse.getUtilizationPercentage(),
      availableCapacity: warehouse.getAvailableCapacity()
    });
  } catch (error) {
    console.error("Update utilization error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};