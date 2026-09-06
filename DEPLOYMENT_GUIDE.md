# Comprehensive Deployment Guide: Ketab (Bilingual Sign Language Platform)

This guide provides a detailed, step-by-step walkthrough for deploying both the **React Frontend** and the **Node.js Backend**. 

## Architectural Overview
*   **Frontend**: React 19 (TypeScript) SPA.
*   **Backend**: Node.js Express server.
*   **Data**: Local JSON files (`server/data/`). 
    *   *Critical Note*: Because the app writes to local files, the backend **requires a persistent disk** or a service that doesn't wipe its storage on every restart if you want to keep user/visit data.

---

## Part 1: Deploying the Backend (The "API")

The backend must be deployed first so you have a URL to give to the frontend.

### Option A: AWS App Runner (Recommended for Speed)
App Runner is the easiest way to run a containerized or source-code-based Node.js app on AWS.

1.  **Log in** to the [AWS Management Console](https://console.aws.amazon.com/apprunner).
2.  **Create Service**:
    *   **Repository type**: Source code repository.
    *   **Connect to GitHub**: Follow the prompts to authorize AWS.
    *   **Repository**: Select `ibraheem-abusnineh/ketab`.
    *   **Branch**: `main`.
3.  **Configure Build**:
    *   **Runtime**: `Nodejs 18`.
    *   **Build command**: `cd server && npm install`.
    *   **Start command**: `cd server && node index.js`.
    *   **Port**: `5000`.
4.  **Configure Service**:
    *   **Service Name**: `ketab-api`.
    *   **Environment Variables**:
        *   `PORT`: `5000`
        *   `NODE_ENV`: `production`
5.  **Review and Create**: Wait ~5 minutes for deployment. 
    *   **Result**: You will get a URL like `https://abc123xyz.us-east-1.awsapprunner.com`. **Copy this.**

### Option B: Render.com (Easier Alternative)
1.  Sign in to [Render](https://render.com).
2.  Click **New** > **Web Service**.
3.  Connect GitHub and select the `ketab` repo.
4.  **Settings**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
5.  **Result**: You get a URL like `https://ketab-api.onrender.com`.

---

## Part 2: Deploying the Frontend (The "UI")

### Option A: AWS Amplify (Recommended)
Amplify is optimized for hosting React applications.

1.  **Log in** to [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2.  **Host Web App**:
    *   Select **GitHub**.
    *   Choose the `ketab` repository and `main` branch.
3.  **Build Settings**:
    *   Amplify will detect the app. **Edit the build settings (amplify.yml)** to ensure it only builds the frontend:
    ```yaml
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: build
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    ```
4.  **Environment Variables (CRITICAL)**:
    *   Under **App Settings** > **Environment variables**, add:
        *   `REACT_APP_API_URL`: Paste the URL of your backend (from Part 1).
5.  **Deploy**: Click **Save and deploy**.

---

## Part 3: Essential Post-Deployment Steps

### 1. Fix CORS (Cross-Origin Resource Sharing)
If the frontend cannot "talk" to the backend, you may need to update the backend allowed origins.
In `server/index.js`, the app currently uses `app.use(cors())`, which allows all origins. This is fine for now, but for high security, you should restrict it to your Amplify URL.

### 2. Update Basename for Subpaths
If you are deploying to a subdirectory (like `yourdomain.com/ketab/`), ensure you set the `homepage` field in `package.json` to that URL before building.

---

## Part 4: The "Data Persistence" Problem

**WARNING**: AWS App Runner and Render use "Ephemeral Storage." This means every time you update your code or the server restarts, any **NEW users** or **NEW visit counts** stored in the JSON files will be **DELETED**.

### Solutions for Production:
1.  **EC2 with EBS**: Deploy the backend to a standard AWS EC2 instance. The files stored on the EBS volume will never be deleted.
2.  **AWS S3 Storage**: Modify `server/utils/fileStorage.js` to read/write JSON files to an S3 bucket instead of the local folder.
3.  **Database**: Migrate the JSON storage logic to a real database like **Amazon DynamoDB** or **MongoDB**.

---

## Troubleshooting FAQ

**Q: The page is blank when I go to the URL.**
*   *Fix*: Check the browser console (F12). If you see "Basename mismatch," ensure the `Router` basename in `App.tsx` matches your URL structure.

**Q: I can't log in as Admin on the deployed site.**
*   *Fix*: Ensure the `REACT_APP_API_URL` environment variable was set correctly in Amplify *before* you clicked build. The frontend needs to know where the server is at compile time.

**Q: My CSV imports aren't working.**
*   *Fix*: Ensure the `server/uploads` folder exists on your server. In the latest update, I added logic to handle this, but some cloud providers restrict file uploads unless a "Persistent Disk" is attached.
