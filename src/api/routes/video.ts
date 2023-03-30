import express from "express";

import * as video from "../../controllers/video";

const router = express.Router();

router.get("/config", video.getConfig);

router.post("/config", video.setConfig);

router.post("/start", video.start);

router.post("/open", video.open);

router.get("/download", video.download);

export default router;
