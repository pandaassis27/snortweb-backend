import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },

        username: {
            type: String,
            default: "Unknown",
        },

        action: {
            type: String,
            required: true,
            trim: true,
        },

        resource: {
            type: String,
            required: true,
            trim: true,
        },

        ipAddress: {
            type: String,
            default: "",
        },

        userAgent: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["success", "failed"],
            default: "success",
        },

        details: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("AuditLog", auditLogSchema);