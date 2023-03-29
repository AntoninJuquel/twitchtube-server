import express from "express";
import cors from "cors";
import config from "config";

import video from "./routes/video";
import twitch from "./routes/twitch";

export function start() {
  const app = express();

  const port = config.get("api.port");

  app.use(cors());
  app.use(express.json());

  app.use("/twitch", twitch);
  app.use("/video", video);

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
