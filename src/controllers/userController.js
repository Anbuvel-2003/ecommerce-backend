import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../model/UserModel.js";

// ======================= REGISTER =======================
export const registerUser = async (req, res) => {
  try {
    const { email, mobilenumber, password, firstname, lastname } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobilenumber }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      mobilenumber,
      password: hashedPassword,
      firstname,
      lastname,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= LOGIN =======================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userid: user.userid, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    user.token = token;
    user.lastlogin = new Date();
    await user.save();

    res.status(200).json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= CREATE USER (ADMIN) =======================
export const createUser = async (req, res) => {
  try {
    const { email, mobilenumber, password, firstname, lastname, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { mobilenumber }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      mobilenumber,
      password: hashedPassword,
      firstname,
      lastname,
      role: role || "user"
    });

    await user.save();
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= GET ALL USERS (with pagination, filter, sort) =======================
export const getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = "createdat", order = "desc", search, role, isactive } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstname: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
        { mobilenumber: { $regex: search, $options: "i" } }
      ];
    }
    if (role) filter.role = role;
    if (isactive !== undefined) filter.isactive = isactive === "true";

    const users = await User.find(filter)
      .select("-password -refreshtoken")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      total,
      page,
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= GET SINGLE USER =======================
export const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ userid: req.params.userid }).select("-password -refreshtoken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= UPDATE USER =======================
export const updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { userid: req.params.userid },
      updateData,
      { new: true }
    ).select("-password -refreshtoken");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================= DELETE USER (SOFT) =======================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userid: req.params.userid },
      { isdelete: true, isactive: false },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deactivated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
