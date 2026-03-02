FROM node:24-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS runtime-dependencies-env
WORKDIR /app
RUN npm init -y \
  && npm pkg set private=true type=module \
  && npm install --omit=dev --no-audit --no-fund @react-router/serve@7.12.0 react-router@7.12.0

FROM node:24-alpine AS build-env
WORKDIR /app
COPY . .
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN npm run build

FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/server.js /app/server.js
EXPOSE 3000
CMD ["server.js"]
