// Reads the token from the Authorization: Bearer ... header.
// Verifies its signature and expiry using your existing backend/utils/adminAuth.js.
// Checks the current user in MongoDB to ensure their role is admin and their status is active.
// Sets req.admin so your schema-management routes can record who updated a schema.


const User = require("../../models/User");
const { verifyToken } = require("../../utils/adminAuth");

async function requireAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    const payload = verifyToken(token);

    if (
      !payload ||
      typeof payload.sub !== "string") {
      return res.status(401).json({
        message: "Invalid or expired authentication token."
      });
    }

    const admin = await User.findById(payload.sub)
      .select("_id fullName email role status");

    if (
      !admin ||
      admin.role !== "admin" ||
      admin.status !== "active"
    ) {
      return res.status(403).json({
        message: "Administrator access is required."
      });
    }

    req.admin = admin;
    return next();
  } catch (error) {
    console.error("Admin authentication failed:", error.message);

    return res.status(401).json({
      message: "Invalid or expired authentication token."
    });
  }
}

module.exports = { requireAdmin };


