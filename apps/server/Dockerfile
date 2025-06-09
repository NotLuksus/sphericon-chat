# Stage 1: Build the Bun application
FROM oven/bun:latest AS base
WORKDIR /app
ENV HUSKY=0

FROM base AS install
RUN mkdir -p /temp/dev/packages/api
RUN mkdir -p /temp/dev/packages/db
RUN mkdir -p /temp/dev/packages/scripts
RUN mkdir -p /temp/dev/apps/server

# Copy all package.json files to /temp/dev for development dependencies
COPY package.json bun.lock /temp/dev/
COPY apps/server/package.json /temp/dev/apps/server/
COPY packages/api/package.json /temp/dev/packages/api/
COPY packages/db/package.json /temp/dev/packages/db/
COPY packages/scripts/package.json /temp/dev/packages/scripts/

# Install dev dependencies
RUN cd /temp/dev && bun install --frozen-lockfile

# Create directories for production dependencies
RUN mkdir -p /temp/prod/packages/api
RUN mkdir -p /temp/prod/packages/db
RUN mkdir -p /temp/prod/packages/scripts
RUN mkdir -p /temp/prod/apps/server

# Copy all package.json files to /temp/prod for production dependencies
COPY package.json bun.lock /temp/prod/
COPY apps/server/package.json /temp/prod/apps/server/
COPY packages/api/package.json /temp/prod/packages/api/
COPY packages/db/package.json /temp/prod/packages/db/
COPY packages/scripts/package.json /temp/prod/packages/scripts/

# Install production dependencies
RUN cd /temp/prod && bun install --frozen-lockfile --production
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

RUN bun build ./apps/server/src/index.ts --compile --outfile app

FROM base AS release
ENV USERNAME=computeruse
ENV HOME=/home/$USERNAME

COPY --from=prerelease /app/app $HOME/app

# Set permissions for the binary
RUN chmod +x $HOME/app
WORKDIR $HOME

ENV PORT=80

ENTRYPOINT [ "./app" ]
