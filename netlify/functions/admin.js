const db = require("./utils/db");
const { respond, corsHeaders, generateId } = require("./utils/auth-helpers");

function verifyAdmin(event) {
  const auth = event.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  const adminToken = process.env.GITHUB_TOKEN;
  return token === adminToken;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  // Admin login
  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");

    if (body.action === "login") {
      const { githubToken } = body;
      if (!githubToken) {
        return respond(400, { error: "GitHub token is required" });
      }
      if (githubToken !== process.env.GITHUB_TOKEN) {
        return respond(401, { error: "Invalid GitHub token" });
      }
      return respond(200, { message: "Admin login successful", token: githubToken });
    }

    // All other actions require admin auth
    if (!verifyAdmin(event)) {
      return respond(401, { error: "Admin access required" });
    }

    // Approve Gmail
    if (body.action === "approve-gmail") {
      const { gmailId } = body;
      const { data: gmails, sha } = await db.getFile("gmails.json");
      const idx = gmails.findIndex((g) => g.id === gmailId);
      if (idx === -1) return respond(404, { error: "Gmail not found" });

      gmails[idx].status = "approved";
      gmails[idx].reviewedAt = new Date().toISOString();
      await db.saveFile("gmails.json", gmails, sha);
      return respond(200, { message: "Gmail approved" });
    }

    // Disqualify Gmail
    if (body.action === "disqualify-gmail") {
      const { gmailId } = body;
      const { data: gmails, sha } = await db.getFile("gmails.json");
      const idx = gmails.findIndex((g) => g.id === gmailId);
      if (idx === -1) return respond(404, { error: "Gmail not found" });

      gmails[idx].status = "disqualified";
      gmails[idx].reviewedAt = new Date().toISOString();
      await db.saveFile("gmails.json", gmails, sha);
      return respond(200, { message: "Gmail disqualified" });
    }

    // Approve Withdrawal
    if (body.action === "approve-withdrawal") {
      const { withdrawalId } = body;
      const { data: withdrawals, sha: wSha } = await db.getFile("withdrawals.json");
      const idx = withdrawals.findIndex((w) => w.id === withdrawalId);
      if (idx === -1) return respond(404, { error: "Withdrawal not found" });

      const userId = withdrawals[idx].userId;
      withdrawals[idx].status = "approved";
      withdrawals[idx].approvedAt = new Date().toISOString();
      await db.saveFile("withdrawals.json", withdrawals, wSha);

      // Reset user's approved Gmail count to 0 (mark them as "withdrawn")
      const { data: gmails, sha: gSha } = await db.getFile("gmails.json");
      let resetCount = 0;
      gmails.forEach((g) => {
        if (g.userId === userId && g.status === "approved") {
          g.status = "withdrawn";
          resetCount++;
        }
      });
      await db.saveFile("gmails.json", gmails, gSha);

      return respond(200, {
        message: `Withdrawal approved. ${resetCount} Gmails marked as withdrawn.`,
      });
    }

    // Update Settings (video URL, names list)
    if (body.action === "update-settings") {
      const { videoUrl, namesList } = body;
      const { data: settings, sha } = await db.getSettings();
      if (videoUrl !== undefined) settings.videoUrl = videoUrl;
      if (namesList !== undefined) settings.namesList = namesList;
      await db.saveSettings(settings, sha);
      return respond(200, { message: "Settings updated" });
    }

    return respond(400, { error: "Invalid action" });
  }

  // GET requests - admin data
  if (event.httpMethod === "GET") {
    if (!verifyAdmin(event)) {
      return respond(401, { error: "Admin access required" });
    }

    const section = event.queryStringParameters?.section || "all";

    if (section === "users" || section === "all") {
      const { data: users } = await db.getFile("users.json");
      const { data: gmails } = await db.getFile("gmails.json");

      const usersWithGmails = users.map((u) => {
        const userGmails = gmails.filter((g) => g.userId === u.id);
        return {
          id: u.id,
          fullName: u.fullName,
          easyPaisaNumber: u.easyPaisaNumber,
          gmail: u.gmail,
          createdAt: u.createdAt,
          totalGmails: userGmails.length,
          pendingGmails: userGmails.filter((g) => g.status === "pending").length,
          approvedGmails: userGmails.filter((g) => g.status === "approved").length,
        };
      });

      if (section === "users") {
        return respond(200, { users: usersWithGmails });
      }
    }

    if (section === "gmails" || section === "all") {
      const { data: gmails } = await db.getFile("gmails.json");
      if (section === "gmails") {
        return respond(200, { gmails });
      }
    }

    if (section === "pending-withdrawals" || section === "all") {
      const { data: withdrawals } = await db.getFile("withdrawals.json");
      const pending = withdrawals.filter((w) => w.status === "pending");
      if (section === "pending-withdrawals") {
        return respond(200, { withdrawals: pending });
      }
    }

    if (section === "approved-withdrawals" || section === "all") {
      const { data: withdrawals } = await db.getFile("withdrawals.json");
      const approved = withdrawals.filter((w) => w.status === "approved");
      if (section === "approved-withdrawals") {
        return respond(200, { withdrawals: approved });
      }
    }

    if (section === "comments" || section === "all") {
      const { data: comments } = await db.getFile("comments.json");
      if (section === "comments") {
        return respond(200, { comments });
      }
    }

    if (section === "settings" || section === "all") {
      const { data: settings } = await db.getSettings();
      if (section === "settings") {
        return respond(200, { settings });
      }
    }

    if (section === "all") {
      const { data: users } = await db.getFile("users.json");
      const { data: gmails } = await db.getFile("gmails.json");
      const { data: withdrawals } = await db.getFile("withdrawals.json");
      const { data: comments } = await db.getFile("comments.json");
      const { data: settings } = await db.getSettings();

      return respond(200, {
        users: users.map((u) => ({
          ...u,
          password: undefined,
        })),
        gmails,
        withdrawals,
        comments,
        settings,
        stats: {
          totalUsers: users.length,
          totalGmails: gmails.length,
          pendingGmails: gmails.filter((g) => g.status === "pending").length,
          approvedGmails: gmails.filter((g) => g.status === "approved").length,
          pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
          approvedWithdrawals: withdrawals.filter((w) => w.status === "approved").length,
          totalComments: comments.length,
        },
      });
    }

    return respond(400, { error: "Invalid section" });
  }

  return respond(405, { error: "Method not allowed" });
};
