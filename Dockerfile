FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .

RUN mkdir src/data/db

RUN bun run migrations

ENV NODE_ENV production
CMD ["bun", "src/index.ts"]

EXPOSE 3000
