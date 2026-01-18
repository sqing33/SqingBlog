import Redis from "ioredis";

import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

export const redisClient: Redis =
  global.__redisClient ??
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

if (!global.__redisClient) {
  global.__redisClient = redisClient;
}

export async function ensureRedisConnected() {
  if (redisClient.status === "ready") return;
  if (redisClient.status === "connecting") return;
  if (redisClient.status === "connect") return;
  await redisClient.connect();
}

