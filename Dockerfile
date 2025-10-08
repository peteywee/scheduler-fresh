FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "pnpm-lock.yaml", "./"]
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["pnpm", "start"]
