/**
 * Starts the real API against a throwaway in-memory MongoDB, for the e2e run.
 * Playwright starts this as a web server and kills it when the run ends.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create();
process.env.CONNECTION_STRING = mongo.getUri("enishi-e2e");
process.env.ACCESS_TOKEN_SECRET ??= "e2e-secret";
process.env.NODE_ENV ??= "test";

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

await import("../api/src/server.ts");
