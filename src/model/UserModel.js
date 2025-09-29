import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// User Schema
const UserSchema = new mongoose.Schema(
  {
    userid: {
      type: String,
      unique: true,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    mobilenumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      match: [/^[+]?[\d\s-()]+$/, "Please enter a valid mobile number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    firstname: { type: String, trim: true },
    lastname: { type: String, trim: true },
    name: { type: String, trim: true },
    profileimage: { type: String },
    dateofbirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    role: {
      type: String,
      enum: ["admin", "superadmin", "user", "seller"],
      default: "user",
    },
    isemailverify: { type: Boolean, default: false },
    ismobilenumberverify: { type: Boolean, default: false },
    isactive: { type: Boolean, default: true },
    isdelete: { type: Boolean, default: false },
    fcmtoken: { type: String },
    token: { type: String },
    refreshtoken: { type: String },
    lastlogin: { type: Date },
    preferences: {
      language: { type: String, default: "en" },
      currency: { type: String, default: "INR" }, // 🇮🇳 Indian Rupee
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: { createdAt: "createdat", updatedAt: "updatedat" },
  }
);

// 🔑 Pre-save hook for password hashing
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Compare password
UserSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ✅ Generate JWT
UserSchema.methods.generateJWT = function () {
  const payload = { userid: this.userid, email: this.email, role: this.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Hide sensitive fields in JSON response
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.token;
  delete obj.refreshtoken;
  return obj;
};

const User = mongoose.model("User", UserSchema);
export default User;
