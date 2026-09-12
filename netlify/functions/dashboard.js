const db = require("./utils/db");
const { respond, corsHeaders, getUserFromRequest } = require("./utils/auth-helpers");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  const userId = getUserFromRequest(event);
  if (!userId) {
    return respond(401, { error: "Unauthorized" });
  }

  const { data: users } = await db.getFile("users.json");
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return respond(404, { error: "User not found" });
  }

  const { data: gmails } = await db.getFile("gmails.json");
  const userGmails = gmails.filter((g) => g.userId === userId);
  const pendingCount = userGmails.filter((g) => g.status === "pending").length;
  const approvedCount = userGmails.filter((g) => g.status === "approved").length;

  const { data: withdrawals } = await db.getFile("withdrawals.json");
  const userWithdrawals = withdrawals.filter((w) => w.userId === userId);
  const pendingWithdraw = userWithdrawals.find((w) => w.status === "pending");

  const { data: settings } = await db.getSettings();

  return respond(200, {
    user: { id: user.id, fullName: user.fullName, gmail: user.gmail },
    pendingGmails: pendingCount,
    approvedGmails: approvedCount,
    gmails: userGmails,
    withdrawals: userWithdrawals,
    hasPendingWithdraw: !!pendingWithdraw,
    videoUrl: settings.videoUrl || "",
    namesList: settings.namesList || [],
  });
};
