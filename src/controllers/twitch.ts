import { Request, Response } from "express";

import * as twitch from "../modules/twitch";

export async function getClips(req: Request, res: Response) {
  try {
    res.status(200).json(await twitch.getClips(req.query));
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
}
