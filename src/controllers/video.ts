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
    const message = await video.start(req.body.clips, (progress) => res.write(progress.toString()));
    res.json(message);
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}

export async function download(req: Request, res: Response) {
  try {
    const message = await video.download();
    res.writeHead(200, {
      "Content-Type": message.type,
      "Content-Length": message.size,
      "Content-Disposition": `attachment; filename=${message.filename}`,
    });
    message.stream.pipe(res);
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}

export async function open(req: Request, res: Response) {
  try {
    res.json(await video.open(req.body.path));
  } catch (err) {
    res.status(500).json((err as Error).message);
  }
}
