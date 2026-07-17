import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { setupDatabase } from "./db/index.js";
import { registerApiRoutes } from "./routes/api.js";

const db = setupDatabase(config.databasePath);
const app = express();

app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

registerApiRoutes(app, db);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(config.clientDistDir));

  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(path.join(config.clientDistDir, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`Chore Tracker server listening on http://localhost:${config.port}`);
});
