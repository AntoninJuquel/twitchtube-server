import fs, { readdirSync } from "node:fs";
import path from "node:path";
import config from "config";
import * as drivelist from "drivelist";
import deepmerge from "deepmerge";
import type editly from "editly";
import Joi from "joi";

import { VIDEO_CONFIG_PATH, DEFAULT_OUT_PATH } from "./globals";

type VideoConfig = {
  width: number;
  height: number;
  fps: number;
  outPath: string;
  transition: {
    duration: number;
    name: string;
  };
  out: string;
  keepSourceAudio: boolean;
  allowRemoteRequests: boolean;
};

let videoConfig: VideoConfig = {
  ...(config.get("video") as VideoConfig),
  outPath: DEFAULT_OUT_PATH,
};

export const configSchema = Joi.object({
  width: Joi.number().integer().min(1).max(10000),
  height: Joi.number().integer().min(1).max(10000),
  fps: Joi.number().integer().min(1).max(10000),
  outPath: Joi.string(),
  transition: Joi.object({
    duration: Joi.number().min(0).max(10000),
    name: Joi.string(),
  }),
  out: Joi.string(),
  keepSourceAudio: Joi.boolean(),
  allowRemoteRequests: Joi.boolean(),
});

export async function loadConfig() {
  const c = await fs.promises.readFile(VIDEO_CONFIG_PATH, "utf-8");
  videoConfig = JSON.parse(c);
  return videoConfig;
}

export async function saveConfig(c: any) {
  const { error, value } = configSchema.validate(c);
  if (error) {
    throw new Error(error.message);
  }
  videoConfig = deepmerge(videoConfig, value);
  await fs.promises.writeFile(VIDEO_CONFIG_PATH, JSON.stringify(videoConfig));
  return videoConfig;
}

export async function init() {
  const exists = fs.existsSync(VIDEO_CONFIG_PATH);

  if (!exists) {
    const defaultConfig: VideoConfig = {
      ...(config.get("video") as VideoConfig),
      outPath: DEFAULT_OUT_PATH,
    };
    await fs.promises.mkdir(path.dirname(VIDEO_CONFIG_PATH), {
      recursive: true,
    });
    await fs.promises.writeFile(
      VIDEO_CONFIG_PATH,
      JSON.stringify(defaultConfig)
    );
    await fs.promises.mkdir(DEFAULT_OUT_PATH, { recursive: true });
    videoConfig = defaultConfig;
    return;
  }

  videoConfig = await loadConfig();
}

const getEditly = async (): Promise<typeof editly> => {
  const lib = await (eval(`import('editly')`) as Promise<{
    default: typeof import("editly");
  }>);
  return lib.default;
};

export async function start(clips: any) {
  try {
    const editlyConfig = {
      height: videoConfig.height,
      width: videoConfig.width,
      fps: videoConfig.fps,
      outPath: path.join(videoConfig.outPath, videoConfig.out),
      defaults: {
        transition: videoConfig.transition,
      },
      keepSourceAudio: true,
      allowRemoteRequests: videoConfig.allowRemoteRequests,
      clips,
    };

    const Editly = await getEditly();
    await Editly(editlyConfig);

    return "ok";
  } catch (err) {
    throw new Error(`Failed to create video: ${(err as Error).message}`);
  }
}

type File = {
  id: string; // path
  name: string;
  isDir: boolean;
};

const DRIVES_PATH = "Computer";
const drives = { id: DRIVES_PATH, name: DRIVES_PATH, isDirectory: true };

function listFiles(folder: string): File[] {
  const files: File[] = readdirSync(folder, {
    withFileTypes: true,
    encoding: "utf-8",
  }).map((f) => ({
    id: path.join(folder, f.name),
    name: f.name,
    isDir: f.isDirectory(),
  }));

  return files;
}

function getFolderChain(folder: string): File[] {
  const { root, dir, base } = path.parse(folder);
  const folderChain = path
    .join(dir, base)
    .split(path.sep)
    .reduce<File[]>((acc, cur) => {
      if (!cur) return acc;
      const prev = acc[acc.length - 1];
      const id = prev ? path.join(prev.id, cur) : root;
      acc.push({ id, name: cur, isDir: true });
      return acc;
    }, []);

  return folderChain;
}

async function getDrives(): Promise<File[]> {
  const drives = (await drivelist.list()).map((d) => ({
    id: d.mountpoints[0].path,
    name: `${d.mountpoints[0].path.split(path.sep)[0]} ${d.description}`,
    isDir: true,
  }));

  return drives;
}

export async function open(folder: string = videoConfig.outPath) {
  try {
    const sperator = path.sep;

    const files =
      folder === DRIVES_PATH ? await getDrives() : listFiles(folder);
    const folderChain =
      folder === DRIVES_PATH ? [drives] : [drives, ...getFolderChain(folder)];

    return {
      files,
      folderChain,
      sperator,
    };
  } catch (err) {
    throw new Error(`Failed to open output folder: ${(err as Error).message}`);
  }
}
