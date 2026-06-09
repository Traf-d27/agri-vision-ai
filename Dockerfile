# Stage 1: Build the React application
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the build static assets with Nginx
FROM nginx:stable-alpine as production-stage

# Copy Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build assets from build-stage to Nginx default public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
