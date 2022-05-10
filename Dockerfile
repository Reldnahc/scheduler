FROM node:latest
WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install
RUN npm install -g ts-node
COPY . .

CMD ["ts-node", "index.ts"]