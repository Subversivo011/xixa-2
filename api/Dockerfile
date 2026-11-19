FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js migrate.js ./
COPY migrations ./migrations
RUN node --check server.js && node --check migrate.js
USER node
EXPOSE 3000
CMD ["node", "server.js"]
