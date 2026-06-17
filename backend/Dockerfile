# backend/Dockerfile

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# build deps สำหรับ native module (bcrypt) บน alpine/musl
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# คัดลอก node_modules (bcrypt ถูก compile ใน build stage บน base image เดียวกัน → binary เข้ากันได้)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# migration: app.module รัน migrationsRun ตอน boot ถ้า MIGRATIONS_RUN != 'false' (default true)
# compose stack ตั้ง MIGRATIONS_RUN=false แล้ว delegate ให้ migrate service แยก (กัน race หลาย instance)
CMD ["node", "dist/main.js"]
