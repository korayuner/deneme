# Java 17 + Node.js 20 — OpenDataLoader PDF için ikisi de gerekli
FROM eclipse-temurin:17-jre-alpine

# Node.js kur
RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 4000

CMD ["node", "src/index.js"]
