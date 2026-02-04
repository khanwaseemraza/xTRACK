FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production || npm install
COPY . .
RUN npm run build
EXPOSE 8787
CMD ["npm","run","start"]
