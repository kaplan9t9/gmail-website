const db = require("./utils/db");
const {
  hashPassword, createToken, generateId, respond, corsHeaders
} = require("./utils/auth-helpers");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const body = JSON.parse(event.body || "{}");
  const action = body.action;

  if (action === "signup") {
    const { fullName, easyPaisaNumber, gmail, password, confirmPassword } = body;
    if (!fullName || !easyPaisaNumber || !gmail || !password || !confirmPassword) {
      return respond(400, { error: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return respond(400, { error: "Passwords do not match" });
    }
    if (password.length < 6) {
      return respond(400, { error: "Password must be at least 6 characters" });
    }

    const { data: users, sha } = await db.getFile("users.json");
    const exists = users.find(
      (u) => u.easyPaisaNumber === easyPaisaNumber || u.gmail === gmail
    );
    if (exists) {
      return respond(400, { error: "User already exists with this number or Gmail" });
    }

    const newUser = {
      id: generateId(),
      fullName,
      easyPaisaNumber,
      gmail,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const saved = await db.saveFile("users.json", users, sha);
    if (!saved) {
      return respond(500, { error: "Failed to save. Please try again." });
    }

    const token = createToken(newUser.id);
    return respond(200, {
      message: "Signup successful",
      token,
      user: { id: newUser.id, fullName: newUser.fullName, gmail: newUser.gmail },
    });
  }

  if (action === "login") {
    const { number, password } = body;
    if (!number || !password) {
      return respond(400, { error: "Number and password are required" });
    }

    const { data: users } = await db.getFile("users.json");
    const user = users.find(
      (u) => u.easyPaisaNumber === number && u.password === hashPassword(password)
    );
    if (!user) {
      return respond(401, { error: "Invalid number or password" });
    }

    const token = createToken(user.id);
    return respond(200, {
      message: "Login successful",
      token,
      user: { id: user.id, fullName: user.fullName, gmail: user.gmail },
    });
  }

  if (action === "forgot-password") {
    const { number, newPassword } = body;
    if (!number || !newPassword) {
      return respond(400, { error: "Number and new password are required" });
    }
    if (newPassword.length < 6) {
      return respond(400, { error: "Password must be at least 6 characters" });
    }

    const { data: users, sha } = await db.getFile("users.json");
    const userIndex = users.findIndex((u) => u.easyPaisaNumber === number);
    if (userIndex === -1) {
      return respond(404, { error: "No user found with this number" });
    }

    users[userIndex].password = hashPassword(newPassword);
    const saved = await db.saveFile("users.json", users, sha);
    if (!saved) {
      return respond(500, { error: "Failed to update password" });
    }

    return respond(200, { message: "Password updated successfully" });
  }

  return respond(400, { error: "Invalid action" });
};
