#!/usr/bin/env node
import dotenv from "dotenv";
import * as video from "./modules/video";

dotenv.config();

async function main() {
  await video.init();
  const api = await import("./api");
  api.start();
}

main();
