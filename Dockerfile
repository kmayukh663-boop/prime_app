# Use lightweight Nginx alpine image
FROM nginx:alpine

# Copy custom Nginx routing rules
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all your frontend web pages into Nginx's public web root
COPY public/ /usr/share/nginx/html/

# Expose port 80 for web traffic
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]