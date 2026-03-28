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
7.  **Review & Deploy**: Once deployed, App Runner will give you a service URL (e.g., `https://random-id.aws-region.awsapprunner.com`).

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
