FROM node:latest
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install -g ts-node \
run npm install typescript -g
RUN npm install
RUN npm run build
COPY . .


FROM node:latest
WORKDIR /app
COPY . .
COPY package.json ./
RUN npm install --only=production
COPY --from=0 /app/dist .
RUN npm install pm2@latest -g


CMD ["pm2-runtime", "./index.js"]
