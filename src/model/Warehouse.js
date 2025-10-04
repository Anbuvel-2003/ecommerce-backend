// models/Warehouse.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  landmark: { type: String, trim: true }
}, { _id: false });

const warehouseSchema = new mongoose.Schema({
  warehouseId: {
    type: String,
    unique: true,
    required: true
  },
  warehouseName: {
    type: String,
    required: [true, "Warehouse name is required"],
    trim: true,
    index: true
  },
  warehouseCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    required: [true, "Warehouse code is required"]
  },
  address: {
    type: addressSchema,
    required: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Invalid contact number format'
    }
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  capacity: {
    type: Number,
    min: 0,
    default: 0
  },
  currentUtilization: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Additional useful fields
  warehouseType: {
    type: String,
    enum: ['main', 'distribution', 'fulfillment', 'returns', 'transit'],
    default: 'main'
  },
  operatingHours: {
    openTime: { type: String }, // e.g., "09:00"
    closeTime: { type: String }, // e.g., "18:00"
    workingDays: [{ type: String }] // e.g., ["Monday", "Tuesday", ...]
  },
  managerId: {
    type: String,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
warehouseSchema.index({ warehouseCode: 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ 'address.city': 1 });
warehouseSchema.index({ 'address.state': 1 });

// Pre-save middleware to generate warehouseId
warehouseSchema.pre('save', async function(next) {
  if (!this.warehouseId) {
    this.warehouseId = `WH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

// Instance method to update utilization
warehouseSchema.methods.updateUtilization = async function() {
  try {
    // Import Stock model here to avoid circular dependency
    const Stock = mongoose.model('Stock');
    
    const stockInWarehouse = await Stock.find({ 
      warehouseId: this.warehouseId,
      isActive: true 
    });
    
    // Calculate total stock
    const totalStock = stockInWarehouse.reduce((sum, stock) => sum + stock.currentStock, 0);
    
    // Update utilization
    this.currentUtilization = totalStock;
    
    return this.currentUtilization;
  } catch (error) {
    console.error('Error updating utilization:', error);
    return this.currentUtilization;
  }
};

// Instance method to get utilization percentage
warehouseSchema.methods.getUtilizationPercentage = function() {
  if (this.capacity === 0) return 0;
  return Math.round((this.currentUtilization / this.capacity) * 100);
};

// Instance method to check if warehouse is full
warehouseSchema.methods.isFull = function() {
  return this.currentUtilization >= this.capacity;
};

// Instance method to get available capacity
warehouseSchema.methods.getAvailableCapacity = function() {
  return Math.max(0, this.capacity - this.currentUtilization);
};

// Static method to find active warehouses
warehouseSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ warehouseName: 1 });
};

// Static method to find warehouses by city
warehouseSchema.statics.findByCity = function(city) {
  return this.find({ 
    'address.city': new RegExp(city, 'i'),
    isActive: true 
  });
};

// Static method to find warehouses by state
warehouseSchema.statics.findByState = function(state) {
  return this.find({ 
    'address.state': new RegExp(state, 'i'),
    isActive: true 
  });
};

// Static method to find nearest warehouse (simple version based on city match)
warehouseSchema.statics.findNearest = function(city, state) {
  return this.findOne({ 
    'address.city': new RegExp(city, 'i'),
    'address.state': new RegExp(state, 'i'),
    isActive: true 
  });
};

// Virtual for full address
warehouseSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  const parts = [
    addr.street,
    addr.landmark,
    addr.city,
    addr.state,
    addr.country,
    addr.postalCode
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Ensure virtuals are included in JSON output
warehouseSchema.set('toJSON', { virtuals: true });
warehouseSchema.set('toObject', { virtuals: true });

export default mongoose.model("Warehouse", warehouseSchema);