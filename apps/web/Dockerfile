FROM node:22-alpine
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @yaqeen/shared build && pnpm --filter @yaqeen/web build
EXPOSE 3008
CMD ["pnpm", "--filter", "@yaqeen/web", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3008"]
