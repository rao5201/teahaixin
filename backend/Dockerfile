FROM node:18-slim

WORKDIR /app

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install
COPY package*.json ./
RUN npm install --production

# Copy app code
COPY . .

# Create data directory
RUN mkdir -p data

# HF Spaces requires port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "server.js"]
