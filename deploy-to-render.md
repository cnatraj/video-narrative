# Deploying to Render.com

This guide will walk you through deploying the YouTube Narrative Service to Render.com as separate frontend and backend services.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Your project code pushed to a GitHub repository

## Deployment Options

### Option 1: Blueprint Deployment (Using render.yaml)

This is the recommended approach as it automatically sets up both services with the correct configuration:

1. Make sure your repository contains the `render.yaml` file
2. Log in to your Render dashboard
3. Click "New" and select "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file and create both services
6. You'll need to manually set your `OPENAI_API_KEY` after deployment

### Option 2: Manual Deployment (Separate Services)

If you prefer to set up the services manually:

#### Backend Deployment

1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: youtube-narrative-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: Starter ($7/month) or Free (with limitations)
5. Add environment variables:
   - `PORT`: 10000
   - `NODE_ENV`: production
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `FRONTEND_URL`: URL of your frontend service (once you have it)
6. Click "Create Web Service"

#### Frontend Deployment

1. In your Render dashboard, click "New" and select "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: youtube-narrative-frontend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm exec -- serve -s dist`
4. Add environment variables:
   - `NODE_ENV`: production
   - `VITE_API_URL`: Your backend URL + `/api` (e.g., `https://youtube-narrative-api.onrender.com/api`)
5. Click "Create Web Service"

## Post-Deployment

1. After deployment, note the URLs of both services
2. If you deployed manually, update the `FRONTEND_URL` environment variable in your backend service to point to your frontend URL
3. Test your application by visiting your frontend URL

## Troubleshooting

- **CORS Issues**: If you encounter CORS errors, check that your backend is properly configured to accept requests from your frontend domain
- **API Key**: Ensure your OpenAI API key is correctly set in the environment variables
- **Build Failures**: Check the build logs for any errors in the deployment process

## Scaling

The Starter plan ($7/month) should be sufficient for moderate usage. If you need more resources:

1. Go to your service in the Render dashboard
2. Click "Change Plan"
3. Select a higher tier plan based on your needs

## Benefits of Separate Services

- **Independent Scaling**: Scale frontend and backend resources independently
- **Better Resource Allocation**: Optimize each service for its specific needs
- **Improved Reliability**: Issues in one service don't necessarily affect the other
- **Easier Maintenance**: Update or restart one service without affecting the other
