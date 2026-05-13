# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache node_modules
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source và build (VITE_ vars được inject lúc build)
COPY . .

# Không cần ghi đè .env bằng ARG nữa, Vite sẽ tự động đọc file .env.production
RUN npm run build

# ─── Stage 2: Nginx Runtime ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Xóa config mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config tùy chỉnh (hỗ trợ React Router + proxy API)
COPY nginx.conf /etc/nginx/conf.d/smartdss.conf

# Copy build output từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
