FROM node:18-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建（如果需要）
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "run", "start"]
