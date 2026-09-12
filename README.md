# 📧 Gmail Management Website

A full-featured Gmail management platform built for deployment on **Netlify + GitHub only**.  
Users sign up, submit Gmail accounts, and request withdrawals. Admin approves/disqualifies from a dedicated panel.

---

## 🚀 Setup & Deployment (Step by Step)

### 1. Create a GitHub Repository
- Go to [github.com/new](https://github.com/new)
- Create a **new repository** (public or private)
- Clone it to your computer

### 2. Add Project Files
- Extract this ZIP into your repository folder
- Your folder structure should look like:
  ```
  your-repo/
  ├── netlify.toml
  ├── package.json
  ├── README.md
  ├── public/
  │   ├── index.html
  │   ├── signup.html
  │   ├── forgot-password.html
  │   ├── dashboard.html
  │   ├── admin.html
  │   ├── css/style.css
  │   └── js/
  │       ├── dashboard.js
  │       └── admin.js
  └── netlify/
      └── functions/
          ├── auth.js
          ├── dashboard.js
          ├── gmail.js
          ├── withdraw.js
          ├── comment.js
          ├── admin.js
          └── utils/
              ├── db.js
              └── auth-helpers.js
  ```

### 3. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 4. Create a GitHub Personal Access Token
- Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
- Click **Generate new token (classic)**
- Give it a name like `gmail-website`
- Select scopes: **repo** (full control of private repositories)
- Copy the token (starts with `ghp_...`)

### 5. Deploy on Netlify
- Go to [app.netlify.com](https://app.netlify.com)
- Click **"Add new site" → "Import an existing project"**
- Connect your GitHub repo
- Build settings should auto-detect from `netlify.toml`:
  - **Publish directory:** `public`
  - **Functions directory:** `netlify/functions`
- Click **Deploy**

### 6. Set Environment Variables
Go to **Site settings → Environment variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` | Your GitHub Personal Access Token |
| `GITHUB_OWNER` | `your-username` | Your GitHub username |
| `GITHUB_REPO` | `your-repo-name` | The repository name |
| `SESSION_SECRET` | `any-random-string-here` | A random secret for session tokens |

After adding these, **redeploy** the site (Deploys → Trigger deploy → Deploy site).

---

## 📖 How It Works

### Data Storage
All data is stored as JSON files in the `data/` folder of your GitHub repository:
- `data/users.json` — Registered users
- `data/gmails.json` — Submitted Gmail accounts
- `data/withdrawals.json` — Withdrawal requests
- `data/comments.json` — User comments/issues
- `data/settings.json` — Admin settings (video URL, names list)

These files are **automatically created** when the first user signs up or submits data.

### User Side
1. **Sign Up** with full name, EasyPaisa number, Gmail, and password
2. **Login** with EasyPaisa number and password
3. **Submit Gmails** — enter a Gmail address and its password
4. **Track** pending and approved Gmail counts
5. **Withdraw** when 10 Gmails are approved (enter EasyPaisa details)
6. **Comment** to send queries or issues to admin

### Admin Side
1. **Login** with your GitHub Token (same one in env variables)
2. **View all users** with their details and Gmail counts
3. **Approve or disqualify** each submitted Gmail
4. **Manage withdrawals** — approve pending requests
5. **Read user comments** and issues
6. **Settings** — set the Gmail formation video URL and names list

---

## 🎨 Features
- ✅ Dark & Light mode toggle
- ✅ Responsive design (mobile-friendly)
- ✅ Real-time counters (pending/approved Gmails)
- ✅ Gmail formation video from Google Drive
- ✅ Names list for Gmail creation
- ✅ Withdrawal system with EasyPaisa integration
- ✅ Comments/issues system
- ✅ Admin panel with full control
- ✅ No external databases or services needed

---

## ⚠️ Important Notes
- **GitHub API Rate Limit:** 5,000 requests/hour with a token. Sufficient for small-medium usage.
- **Concurrent writes:** If two users submit at the exact same second, one may fail. They can retry.
- **Security:** Passwords are hashed (SHA-256). Admin access requires the GitHub token.
- **Free Tier:** Works within Netlify's free tier (125K function invocations/month) and GitHub's free tier.

---

## 🛠 Troubleshooting
- **"Failed to save"** — Check that your `GITHUB_TOKEN` has `repo` permissions and the `GITHUB_OWNER`/`GITHUB_REPO` values are correct
- **Admin login fails** — Make sure you're using the exact same token as the `GITHUB_TOKEN` environment variable
- **Blank dashboard** — Check browser console for errors, verify env variables are set and site is redeployed
