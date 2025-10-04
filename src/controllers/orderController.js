// controllers/orderController.js
import Order from "../model/Order.js";
import Cart from "../model/Cart.js";
import Product from "../model/Product.js";
import Stock from "../model/Stock.js";

// Create order from cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { 
      billingAddress, 
      shippingAddress, 
      paymentMethod,
      shippingMethod,
      specialInstructions,
      giftWrapping,
      giftMessage
    } = req.body;

    // Validate addresses
    if (!billingAddress || !shippingAddress) {
      return res.status(400).json({ message: "Billing and shipping addresses are required" });
    }

    // Get user's cart
    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock availability
    for (const item of cart.cartItems) {
      const stock = await Stock.findOne({ 
        productId: item.productId,
        isActive: true 
      });
      
      if (!stock || stock.availableStock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${item.productName}`,
          availableStock: stock?.availableStock || 0
        });
      }
    }

    // Create order items from cart
    const orderItems = cart.cartItems.map(item => ({
      orderItemId: `OI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      productName: item.productName,
      productImage: item.productImage,
      productSku: item.productSku
    }));

    // Create order
    const order = new Order({
      userId,
      orderItems,
      financials: {
        subtotal: cart.subtotal,
        discount: cart.discount,
        tax: cart.tax,
        shipping: cart.shipping,
        total: cart.total,
        currency: 'USD'
      },
      appliedCoupons: cart.appliedCoupons,
      billingAddress,
      shippingAddress,
      paymentMethod,
      shippingMethod,
      specialInstructions,
      giftWrapping: giftWrapping || false,
      giftMessage,
      orderStatus: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Reserve stock for order items
    for (const item of cart.cartItems) {
      const stock = await Stock.findOne({ productId: item.productId });
      if (stock) {
        stock.reserveStock(item.quantity, order.orderId, 'Order placed', userId);
        await stock.save();
      }
    }

    // Convert cart
    await Cart.convertCart(cart.cartId);

    res.status(201).json({
      message: "Order created successfully",
      order
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      orderStatus,
      paymentStatus,
      startDate,
      endDate,
      search
    } = req.query;

    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate);
    }

    // Search by order number, customer name, or email
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, status } = req.query;

    const orders = await Order.findByUser(userId, { 
      page: parseInt(page), 
      limit: parseInt(limit),
      status 
    });

    const total = await Order.countDocuments({ 
      userId, 
      ...(status && { orderStatus: status }) 
    });

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user owns the order (or is admin)
    if (order.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get order by order number
export const getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user owns the order (or is admin)
    if (order.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order by number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const userId = req.user?.userId;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.updateOrderStatus(status, note, userId);
    await order.save();

    // Handle stock based on status changes
    if (status === 'cancelled') {
      // Release reserved stock
      for (const item of order.orderItems) {
        const stock = await Stock.findOne({ productId: item.productId });
        if (stock) {
          stock.releaseStock(item.quantity, orderId, 'Order cancelled', userId);
          await stock.save();
        }
      }
    } else if (status === 'shipped') {
      // Remove stock from inventory
      for (const item of order.orderItems) {
        const stock = await Stock.findOne({ productId: item.productId });
        if (stock) {
          // Release reserved stock and remove from current stock
          stock.releaseStock(item.quantity, orderId, 'Order shipped', userId);
          stock.removeStock(item.quantity, 'Order shipped', orderId, '', userId);
          await stock.save();
        }
      }
    }

    res.json({
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, transactionId } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ message: "Payment status is required" });
    }

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.updatePaymentStatus(paymentStatus, transactionId);
    
    // If payment is successful, update order status to confirmed
    if (paymentStatus === 'paid' && order.orderStatus === 'pending') {
      order.updateOrderStatus('confirmed', 'Payment received');
    }

    await order.save();

    res.json({
      message: "Payment status updated successfully",
      order
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update tracking information
export const updateTrackingInfo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, shippingProvider, estimatedDeliveryTime } = req.body;

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (shippingProvider) order.shippingProvider = shippingProvider;
    if (estimatedDeliveryTime) order.estimatedDeliveryTime = estimatedDeliveryTime;

    order.addStatusHistory('tracking_updated', `Tracking number: ${trackingNumber}`);
    await order.save();

    res.json({
      message: "Tracking information updated successfully",
      order
    });
  } catch (error) {
    console.error("Update tracking info error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user owns the order
    if (order.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!order.canCancel()) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled at this stage",
        currentStatus: order.orderStatus
      });
    }

    order.updateOrderStatus('cancelled', reason || 'Cancelled by user', userId);

    // Release reserved stock
    for (const item of order.orderItems) {
      const stock = await Stock.findOne({ productId: item.productId });
      if (stock) {
        stock.releaseStock(item.quantity, orderId, 'Order cancelled', userId);
        await stock.save();
      }
    }

    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Request return
export const requestReturn = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user owns the order
    if (order.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!order.canReturn()) {
      return res.status(400).json({ 
        message: "Order cannot be returned",
        reason: order.orderStatus !== 'delivered' 
          ? "Order not delivered yet" 
          : "Return period expired (30 days)"
      });
    }

    order.updateOrderStatus('returned', reason || 'Return requested by customer', userId);
    await order.save();

    res.json({
      message: "Return request submitted successfully",
      order
    });
  } catch (error) {
    console.error("Request return error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'processing' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    // Revenue statistics
    const revenueStats = await Order.aggregate([
      { 
        $match: { 
          orderStatus: { $nin: ['cancelled', 'refunded'] },
          paymentStatus: 'paid'
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$financials.total' },
          averageOrderValue: { $avg: '$financials.total' }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 };

    // Recent orders count (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.countDocuments({ 
      orderDate: { $gte: sevenDaysAgo } 
    });

    res.json({
      statistics: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        recentOrders,
        totalRevenue: Math.round(revenue.totalRevenue * 100) / 100,
        averageOrderValue: Math.round(revenue.averageOrderValue * 100) / 100
      }
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Generate sales report
export const generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const report = await Order.generateSalesReport(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ report });
  } catch (error) {
    console.error("Generate sales report error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get recent orders
export const getRecentOrders = async (req, res) => {
  try {
    const { days = 7, limit = 50 } = req.query;

    const orders = await Order.findRecent(parseInt(days), parseInt(limit));

    res.json({
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error("Get recent orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get pending orders
export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.findPending();

    res.json({
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error("Get pending orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};