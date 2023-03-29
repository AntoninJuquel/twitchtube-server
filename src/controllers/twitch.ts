import { Request, Response } from "express";
import Twitch, { TwitchClipResponseBody } from "twitch-api-helix";

import Joi from "joi";

const twitchApi = new Twitch(
  process.env.TWITCH_CLIENT_ID as string,
  process.env.TWITCH_CLIENT_SECRET as string
);

const schema = Joi.object({
  type: Joi.string().valid("game", "user").required(),
  name: Joi.string().required(),
  first: Joi.number().integer().min(1).max(100).default(10),
  start: Joi.date().iso(),
  end: Joi.date().iso(),
  after: Joi.string(),
  before: Joi.string(),
});

export async function getClips(req: Request, res: Response) {
  try {
    const { error, value } = schema.validate(req.query);
    console.log(value);
    const { type, name, first, start, end, after, before } = value;
    let response: TwitchClipResponseBody;

    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    switch (type) {
      case "game":
        const game = await twitchApi.getGameByName(name);

        if (!game) {
          res.status(400).json({ error: `Game ${value.name} not found` });
          return;
        }

        response = await twitchApi.getClips({
          game_id: game.id,
          first: first,
          started_at: start,
          ended_at: end,
          after: after,
          before: before,
        });

        break;
      case "user":
        const user = await twitchApi.getUserByName(name);
        if (!user) {
          res.status(400).json({ error: `User ${name} not found` });
          return;
        }

        response = await twitchApi.getClips({
          broadcaster_id: user.id,
          first: first,
          started_at: start,
          ended_at: end,
          after: after,
          before: before,
        });
        break;
      default:
        res.status(400).json({ error: "Invalid type" });
        return;
    }

    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
