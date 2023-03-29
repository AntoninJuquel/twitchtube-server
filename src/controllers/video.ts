import { Request, Response } from "express";
import * as video from "../modules/video";

export async function getConfig(req: Request, res: Response) {
  try {
    res.json(await video.loadConfig());
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}

export async function setConfig(req: Request, res: Response) {
  try {
    const message = await video.saveConfig(req.body);
    res.json(message);
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}

export async function start(req: Request, res: Response) {
  try {
    res.json(await video.start(req.body.clips));
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}
