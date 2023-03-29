import Twitch from "twitch-api-helix";

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

export async function getClips(params: any) {
  const { error, value } = schema.validate(params);
  if (error) {
    throw new Error(error.message);
  }
  const { type, name, first, start, end, after, before } = value;
  switch (type) {
    case "game":
      const game = await twitchApi.getGameByName(name);

      if (!game) {
        throw new Error(`Game ${value.name} not found`);
      }

      return await twitchApi.getClips({
        game_id: game.id,
        first: first,
        started_at: start,
        ended_at: end,
        after: after,
        before: before,
      });
    case "user":
      const user = await twitchApi.getUserByName(name);
      if (!user) {
        throw new Error(`User ${name} not found`);
      }

      return await twitchApi.getClips({
        broadcaster_id: user.id,
        first: first,
        started_at: start,
        ended_at: end,
        after: after,
        before: before,
      });
    default:
      throw new Error("Invalid type");
  }
}
