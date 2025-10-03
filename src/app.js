import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoute.js";
import addressRoutes from "./routes/AddressRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();
await connectDB();
const PORT = process.env.PORT || 5003;
console.log("process.env.PORT",process.env.PORT);

const app = express();
// middleware 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);

// frontend routes
app.get("/", (req, res) => {
res.send("<h1>Hello..........</h1>");
});

app.listen(PORT, () => {
console.log(`server is running on port ${PORT}`);
});

