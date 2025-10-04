// controllers/wishlistController.js
import Wishlist from "../model/Wishlist.js";
import Product from "../model/Product.js";

// Get or create user's default wishlist
export const getOrCreateWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    let wishlist = await Wishlist.findDefaultByUser(userId);

    if (!wishlist) {
      // Create default wishlist
      wishlist = new Wishlist({ 
        userId,
        wishlistName: 'My Wishlist',
        isDefault: true
      });
      await wishlist.save();
    }

    res.json({ wishlist });
  } catch (error) {
    console.error("Get or create wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all user's wishlists
export const getUserWishlists = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const wishlists = await Wishlist.findAllByUser(userId);

    res.json({
      wishlists,
      count: wishlists.length
    });
  } catch (error) {
    console.error("Get user wishlists error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get wishlist by ID
export const getWishlistById = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ wishlistId: req.params.id });
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Check if user has access (owner or public wishlist)
    const userId = req.user?.userId;
    if (!wishlist.isPublic && wishlist.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ wishlist });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new wishlist
export const createWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistName, isPublic } = req.body;

    if (!wishlistName) {
      return res.status(400).json({ message: "Wishlist name is required" });
    }

    const wishlist = new Wishlist({
      userId,
      wishlistName,
      isPublic: isPublic || false,
      isDefault: false // Additional wishlists are not default
    });

    await wishlist.save();

    res.status(201).json({
      message: "Wishlist created successfully",
      wishlist
    });
  } catch (error) {
    console.error("Create wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add item to wishlist
export const addItemToWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistId, productId, variantId, priority, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Get wishlist
    let wishlist;
    if (wishlistId) {
      wishlist = await Wishlist.findOne({ wishlistId, userId });
    } else {
      // Use default wishlist
      wishlist = await Wishlist.findDefaultByUser(userId);
      if (!wishlist) {
        wishlist = new Wishlist({ userId, isDefault: true });
      }
    }

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Fetch product details
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get the appropriate price
    let currentPrice = product.pricing.sellingPrice;
    if (variantId) {
      const variant = product.variants.find(v => v.variantId === variantId);
      if (variant && variant.variantPrice) {
        currentPrice = variant.variantPrice;
      }
    }

    // Get primary image
    const primaryImage = product.images.find(img => img.imageType === 'primary');

    // Add item to wishlist
    wishlist.addItem({
      productId,
      variantId,
      priority,
      notes,
      productName: product.productName,
      productImage: primaryImage?.imageUrl || product.images[0]?.imageUrl,
      currentPrice
    });

    await wishlist.save();

    res.json({
      message: "Item added to wishlist successfully",
      wishlist,
      itemCount: wishlist.getItemCount()
    });
  } catch (error) {
    console.error("Add item to wishlist error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Remove item from wishlist
export const removeItemFromWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistItemId } = req.params;

    // Find user's default wishlist or by query param
    const { wishlistId } = req.query;
    let wishlist;
    
    if (wishlistId) {
      wishlist = await Wishlist.findOne({ wishlistId, userId });
    } else {
      wishlist = await Wishlist.findDefaultByUser(userId);
    }
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.removeItem(wishlistItemId);
    await wishlist.save();

    res.json({
      message: "Item removed from wishlist successfully",
      wishlist,
      itemCount: wishlist.getItemCount()
    });
  } catch (error) {
    console.error("Remove item from wishlist error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Update item priority
export const updateItemPriority = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistItemId, priority } = req.body;

    if (!wishlistItemId || !priority) {
      return res.status(400).json({ message: "Wishlist item ID and priority are required" });
    }

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.updateItemPriority(wishlistItemId, priority);
    await wishlist.save();

    res.json({
      message: "Item priority updated successfully",
      wishlist
    });
  } catch (error) {
    console.error("Update item priority error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Update item notes
export const updateItemNotes = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistItemId, notes } = req.body;

    if (!wishlistItemId) {
      return res.status(400).json({ message: "Wishlist item ID is required" });
    }

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.updateItemNotes(wishlistItemId, notes);
    await wishlist.save();

    res.json({
      message: "Item notes updated successfully",
      wishlist
    });
  } catch (error) {
    console.error("Update item notes error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Update wishlist settings
export const updateWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistId } = req.params;
    const { wishlistName, isPublic, isDefault } = req.body;

    const wishlist = await Wishlist.findOne({ wishlistId, userId });
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Update fields
    if (wishlistName !== undefined) wishlist.wishlistName = wishlistName;
    if (isPublic !== undefined) wishlist.isPublic = isPublic;
    
    // If setting as default, unset other defaults
    if (isDefault === true) {
      await Wishlist.updateMany(
        { userId, wishlistId: { $ne: wishlistId } },
        { isDefault: false }
      );
      wishlist.isDefault = true;
    }

    await wishlist.save();

    res.json({
      message: "Wishlist updated successfully",
      wishlist
    });
  } catch (error) {
    console.error("Update wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete wishlist
export const deleteWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistId } = req.params;

    const wishlist = await Wishlist.findOne({ wishlistId, userId });
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Cannot delete default wishlist if it's the only one
    if (wishlist.isDefault) {
      const userWishlists = await Wishlist.find({ userId });
      if (userWishlists.length === 1) {
        return res.status(400).json({ 
          message: "Cannot delete your only wishlist" 
        });
      }
      
      // Set another wishlist as default
      const nextWishlist = userWishlists.find(w => w.wishlistId !== wishlistId);
      if (nextWishlist) {
        nextWishlist.isDefault = true;
        await nextWishlist.save();
      }
    }

    await Wishlist.deleteOne({ wishlistId });

    res.json({ message: "Wishlist deleted successfully" });
  } catch (error) {
    console.error("Delete wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Clear wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistId } = req.params;

    let wishlist;
    if (wishlistId) {
      wishlist = await Wishlist.findOne({ wishlistId, userId });
    } else {
      wishlist = await Wishlist.findDefaultByUser(userId);
    }
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.clearWishlist();
    await wishlist.save();

    res.json({
      message: "Wishlist cleared successfully",
      wishlist
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Check if product is in wishlist
export const checkProductInWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { productId, variantId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.json({ inWishlist: false });
    }

    const inWishlist = wishlist.hasProduct(productId, variantId || null);

    res.json({ inWishlist });
  } catch (error) {
    console.error("Check product in wishlist error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get items by priority
export const getItemsByPriority = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { priority } = req.params;

    if (!['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.json({ items: [], count: 0 });
    }

    const items = wishlist.getItemsByPriority(priority);

    res.json({
      items,
      count: items.length
    });
  } catch (error) {
    console.error("Get items by priority error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get price drops
export const getPriceDrops = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.json({ priceDrops: [], count: 0 });
    }

    const priceDrops = wishlist.getPriceDrops();

    res.json({
      priceDrops,
      count: priceDrops.length,
      totalSavings: priceDrops.reduce((sum, item) => sum + item.priceDrop, 0)
    });
  } catch (error) {
    console.error("Get price drops error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Move item to cart
export const moveItemToCart = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { wishlistItemId } = req.body;

    if (!wishlistItemId) {
      return res.status(400).json({ message: "Wishlist item ID is required" });
    }

    const wishlist = await Wishlist.findDefaultByUser(userId);
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    const item = wishlist.wishlistItems.find(
      i => i.wishlistItemId === wishlistItemId
    );

    if (!item) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    // Get Cart model
    const Cart = mongoose.model('Cart');
    let cart = await Cart.findActiveByUser(userId);
    
    if (!cart) {
      cart = new Cart({ userId });
    }

    // Add to cart
    cart.addItem({
      productId: item.productId,
      variantId: item.variantId,
      quantity: 1,
      unitPrice: item.currentPrice,
      productName: item.productName,
      productImage: item.productImage,
      productSku: null // Will be fetched from product if needed
    });

    await cart.save();

    // Remove from wishlist
    wishlist.removeItem(wishlistItemId);
    await wishlist.save();

    res.json({
      message: "Item moved to cart successfully",
      cart,
      wishlist
    });
  } catch (error) {
    console.error("Move item to cart error:", error);
    res.status(500).json({ 
      message: error.message || "Server error", 
      error: error.message 
    });
  }
};

// Get public wishlists
export const getPublicWishlists = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const wishlists = await Wishlist.findPublicWishlists(parseInt(limit));

    res.json({
      wishlists,
      count: wishlists.length
    });
  } catch (error) {
    console.error("Get public wishlists error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get wishlist statistics (admin)
export const getWishlistStats = async (req, res) => {
  try {
    const totalWishlists = await Wishlist.countDocuments();
    const publicWishlists = await Wishlist.countDocuments({ isPublic: true });
    const totalUsers = await Wishlist.distinct('userId');

    // Most wishlisted products
    const mostWishlisted = await Wishlist.aggregate([
      { $unwind: '$wishlistItems' },
      { 
        $group: { 
          _id: '$wishlistItems.productId',
          count: { $sum: 1 },
          productName: { $first: '$wishlistItems.productName' },
          productImage: { $first: '$wishlistItems.productImage' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Average items per wishlist
    const avgItems = await Wishlist.aggregate([
      {
        $group: {
          _id: null,
          avgItems: { $avg: { $size: '$wishlistItems' } }
        }
      }
    ]);

    res.json({
      statistics: {
        totalWishlists,
        publicWishlists,
        totalUsers: totalUsers.length,
        averageItemsPerWishlist: Math.round((avgItems[0]?.avgItems || 0) * 10) / 10,
        mostWishlistedProducts: mostWishlisted
      }
    });
  } catch (error) {
    console.error("Get wishlist stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};