FROM node:20-alpine AS base
WORKDIR /app

# 只复制远程运行所需的最小文件集
COPY server ./server
COPY probe ./probe

ENV NODE_ENV=production
ENV NODE_API_HOST=0.0.0.0
ENV NODE_API_PORT=5050

EXPOSE 5050

CMD ["node", "server/node-api.js"]
