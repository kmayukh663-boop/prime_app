
const crypto = require("crypto");
const User = require("../models/User");

const TOKEN_TTL_SECONDS = 10 * 60;

function getSecret() {
  const secret = process.env.ADMIN_TOKEN_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("ADMIN_TOKEN_SECRET must contain at least 32 bytes.");
  }

  return secret;
}

function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    sub: String(userId),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== "string" || token.length > 4096) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest();

    const received = Buffer.from(signature, "base64url");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof decoded.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded.sub) ||
      !Number.isInteger(decoded.exp) ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      return res.status(401).json({
        message: "Admin authentication required."
      });
    }

    const payload = verifyToken(match[1]);

    if (!payload) {
      return res.status(401).json({
        message: "Invalid or expired token."
      });
    }

    const user = await User.findById(payload.sub)
      .select("_id role status")
      .lean();

    if (!user || user.role !== "admin" || user.status !== "active") {
      return res.status(403).json({
        message: "Active admin access required."
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    if (error.message.includes("ADMIN_TOKEN_SECRET")) {
      console.error(error.message);
      return res.status(500).json({
        message: "Authentication is not configured correctly."
      });
    }

    console.error("Admin authentication failed:", error.message);
    return res.status(500).json({
      message: "Unable to verify admin access."
    });
  }
}

module.exports = {
  signToken,
  verifyToken,
  requireAdmin
};
