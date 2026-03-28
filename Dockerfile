FROM node:20-alpine

WORKDIR /app

# Copy all files at once (this project is small enough)
COPY . .

# Install all dependencies
RUN npm install

# Build the React frontend
RUN npm run build

# Expose the API port
EXPOSE 3001

# Start the server (serves both React and API)
CMD ["node", "backend-server/server.js"]
