import { Request, Response } from "express";

import * as twitch from "../modules/twitch";

export async function getClips(req: Request, res: Response) {
  try {
    res.status(200).json(await twitch.getClips(req.query));
  } catch (err) {
    const error = err as Error;
    if (["ValidationError"].includes(error.name)) {
      res.status(400).json({ message: error.message });
    } else if (
      ["GameNotFound", "NoClipsFound", "UserNotFound", "InvalidType"].includes(
        error.name
      )
    ) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
}
