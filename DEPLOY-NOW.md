# Deploy this project correctly

## Recommended: GitHub + Netlify

1. Extract this ZIP. The files inside this folder are the project root.
2. Copy the contents directly into your GitHub repository. Do not create another `gmail-website` folder inside it.
3. In Netlify, choose **Add new site → Import an existing project → GitHub**.
4. Select the repository.
5. Build settings:
   - Base directory: leave blank
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
6. Add these environment variables:
   - `GITHUB_TOKEN`: a GitHub token with repository Contents read/write access
   - `GITHUB_OWNER`: `KAPLAN9t9`
   - `GITHUB_REPO`: `gmail-website`
   - `SESSION_SECRET`: a long random secret
7. Deploy, then open the site root URL.

## Important

Do not upload the outer ZIP as a normal static folder and expect serverless functions to work. Use the GitHub import method above. If using Netlify manual deploy, upload the `public` folder for the frontend, but the Netlify Functions backend must be deployed through a connected repository or Netlify CLI.

Never put your GitHub token in frontend code, GitHub files, screenshots, or chat messages.
