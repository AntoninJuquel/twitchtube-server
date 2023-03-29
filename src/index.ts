import dotenv from "dotenv";
import { program } from "commander";

import * as video from "./modules/video";

dotenv.config();

program
  .name(process.env.npm_package_name as string)
  .version(process.env.npm_package_version as string)
  .description(process.env.npm_package_description as string)
  .option("-e, --env <env>", "Environment to run in", "development")
  .action(async (options) => {
    process.env.NODE_ENV = options.env;

    await video.init();

    const api = await import("./api");
    api.start();
  });

program.parse(process.argv);
