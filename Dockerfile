FROM node:latest
WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install -g ts-node
RUN npm install -g nodemon
RUN npm install

COPY . .

ENTRYPOINT ["nodemon", "./index.ts"]
