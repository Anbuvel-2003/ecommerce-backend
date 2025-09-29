// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import connectDB from "./config/db.js";
// import userRoutes from "./routes/userRoutes.js";

// dotenv.config();
// connectDB();
// const PORT = process.env.PORT || 5002;

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use("/api/users", userRoutes);

// // Default Route
// app.get("/", (req, res) => {
//   res.send("<h1>Hello..........</h1>");
// });

// // Error Handler Middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: "Something went wrong!",
//     error: err.message,
//   });
// });

// // Start Server
// app.listen(PORT, () => {
//   console.log(`✅ Server is running on port ${PORT}`);
// });
