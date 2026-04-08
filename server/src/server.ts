import "dotenv/config";
import { createApp } from "./app";
import { connectMongoOptional } from "./db/mongo";

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectMongoOptional();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main();