FROM node:18-alpine

WORKDIR /app

COPY server/package.json ./package.json
RUN npm install --omit=dev

COPY server/index.js ./index.js

ENV PORT=3001
EXPOSE 3001

CMD ["node", "index.js"]

