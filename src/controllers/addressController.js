
import Address from "../model/Address.js";
import User from "../model/UserModel.js";


// Add new address
export const addAddress = async (req, res) => {
  try {
    const { userid, firstname, lastname, mobilenumber, houseno, street, city, state, country, pincode } = req.body;

    // Check if user exists
    const user = await User.findOne({ userid });
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = new Address(req.body);
    await address.save();

    res.status(201).json({ message: "Address added successfully", address });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all addresses of a user
export const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userid: req.params.userid, isactive: true });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single address
export const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ addressid: req.params.addressid });
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.status(200).json(address);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
    if (!updatedAddress) return res.status(404).json({ message: "Address not found" });

    res.status(200).json({ message: "Address updated", address: updatedAddress });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
    if (!address) return res.status(404).json({ message: "Address not found" });

    res.status(200).json({ message: "Address deleted (soft)", address });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
