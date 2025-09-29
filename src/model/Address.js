import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    addressid: {
      type: String,
      unique: true,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    userid: {
      type: String,
      required: true, // Foreign Key to User.userid
    },
    addresstype: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    mobilenumber: {
      type: String,
      required: true,
      match: [/^[+]?[\d\s-()]+$/, "Please enter a valid mobile number"],
    },
    houseno: { type: String, required: true },
    street: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
    pincode: { type: String, required: true },
    isdefault: { type: Boolean, default: false },
    isactive: { type: Boolean, default: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  {
    timestamps: { createdAt: "createdat", updatedAt: "updatedat" },
  }
);

const Address = mongoose.model("Address", AddressSchema);
export default Address;
