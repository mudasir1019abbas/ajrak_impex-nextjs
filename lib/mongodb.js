import mongoose from "mongoose";

// Reuse one connection across hot reloads (dev) and warm serverless invocations.
const cache = (globalThis.__mongooseCache ??= { conn: null, promise: null });

export async function connectDB() {
  const uri = "mongodb+srv://mudasir1019abbas_db_user:Risadumm786$@ajrak-db-server.hniksdx.mongodb.net/";
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose
    .connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10000 })
    .catch((err) => {
      cache.promise = null; // allow a retry on the next request
      throw err;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}
