# Base multi-runtime container blueprint
FROM node:20-slim AS builder

WORKDIR /app

# Install native building tooling and Python3
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package dependencies
COPY package*.json ./
RUN npm ci

# Copy full codebase
COPY . .

# Compile static frontend Vite distribution along with server bundling
RUN npm run build

# Production runtime container
FROM node:20-slim AS runner

WORKDIR /app

# Ensure runtime has Python3 and SQLAlchemy dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-sqlalchemy \
    && rm -rf /var/lib/apt/lists/*

# Expose port 3000 as strictly required by Cloud Run mapping
ENV PORT=3000
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/node_modules ./node_modules

# Ensure persistence databases folder is available
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "dist/server.js"]
