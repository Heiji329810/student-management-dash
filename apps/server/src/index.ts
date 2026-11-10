import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
const server = app.listen(config.PORT, "127.0.0.1", () =>
  console.log(`API listening on http://localhost:${config.PORT}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => void pool.end());
  });
