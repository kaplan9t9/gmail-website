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
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return respond(400, { error: "Comment cannot be empty" });
    }

    const { data: comments, sha } = await db.getFile("comments.json");
    const { data: users } = await db.getFile("users.json");
    const user = users.find((u) => u.id === userId);

    const newComment = {
      id: generateId(),
      userId,
      userName: user ? user.fullName : "Unknown",
      userNumber: user ? user.easyPaisaNumber : "",
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    const saved = await db.saveFile("comments.json", comments, sha);
    if (!saved) {
      return respond(500, { error: "Failed to submit comment. Please try again." });
    }

    return respond(200, { message: "Comment submitted successfully" });
  }

  return respond(405, { error: "Method not allowed" });
};
