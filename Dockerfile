FROM node:alpine as builder

WORKDIR /app
RUN apk add --no-cache make python3 g++
RUN npm i -g pnpm
COPY . .
RUN rm -rf dist
RUN pnpm i && pnpm rebuild && pnpm build:headless && pnpm prune --prod

FROM node:alpine as runner

COPY --from=builder /app /app
WORKDIR /app
ENTRYPOINT ["npm", "run", "headless", "--", "-s", "/store" ]
