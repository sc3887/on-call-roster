# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY backend backend
RUN --mount=type=secret,id=prisma_ca,required=false \
    if [ -s /run/secrets/prisma_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/prisma_ca; \
    fi && \
    npm run db:generate --workspace=backend && npm run build --workspace=backend

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/prisma backend/prisma
COPY --from=build /app/backend/scripts backend/scripts
COPY --from=build /app/backend/node_modules/.prisma backend/node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma/engines backend/node_modules/@prisma/engines
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate --workspace=backend && node backend/dist/prisma/seed.js && npm run start --workspace=backend"]
