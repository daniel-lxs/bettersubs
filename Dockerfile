FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .

# Create a separate volume for the SQLite database
VOLUME /app/db

# Copy the init script to the working directory
COPY src/db/init.sql .

# Create and initialize the SQLite database during the build
RUN sqlite3 /app/db/sqlite.db < init.sql

ENV NODE_ENV production
CMD ["bun", "src/index.ts"]

EXPOSE 3000
