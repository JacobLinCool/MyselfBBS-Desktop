FROM node:latest as builder

WORKDIR /app
COPY . .
RUN npm i -g pnpm
RUN rm -rf out dist
RUN pnpm i && pnpm build:headless && pnpm prune --prod

FROM node:latest as runner

COPY --from=builder /app /app
WORKDIR /app
ENTRYPOINT ["npm", "run", "headless", "--", "-s", "/store" ]
CMD ["-p", "29620"]
