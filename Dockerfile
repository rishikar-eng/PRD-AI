# Dockerfile for Hugging Face Spaces deployment.
#
# Single-service: backend builds the frontend during install, then serves
# both /api/* (Express routes) and / (static SPA) from one Node process.
# HF Spaces convention: app listens on port 7860.

FROM node:20-slim

WORKDIR /app

# Copy package manifests first so Docker can cache npm install layer
# across rebuilds when source changes but deps don't.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install root + client (with devDeps for Vite) + server deps
RUN cd client && npm install --include=dev && cd .. && \
    cd server && npm install && cd ..

# Now copy the full source
COPY . .

# Build the frontend (Vite -> client/dist)
RUN cd client && npm run build

# Production env + HF Spaces port
ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

WORKDIR /app/server
CMD ["node", "server.js"]
