import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { Request, Response } from "express";
import config from "config";
import deepmerge from "deepmerge";
import { spawn, fork, execFile, exec } from "node:child_process";

import Joi from "joi";

import type editly from "editly";

const getEditly = async (): Promise<typeof editly> => {
  const lib = await (eval(`import('editly')`) as Promise<{
    default: typeof import("editly");
  }>);
  return lib.default;
};

const CONFIG_PATH = path.join(os.homedir(), "twitchtube", "configs", "video");
const OUT_PATH = path.join(os.homedir(), "twitchtube", "videos");

const configSchema = Joi.object({
  width: Joi.number().integer().min(1).max(10000),
  height: Joi.number().integer().min(1).max(10000),
  fps: Joi.number().integer().min(1).max(10000),
  outPath: Joi.string(),
  transition: Joi.object({
    duration: Joi.number().integer().min(1).max(10000),
    type: Joi.string(),
  }),
  out: Joi.string(),
});

export async function getConfig(req: Request, res: Response) {
  try {
    const exists = fs.existsSync(CONFIG_PATH);

    if (!exists) {
      const defaultConfig = {
        ...(config.get("video") as object),
        outPath: OUT_PATH,
      };
      await fs.promises.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
      await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig));
    }

    const c = fs.readFileSync(CONFIG_PATH, "utf-8");
    res.json(JSON.parse(c));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function setConfig(req: Request, res: Response) {
  try {
    const newConfig = req.body;

    const { error } = configSchema.validate(newConfig);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const exists = fs.existsSync(CONFIG_PATH);

    if (!exists) {
      await fs.promises.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    }

    const c = fs.readFileSync(CONFIG_PATH, "utf-8");
    const oldConfig = JSON.parse(c);

    const mergedConfig = deepmerge(oldConfig, newConfig);

    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(mergedConfig));

    res.json(mergedConfig);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function start(req: Request, res: Response) {
  try {
    const { clips } = req.body;

    const c = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(c);

    const exists = fs.existsSync(OUT_PATH);

    if (!exists) {
      await fs.promises.mkdir(path.dirname(OUT_PATH), { recursive: true });
    }

    const editlyConfig = {
      height: config.height,
      width: config.width,
      fps: config.fps,
      outPath: path.join(OUT_PATH, config.out),
      defaults: {
        transition: config.transition,
      },
      keepSourceAudio: true,
      allowRemoteRequests: true,
      clips,
    };

    const editlyPath = path.join(OUT_PATH, "out.json");

    await fs.promises.writeFile(editlyPath, JSON.stringify(editlyConfig));

    const Editly = await getEditly();
    await Editly({
      height: config.height,
      width: config.width,
      fps: config.fps,
      outPath: path.join(OUT_PATH, config.out),
      defaults: {
        transition: config.transition,
      },
      keepSourceAudio: true,
      allowRemoteRequests: true,
      clips,
    });

    res.json({ response: "ok" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
