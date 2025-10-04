// models/Stock.js
import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema({
  movementType: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'reserved', 'released'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  referenceId: {
    type: String, // Order ID, Purchase ID, etc.
    trim: true
  },
  movementDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  performedBy: {
    type: String, // User ID who performed the action
    ref: 'User'
  }
}, { _id: true });

const stockSchema = new mongoose.Schema({
  stockId: {
    type: String,
    unique: true,
    required: true
  },
  productId: {
    type: String,
    required: [true, "Product ID is required"],
    ref: 'Product',
    index: true
  },
  variantId: {
    type: String, // For product variants
    ref: 'Product',
    index: true
  },
  warehouseId: {
    type: String,
    ref: 'Warehouse',
    index: true
  },
  
  // Stock Information
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 5,
    min: 0
  },
  maximumStock: {
    type: Number,
    min: 0
  },
  
  // Stock Movement Tracking
  stockMovements: [stockMovementSchema],
  
  // Cost Information
  purchaseCost: {
    type: Number,
    min: 0
  },
  averageCost: {
    type: Number,
    min: 0
  },
  lastCost: {
    type: Number,
    min: 0
  },
  
  // Status
  stockStatus: {
    type: String,
    enum: ['instock', 'outofstock', 'lowstock', 'backordered'],
    default: 'instock',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound index for unique product-variant-warehouse combination
stockSchema.index({ productId: 1, variantId: 1, warehouseId: 1 }, { unique: true });

// Index for stock status queries
stockSchema.index({ stockStatus: 1, isActive: 1 });

// Pre-save middleware to generate stockId and calculate available stock
stockSchema.pre('save', async function(next) {
  // Generate stockId if not exists
  if (!this.stockId) {
    this.stockId = `STK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  
  // Calculate available stock
  this.calculateAvailableStock();
  
  // Update stock status
  this.updateStockStatus();
  
  next();
});

// Instance method to calculate available stock
stockSchema.methods.calculateAvailableStock = function() {
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock);
};

// Instance method to update stock status
stockSchema.methods.updateStockStatus = function() {
  if (this.availableStock === 0) {
    this.stockStatus = 'outofstock';
  } else if (this.availableStock <= this.minimumStock) {
    this.stockStatus = 'lowstock';
  } else {
    this.stockStatus = 'instock';
  }
};

// Instance method to add stock (stock in)
stockSchema.methods.addStock = function(quantity, reason, referenceId, notes, userId) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  this.currentStock += quantity;
  
  // Add movement record
  this.stockMovements.push({
    movementType: 'in',
    quantity,
    reason,
    referenceId,
    notes,
    performedBy: userId
  });
  
  // Update last cost if provided in notes as JSON
  if (notes) {
    try {
      const data = JSON.parse(notes);
      if (data.cost) {
        this.lastCost = data.cost;
        // Calculate average cost
        this.calculateAverageCost(quantity, data.cost);
      }
    } catch (e) {
      // Notes is not JSON, ignore
    }
  }
  
  this.calculateAvailableStock();
  this.updateStockStatus();
};

// Instance method to remove stock (stock out)
stockSchema.methods.removeStock = function(quantity, reason, referenceId, notes, userId) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock available');
  }
  
  this.currentStock -= quantity;
  
  // Add movement record
  this.stockMovements.push({
    movementType: 'out',
    quantity,
    reason,
    referenceId,
    notes,
    performedBy: userId
  });
  
  this.calculateAvailableStock();
  this.updateStockStatus();
};

// Instance method to reserve stock
stockSchema.methods.reserveStock = function(quantity, referenceId, notes, userId) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock to reserve');
  }
  
  this.reservedStock += quantity;
  
  // Add movement record
  this.stockMovements.push({
    movementType: 'reserved',
    quantity,
    reason: 'Stock reserved for order',
    referenceId,
    notes,
    performedBy: userId
  });
  
  this.calculateAvailableStock();
  this.updateStockStatus();
};

// Instance method to release reserved stock
stockSchema.methods.releaseStock = function(quantity, referenceId, notes, userId) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  if (quantity > this.reservedStock) {
    throw new Error('Cannot release more than reserved stock');
  }
  
  this.reservedStock -= quantity;
  
  // Add movement record
  this.stockMovements.push({
    movementType: 'released',
    quantity,
    reason: 'Reserved stock released',
    referenceId,
    notes,
    performedBy: userId
  });
  
  this.calculateAvailableStock();
  this.updateStockStatus();
};

// Instance method to adjust stock (manual correction)
stockSchema.methods.adjustStock = function(newQuantity, reason, notes, userId) {
  const difference = newQuantity - this.currentStock;
  
  this.currentStock = newQuantity;
  
  // Add movement record
  this.stockMovements.push({
    movementType: 'adjustment',
    quantity: Math.abs(difference),
    reason: reason || 'Stock adjustment',
    notes: `${notes || ''} (${difference > 0 ? '+' : ''}${difference})`,
    performedBy: userId
  });
  
  this.calculateAvailableStock();
  this.updateStockStatus();
};

// Instance method to calculate average cost
stockSchema.methods.calculateAverageCost = function(newQuantity, newCost) {
  const totalValue = (this.currentStock * (this.averageCost || 0)) + (newQuantity * newCost);
  const totalQuantity = this.currentStock + newQuantity;
  this.averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
};

// Static method to get low stock items
stockSchema.statics.getLowStockItems = function(warehouseId = null) {
  const filter = { 
    stockStatus: 'lowstock',
    isActive: true 
  };
  
  if (warehouseId) {
    filter.warehouseId = warehouseId;
  }
  
  return this.find(filter).sort({ availableStock: 1 });
};

// Static method to get out of stock items
stockSchema.statics.getOutOfStockItems = function(warehouseId = null) {
  const filter = { 
    stockStatus: 'outofstock',
    isActive: true 
  };
  
  if (warehouseId) {
    filter.warehouseId = warehouseId;
  }
  
  return this.find(filter);
};

// Static method to get stock value
stockSchema.statics.getStockValue = async function(warehouseId = null) {
  const filter = { isActive: true };
  if (warehouseId) filter.warehouseId = warehouseId;
  
  const result = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ['$currentStock', '$averageCost'] } },
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$currentStock' }
      }
    }
  ]);
  
  return result[0] || { totalValue: 0, totalItems: 0, totalQuantity: 0 };
};

export default mongoose.model("Stock", stockSchema);