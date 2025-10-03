
import Address from "../model/Address.js";
import User from "../model/UserModel.js";


// Add new address
export const addAddress = async (req, res) => {
  try {
    // Check if user exists
       const { userid } = req.params; 
    const user = await User.findOne({ userid });
    if (!user) return res.status(404).json({ message: "User not found",success: false });

    const address = new Address(req.body);
    await address.save();

    res.status(201).json({ message: "Address added successfully", address,success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.messag,success: false });
  }
};

// Get all addresses of a user
export const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userid: req.params.userid, isactive: true });
    res.status(200).json({
      message: "Addresses retrieved successfully",
      count: addresses.length,
      success: true,
      addresses,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message,success: false });
  }
};

// Get single address
export const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ addressid: req.params.addressid });
    if (!address) return res.status(404).json({ message: "Address not found",success: false });
    res.status(200).json({
      message: "Address retrieved successfully",
      success: true,
      address,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message ,success: false});
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const updatedAddress = await Address.findOneAndUpdate(
      { addressid: req.params.addressid },
      req.body,
      { new: true }
    );
    if (!updatedAddress) return res.status(404).json({ message: "Address not found", success: false });

    res.status(200).json({ message: "Address updated", address: updatedAddress, success: true});
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message, success: false });
  }
};

// Delete address (soft delete)
export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndUpdate(
      { addressid: req.params.addressid },
      { isactive: false },
      { new: true }
    );
    if (!address) return res.status(404).json({ message: "Address not found", success: false });

    res.status(200).json({ message: "Address deleted successfully", address, success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message, success: false });
  }
};
