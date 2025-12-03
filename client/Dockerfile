# Wrote with the help of: https://medium.com/@pepelajohn_/how-to-dockerize-a-next-js-app-typescript-20a453fef900

FROM node:22-alpine

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies without cache to ensure fresh packages
RUN npm install --no-cache

# Copy the rest of the application files
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

# Expose the port (if your app runs on a specific port)
EXPOSE 3000

# Set the command to start the application
CMD ["npm", "run", "dev"]