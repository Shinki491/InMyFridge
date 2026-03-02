import "dotenv/config";
import { createApp } from "./app";
import { connectMongo } from "./db/mongo";

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectMongo();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});