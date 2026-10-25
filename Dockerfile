# Production Dockerfile for NexvoraMeeting
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and client package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install root dependencies
RUN npm install

# Install client dependencies
WORKDIR /app/client
RUN npm install

# Copy all source code
WORKDIR /app
COPY . .

# Build client React application
WORKDIR /app/client
RUN npm run build

# Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm install --omit=dev

# Copy backend files and built client distribution
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist
COPY client/public ./client/public

EXPOSE 5000

CMD ["node", "server/server.js"]
