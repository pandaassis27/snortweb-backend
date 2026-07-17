import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";

console.log("Model Name:", Admin.modelName);
console.log("Collection Name:", Admin.collection.name);
