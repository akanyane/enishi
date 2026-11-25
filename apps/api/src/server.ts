import dotenv from "dotenv";
import connectDb from "./config/dbConnection";
import { createApp } from "./app";

dotenv.config();

connectDb();
const port = process.env.PORT || 5000;

createApp().listen(port, () => {
  console.log(`Server running on port ${port}`);
});
