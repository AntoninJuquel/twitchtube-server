import express from "express";

import * as twitch from "../../controllers/twitch";

const router = express.Router();

router.get("/config", (req, res) => {
  res.send("get config");
});

router.post("/config", (req, res) => {
  res.send("post config");
});

router.get("/clips", twitch.getClips);

export default router;
