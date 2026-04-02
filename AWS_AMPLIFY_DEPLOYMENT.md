# Deploying Ketab to AWS Amplify

This guide explains how to deploy the **Ketab** project from GitHub to AWS. Because the project uses a React frontend and a Node.js Express backend with local JSON storage, you need a two-part deployment strategy.

## 1. Frontend Deployment (AWS Amplify Hosting)

Amplify Hosting is perfect for the React frontend.

1.  **Connect GitHub**:
    *   Log in to the [AWS Management Console](https://console.aws.amazon.com/amplify).
    *   Click **New App** > **Host web app**.
    *   Select **GitHub** and authorize AWS to access your repository.
    *   Select the `ketab` repository and the `main` branch.

2.  **Configure Build Settings**:
    Amplify will auto-detect the React app. Ensure the settings look like this:
    *   **App name**: `ketab-frontend`
    *   **Build command**: `npm install && npm run build`
    *   **Base directory**: `build`
    
3.  **Environment Variables**:
    *   In the Amplify console, go to **App settings** > **Environment variables**.
    *   Add `REACT_APP_API_URL`: Set this to the URL of your backend (see Step 2 below).

4.  **Deploy**: Click **Save and deploy**. Amplify will provide a `.amplifyapp.com` URL.

5.  **Configure Rewrites and Redirects (CRITICAL)**:
    React is a Single Page Application (SPA). For routing to work correctly when refreshing a page, you MUST add a redirect rule that handles international characters (like Arabic) and excludes your static folders.

    *   In the Amplify console, go to **App settings** > **Rewrites and redirects**.
    *   Click **Edit** > **Open JSON editor**.
    *   **Delete** all existing rules and paste this exact block:

```json
[
    {
        "source": "/static/<*>",
        "target": "/static/<*>",
        "status": "200",
        "condition": null
    },
    {
        "source": "/letters/<*>",
        "target": "/letters/<*>",
        "status": "200",
        "condition": null
    },
    {
        "source": "/images/<*>",
        "target": "/images/<*>",
        "status": "200",
        "condition": null
    },
    {
        "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|webm|wav|mp3|ogg)$)([^.]+$)/>",
        "target": "/index.html",
        "status": "200",
        "condition": null
    }
]
```
    *   Click **Save**.

---

## 2. Backend Deployment (AWS App Runner or EC2)

**Important**: The backend (`server/`) cannot run as a static site. It requires a persistent environment because it writes to JSON files.

### Recommended: AWS App Runner (Easiest)
App Runner is the simplest way to run the Express server.

1.  Go to the **AWS App Runner** console.
2.  Click **Create service**.
3.  **Source**: Select **Source code repository** and connect your GitHub.
4.  **Branch**: Select `main`.
5.  **Configure Build**:
    *   **Runtime**: `Node.js 18` (or higher)
    *   **Build command**: `cd server && npm install`
    *   **Start command**: `cd server && node index.js`
    *   **Port**: `5000`
6.  **Environment Variables**:
    *   Add `PORT`: `5000`
7.  **Health Check (IMPORTANT)**:
    *   **Protocol**: `HTTP`
    *   **Path**: `/api/health`
8.  **Review & Deploy**: Once deployed, App Runner will give you a service URL (e.g., `https://random-id.aws-region.awsapprunner.com`).

---

## 3. Connecting the Two

1.  Copy your **App Runner URL** (Backend).
2.  Go back to your **Amplify Frontend** settings.
3.  Update the `REACT_APP_API_URL` environment variable with your Backend URL.
4.  Redeploy the frontend.

## 4. Note on Data Persistence
Since the backend uses local JSON files (`server/data/*.json`):
*   **App Runner/Amplify**: Files will persist as long as the service is running. However, if the service restarts or redeploys, **changes made to users/visits via the UI will be lost** because these services use ephemeral storage.
*   **Production Recommendation**: For a permanent production environment, you should eventually migrate the `readJSON`/`writeJSON` logic in `server/utils/fileStorage.js` to use **Amazon DynamoDB** or **S3**, or host the server on an **EC2 instance with an EBS volume**.

---

## 5. Summary of URLs
*   **Frontend**: `https://main.your-app-id.amplifyapp.com`
*   **Backend Health Check**: `https://your-backend-url.awsapprunner.com/api/health`

---

## 6. Troubleshooting Common Issues

### 404 Error on CSS/JS Files
If you see 404 errors for files in `static/css/` or `static/js/` after deployment:
1.  **Check `package.json`**: Ensure `"homepage": "/"` is set correctly. If it's still pointing to a GitHub Pages URL, the paths in `index.html` will be incorrect for Amplify.
2.  **Clear Build Cache**: In the Amplify console, you can choose to "Redeploy" with a clean build.

### Pages 404 on Refresh
If navigating to a page like `/letters` works but refreshing the page gives an Amplify 404:
1.  **Rewrites and Redirects**: Ensure you have added the SPA rewrite rule mentioned in Step 1.5.

### API Connection Errors
If the frontend cannot talk to the backend:
1.  **Environment Variable**: Ensure `REACT_APP_API_URL` is set in the Amplify console (not just in your local `.env`).
2.  **Trailing Slash**: Make sure your `REACT_APP_API_URL` does NOT have a trailing slash (e.g., use `https://xyz.awsapprunner.com`, not `https://xyz.awsapprunner.com/`).
3.  **CORS**: Ensure your backend allows requests from your Amplify domain.
