const db = require("./utils/db");
const { respond, corsHeaders, getUserFromRequest, generateId } = require("./utils/auth-helpers");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  const userId = getUserFromRequest(event);
  if (!userId) {
    return respond(401, { error: "Unauthorized" });
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const { gmail, password } = body;

    if (!gmail || !password) {
      return respond(400, { error: "Gmail and password are required" });
    }

    const { data: gmails, sha } = await db.getFile("gmails.json");
    const { data: users } = await db.getFile("users.json");
    const user = users.find((u) => u.id === userId);

    const newGmail = {
      id: generateId(),
      userId,
      userName: user ? user.fullName : "Unknown",
      gmail,
      password,
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
    };

    gmails.push(newGmail);
    const saved = await db.saveFile("gmails.json", gmails, sha);
    if (!saved) {
      return respond(500, { error: "Failed to submit. Please try again." });
    }

    const userGmails = gmails.filter((g) => g.userId === userId);
    return respond(200, {
      message: "Gmail submitted successfully",
      pendingGmails: userGmails.filter((g) => g.status === "pending").length,
      approvedGmails: userGmails.filter((g) => g.status === "approved").length,
    });
  }

  return respond(405, { error: "Method not allowed" });
};
