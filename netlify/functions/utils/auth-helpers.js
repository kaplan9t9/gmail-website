const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createToken(userId) {
  const secret = process.env.SESSION_SECRET || "gmail-web-secret-key-2024";
  const hmac = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [userId, ...rest] = token.split(".");
  if (!userId || rest.length === 0) return null;
  const expected = createToken(userId);
  if (token === expected) return userId;
  return null;
}

function generateId() {
  return crypto.randomBytes(12).toString("hex");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function getUserFromRequest(event) {
  const auth = event.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  return verifyToken(token);
}

module.exports = {
  hashPassword,
  createToken,
  verifyToken,
  generateId,
  corsHeaders,
  respond,
  getUserFromRequest,
};
