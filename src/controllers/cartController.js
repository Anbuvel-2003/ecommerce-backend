// controllers/cartController.js
import Cart from "../model/Cart.js";
import Product from "../model/Product.js";

// Get or create user's cart
export const getOrCreateCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    let cart = await Cart.findActiveByUser(userId);

    if (!cart) {
      // Create new cart
      cart = new Cart({ userId });
      await cart.save();
    }

    res.json({ cart });
  } catch (error) {
    console.error("Get or create cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get cart by ID
export const getCartById = async (req, res) => {
  try {
    const cart = await Cart.findOne({ cartId: req.params.id });
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json({ cart });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add item to cart
export const addItemToCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Get or create cart
    let cart = await Cart.findActiveByUser(userId);
    if (!cart) {
      cart = new Cart({ userId });
    }

    // Fetch product details
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.productStatus !== 'active') {
      return res.status(400).json({ message: "Product is not available" });
    }

    // Get the appropriate price (variant or base)
    let unitPrice = product.pricing.sellingPrice;
    if (variantId) {
      const variant = product.variants.find(v => v.variantId === variantId);
      if (variant && variant.variantPrice) {
        unitPrice = variant.variantPrice;
      }
    }

    // Get primary image
    const primaryImage = product.images.find(img => img.imageType === 'primary');

    // Add item to cart
    cart.addItem({
      productId,
      variantId,
      quantity,
      unitPrice,
      productName: product.productName,
      productImage: primaryImage?.imageUrl || product.images[0]?.imageUrl,
      productSku: product.sku
    });

    await cart.save();

    res.json({
      message: "Item added to cart successfully",
      cart,
      itemCount: cart.getItemCount()
    });
  } catch (error) {
    console.error("Add item to cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update item quantity in cart
export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { cartItemId, quantity } = req.body;

    if (!cartItemId) {
      return res.status(400).json({ message: "Cart item ID is required" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.updateItemQuantity(cartItemId, quantity);
    await cart.save();

    res.json({
      message: "Cart item quantity updated successfully",
      cart,
      itemCount: cart.getItemCount()
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Remove item from cart
export const removeItemFromCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { cartItemId } = req.params;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.removeItem(cartItemId);
    await cart.save();

    res.json({
      message: "Item removed from cart successfully",
      cart,
      itemCount: cart.getItemCount()
    });
  } catch (error) {
    console.error("Remove item from cart error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.clearCart();
    await cart.save();

    res.json({
      message: "Cart cleared successfully",
      cart
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Apply coupon to cart
export const applyCoupon = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (cart.cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // TODO: Validate coupon with Coupon model (if you have one)
    // For now, we'll use a simple example
    // In production, fetch coupon details from database and validate
    
    // Example coupon validation
    const discountType = 'percentage'; // or 'fixed'
    let discountAmount = 0;

    if (discountType === 'percentage') {
      // Example: 10% discount
      discountAmount = (cart.subtotal * 10) / 100;
    } else {
      // Example: $10 fixed discount
      discountAmount = 10;
    }

    cart.applyCoupon(couponCode.toUpperCase(), discountAmount, discountType);
    await cart.save();

    res.json({
      message: "Coupon applied successfully",
      cart
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Remove coupon from cart
export const removeCoupon = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { couponCode } = req.params;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.removeCoupon(couponCode.toUpperCase());
    await cart.save();

    res.json({
      message: "Coupon removed successfully",
      cart
    });
  } catch (error) {
    console.error("Remove coupon error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Update cart tax and shipping
export const updateCartTaxAndShipping = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { tax, shipping } = req.body;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (tax !== undefined) cart.tax = tax;
    if (shipping !== undefined) cart.shipping = shipping;

    cart.calculateTotals();
    await cart.save();

    res.json({
      message: "Cart updated successfully",
      cart
    });
  } catch (error) {
    console.error("Update cart tax/shipping error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get cart summary
export const getCartSummary = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.json({
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: 0
      });
    }

    res.json({
      cartId: cart.cartId,
      itemCount: cart.getItemCount(),
      subtotal: cart.subtotal,
      discount: cart.discount,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      appliedCoupons: cart.appliedCoupons
    });
  } catch (error) {
    console.error("Get cart summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check if product is in cart
export const checkProductInCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { productId, variantId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.json({ inCart: false });
    }

    const inCart = cart.hasProduct(productId, variantId || null);
    const item = cart.cartItems.find(
      item => item.productId === productId && 
             (item.variantId || null) === (variantId || null)
    );

    res.json({
      inCart,
      quantity: item?.quantity || 0
    });
  } catch (error) {
    console.error("Check product in cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get abandoned carts (admin)
export const getAbandonedCarts = async (req, res) => {
  try {
    const { hoursAgo = 24 } = req.query;
    
    const carts = await Cart.findAbandonedCarts(parseInt(hoursAgo));

    res.json({
      carts,
      count: carts.length
    });
  } catch (error) {
    console.error("Get abandoned carts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark cart as abandoned (admin)
export const markCartAsAbandoned = async (req, res) => {
  try {
    const { cartId } = req.params;

    const cart = await Cart.markAbandoned(cartId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json({
      message: "Cart marked as abandoned",
      cart
    });
  } catch (error) {
    console.error("Mark cart as abandoned error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Convert cart (when order is placed)
export const convertCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (cart.cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const convertedCart = await Cart.convertCart(cart.cartId);

    res.json({
      message: "Cart converted to order successfully",
      cart: convertedCart
    });
  } catch (error) {
    console.error("Convert cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all carts (admin)
export const getAllCarts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      cartStatus,
      userId
    } = req.query;

    const filter = {};
    if (cartStatus) filter.cartStatus = cartStatus;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const carts = await Cart.find(filter)
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Cart.countDocuments(filter);

    res.json({
      carts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCarts: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get all carts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get cart statistics (admin)
export const getCartStats = async (req, res) => {
  try {
    const totalCarts = await Cart.countDocuments();
    const activeCarts = await Cart.countDocuments({ cartStatus: 'active', isActive: true });
    const abandonedCarts = await Cart.countDocuments({ cartStatus: 'abandoned' });
    const convertedCarts = await Cart.countDocuments({ cartStatus: 'converted' });

    // Average cart value
    const cartValues = await Cart.aggregate([
      { $match: { cartStatus: 'active', isActive: true } },
      {
        $group: {
          _id: null,
          avgTotal: { $avg: '$total' },
          totalValue: { $sum: '$total' },
          avgItems: { $avg: { $size: '$cartItems' } }
        }
      }
    ]);

    const stats = cartValues[0] || { avgTotal: 0, totalValue: 0, avgItems: 0 };

    res.json({
      statistics: {
        totalCarts,
        activeCarts,
        abandonedCarts,
        convertedCarts,
        averageCartValue: Math.round(stats.avgTotal * 100) / 100,
        totalCartValue: Math.round(stats.totalValue * 100) / 100,
        averageItemsPerCart: Math.round(stats.avgItems * 10) / 10
      }
    });
  } catch (error) {
    console.error("Get cart stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};