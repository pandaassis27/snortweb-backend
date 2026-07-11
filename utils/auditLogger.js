import AuditLog from "../models/AuditLog.js";

export const logAudit = async ({
    req,
    action,
    resource,
    status = "success",
    details = {},
}) => {
    console.log("========== AUDIT LOGGER CALLED ==========");

    try {
        const log = await AuditLog.create({
            admin: req.user?._id || null,
            username: req.user?.username || "Unknown",
            action,
            resource,
            ipAddress:
                req.headers["x-forwarded-for"]?.split(",")[0] ||
                req.socket.remoteAddress ||
                "",
            userAgent: req.headers["user-agent"] || "",
            status,
            details,
        });

        console.log("Audit Log Saved:", log._id);
    } catch (err) {
        console.error("Audit Log Error:", err);
    }
};