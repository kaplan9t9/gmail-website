const GITHUB_API = "https://api.github.com";

async function getFile(filePath) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/data/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "gmail-website",
        },
      }
    );

    if (response.status === 404) {
      return { data: [], sha: null };
    }

    if (!response.ok) {
      console.error("GitHub API error:", response.status, await response.text());
      return { data: [], sha: null };
    }

    const result = await response.json();
    const content = Buffer.from(result.content, "base64").toString("utf-8");
    return { data: JSON.parse(content), sha: result.sha };
  } catch (err) {
    console.error("Error reading from GitHub:", err);
    return { data: [], sha: null };
  }
}

async function saveFile(filePath, data, sha) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  try {
    const body = {
      message: `Update ${filePath} - ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/data/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "gmail-website",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error("GitHub save error:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error saving to GitHub:", err);
    return false;
  }
}

async function getSettings() {
  const { data, sha } = await getFile("settings.json");
  if (!data || Array.isArray(data)) {
    return {
      data: { videoUrl: "", namesList: [] },
      sha,
    };
  }
  return { data, sha };
}

async function saveSettings(data, sha) {
  return saveFile("settings.json", data, sha);
}

module.exports = { getFile, saveFile, getSettings, saveSettings };
