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
    const { holderName, easyPaisaNumber } = body;

    if (!holderName || !easyPaisaNumber) {
      return respond(400, { error: "Holder name and EasyPaisa number are required" });
    }

    const { data: gmails } = await db.getFile("gmails.json");
    const userGmails = gmails.filter((g) => g.userId === userId);
    const approvedCount = userGmails.filter((g) => g.status === "approved").length;

    if (approvedCount < 10) {
      return respond(400, {
        error: `You need 10 approved Gmails to withdraw. You currently have ${approvedCount}.`,
      });
    }

    const { data: withdrawals, sha } = await db.getFile("withdrawals.json");
    const pendingWithdraw = withdrawals.find(
      (w) => w.userId === userId && w.status === "pending"
    );
    if (pendingWithdraw) {
      return respond(400, { error: "You already have a pending withdrawal request" });
    }

    const { data: users } = await db.getFile("users.json");
    const user = users.find((u) => u.id === userId);

    const newWithdrawal = {
      id: generateId(),
      userId,
      userName: user ? user.fullName : "Unknown",
      holderName,
      easyPaisaNumber,
      approvedGmailCount: approvedCount,
      status: "pending",
      requestedAt: new Date().toISOString(),
      approvedAt: null,
    };

    withdrawals.push(newWithdrawal);
    const saved = await db.saveFile("withdrawals.json", withdrawals, sha);
    if (!saved) {
      return respond(500, { error: "Failed to submit withdrawal. Please try again." });
    }

    return respond(200, { message: "Withdrawal request submitted successfully" });
  }

  return respond(405, { error: "Method not allowed" });
};
