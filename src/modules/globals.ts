import os from "node:os";
import path from "node:path";

export const HOME_DIR = path.join(os.homedir(), "twitchtube");
export const CONFIG_PATH = path.join(HOME_DIR, "configs");
export const VIDEO_CONFIG_PATH = path.join(CONFIG_PATH, "video");
export const DEFAULT_OUT_PATH = path.join(HOME_DIR, "videos");
