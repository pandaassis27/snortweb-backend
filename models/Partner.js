import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, required: true, trim: true },
    websiteUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", partnerSchema);
export default Partner;
