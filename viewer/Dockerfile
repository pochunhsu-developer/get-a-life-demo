FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
EXPOSE 4321
# astro.config 已設 port 4321 + host
CMD ["npm", "run", "dev", "--", "--host"]
