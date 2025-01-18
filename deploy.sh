#!/bin/bash

# 确保脚本在错误时停止
set -e

# 构建前端项目
echo "Building frontend..."
npm run build

# 构建Docker镜像
echo "Building Docker images..."
docker-compose build

# 停止旧容器
echo "Stopping old containers..."
docker-compose down

# 启动新容器
echo "Starting new containers..."
docker-compose up -d

# 清理未使用的镜像和容器
echo "Cleaning up..."
docker system prune -f

echo "Deployment completed successfully!"
