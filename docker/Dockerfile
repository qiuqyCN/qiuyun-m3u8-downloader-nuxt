# ===== 构建阶段：生成静态产物 =====
# 构建上下文是 nuxt 项目目录（docker/ 的上一级）
FROM node:22-alpine AS build
WORKDIR /app

# 只复制依赖清单，利用 Docker 层缓存：依赖不变时跳过 npm ci
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 复制源码并静态化构建
COPY . .
RUN npm run generate

# ===== 运行阶段：Nginx 托管静态文件 =====
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
