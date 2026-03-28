FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install all dependencies (postinstall will build React)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build React app (in case postinstall didn't catch it)
RUN npm run build

# Expose the port
EXPOSE 3001

# Start the Express server
CMD ["node", "backend-server/server.js"]
