# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args for environment variables
ARG VITE_DIRECTUS_URL=/api/directus
ARG VITE_PAPERLESS_URL=/api/paperless
ARG VITE_N8N_URL=/api/n8n
ARG VITE_PAPERLESS_EXTERNAL_URL=http://paperless.urla.online

ENV VITE_DIRECTUS_URL=$VITE_DIRECTUS_URL
ENV VITE_PAPERLESS_URL=$VITE_PAPERLESS_URL
ENV VITE_N8N_URL=$VITE_N8N_URL
ENV VITE_PAPERLESS_EXTERNAL_URL=$VITE_PAPERLESS_EXTERNAL_URL

RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
