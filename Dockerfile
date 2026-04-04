FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/ ./lib/

# Install dependencies
RUN npm ci --workspaces --include-workspace-root

# Copy remaining source
COPY artifacts/api-server/src ./artifacts/api-server/src
COPY artifacts/api-server/tsconfig.json ./artifacts/api-server/
COPY artifacts/api-server/build.mjs ./artifacts/api-server/

# Build API
RUN npm --workspace @workspace/api-server run build

EXPOSE 3001

ENV NODE_ENV=production
ENV JWT_SECRET=${JWT_SECRET:-default-secret-change-in-production}

CMD ["npm", "--workspace", "@workspace/api-server", "start"]
