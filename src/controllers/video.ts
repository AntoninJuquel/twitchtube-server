import { Request, Response } from "express";
import * as video from "../modules/video";

export async function getConfig(req: Request, res: Response) {
  try {
    res.json(await video.loadConfig());
  } catch (err) {
    res.status(500).json(err);
  }
}

export async function setConfig(req: Request, res: Response) {
  try {
    const newConfig = req.body;

    const { error, value } = video.configSchema.validate(newConfig);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }
    res.json(await video.saveConfig(value));
  } catch (err) {
    res.status(500).json(err);
  }
}

export async function start(req: Request, res: Response) {
  try {
    const { clips } = req.body;

    res.json(await video.start(clips));
  } catch (err) {
    res.status(500).json(err);
  }
}
