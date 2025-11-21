FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code (including Tailwind config)
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]