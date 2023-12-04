FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .

# Create and initialize the SQLite database during the build
RUN bun run init-db

ENV NODE_ENV production
CMD ["bun", "src/index.ts"]

EXPOSE 3000
