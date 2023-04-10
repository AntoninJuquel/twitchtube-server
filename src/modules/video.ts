import fs, { readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import config from "config";
import * as drivelist from "drivelist";
import deepmerge from "deepmerge";
import Joi from "joi";

import {
  RenderMediaOnProgress,
  StitchingState,
  getCompositions,
  renderMedia,
} from "@remotion/renderer";

import { VIDEO_CONFIG_PATH, DEFAULT_OUT_PATH, TEMP_PATH } from "./globals";
import axios from "axios";

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
  tempPath: string;
};

type Progress = {
  renderedFrames: number;
  encodedFrames: number;
  encodedDoneIn: number | null;
  renderedDoneIn: number | null;
  progress: number;
  stitchStage: StitchingState;
};

let videoConfig: VideoConfig = {
  ...(config.get("video") as VideoConfig),
  outPath: DEFAULT_OUT_PATH,
  tempPath: TEMP_PATH,
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
  tempPath: Joi.string(),
});

export async function loadConfig() {
  const c = await fs.promises.readFile(VIDEO_CONFIG_PATH, "utf-8");
  videoConfig = deepmerge(videoConfig, JSON.parse(c));
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

  const outPathExists = fs.existsSync(DEFAULT_OUT_PATH);
  if (!outPathExists) {
    await fs.promises.mkdir(DEFAULT_OUT_PATH, { recursive: true });
  }

  const tmpPathExists = fs.existsSync(TEMP_PATH);
  if (!tmpPathExists) {
    await fs.promises.mkdir(TEMP_PATH, { recursive: true });
  }

  videoConfig = await loadConfig();
}

async function downloadClips(clips: any[]) {
  return Promise.all(
    clips
      .filter(
        (clip) =>
          clip.layers[0].type === "video" &&
          clip.layers[0].path.includes("twitch.tv")
      )
      .map(async (clip) => {
        const url = clip.layers[0].path;
        const clipPath = path.join(
          videoConfig.tempPath,
          new URL(clip.layers[0].path).pathname.split("/").pop() as string
        );
        clip.layers[0].path = clipPath;

        const { data, headers } = await axios.get(url, {
          responseType: "stream",
        });

        const writer = fs.createWriteStream(clipPath);
        data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on("finish", () => resolve(clipPath));
          writer.on("error", reject);
        });
      })
  );
}

export async function start(
  clips: any,
  onProgress: (progress: Progress) => void
) {
  try {
    const inputProps = {
      height: videoConfig.height,
      width: videoConfig.width,
      fps: videoConfig.fps,
      outPath: path.join(videoConfig.outPath, videoConfig.out),
      clips,
    };
    const bundleLocation = path.resolve(__dirname, "..", "..", "remotion");

    const [composition] = await getCompositions(bundleLocation, {
      inputProps,
    });

    console.log(`Rendering ${composition.id}...`);
    let prevProgress: Progress = {
      renderedFrames: 0,
      encodedFrames: 0,
      encodedDoneIn: 0,
      renderedDoneIn: 0,
      progress: 0,
      stitchStage: "encoding",
    };
    await renderMedia({
      codec: "h264",
      composition,
      serveUrl: bundleLocation,
      outputLocation: path.join(videoConfig.outPath, videoConfig.out),
      inputProps,
      onProgress: (progress) => {
        if (JSON.stringify(progress) === JSON.stringify(prevProgress)) {
          return;
        }
        prevProgress = progress;
        onProgress(progress);
      },
    });

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
const drives = { id: DRIVES_PATH, name: DRIVES_PATH, isDir: true };

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

function getFolderChain(inputPath: string): File[] {
  const { root } = path.parse(inputPath);

  if (inputPath === root) {
    return [
      {
        id: root,
        name: root.split(path.sep)[0] || root,
        isDir: true,
      },
    ];
  }

  return inputPath.split(path.sep).reduce<File[]>((acc, cur) => {
    const prev = acc[acc.length - 1];
    const id = prev ? path.join(prev.id, cur) : root;
    if (prev && prev.id === id) return acc;
    acc.push({ id, name: cur || id, isDir: true });
    return acc;
  }, []);
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
    let folderChain =
      folder === DRIVES_PATH ? [drives] : getFolderChain(folder);

    if (os.platform() === "win32") {
      folderChain = [drives, ...folderChain];
    }

    return {
      files,
      folderChain,
      sperator,
    };
  } catch (err) {
    throw new Error(`Failed to open output folder: ${(err as Error).message}`);
  }
}

export async function download() {
  const outPath = path.join(videoConfig.outPath, videoConfig.out);
  const stat = fs.statSync(outPath);
  const stream = fs.createReadStream(outPath);
  const filename = path.basename(outPath);

  return {
    filename,
    size: stat.size,
    type: "video/mp4",
    stream,
  };
}
