import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ "code": 200, "message": "Server is running!" });
});

const PORT = process.env.port || 8003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});