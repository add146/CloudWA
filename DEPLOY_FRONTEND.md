# CloudWA Frontend - Deployment Guide (Fixed)

We are using the existing **`cloudwa`** project on Cloudflare Pages.

## 🚀 Configuration Steps

1.  **Log in to Cloudflare Dashboard**
    -   Go to [dash.cloudflare.com](https://dash.cloudflare.com)
    -   Navigate to **Workers & Pages** > **cloudwa** (The existing project)

2.  **Verify/Update Settings**
    -   Go to **Settings** > **Builds & deployments**
    -   **Build configuration**:
        -   **Framework preset**: `Next.js`
        -   **Build command**: `npx @cloudflare/next-on-pages@1`
        -   **Build output directory**: `.vercel/output/static`
        -   **Root directory**: `frontend` (Ensure this is set!)

3.  **Environment Variables**
    -   Go to **Settings** > **Environment variables**
    -   Ensure `NEXT_PUBLIC_API_URL` is set to `https://cloudwa-flow.khibroh.workers.dev`
    -   Ensure `NODE_VERSION` is set to `20`

4.  **Redeploy (if needed)**
    -   Go to **Deployments** tab.
    -   If the latest deployment failed or didn't pick up changes, click **Create deployment** > **Retry**.

## Verification

Visit `https://cloudwa.pages.dev` to see the changes.
