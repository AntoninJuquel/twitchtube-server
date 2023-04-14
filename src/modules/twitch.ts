import Twitch, { GenericTwitchResponse, TwitchClip } from "twitch-api-helix";

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
    throw error;
  }
  const { type, name, first, start, end, after, before } = value;
  let response: GenericTwitchResponse<TwitchClip>;

  switch (type) {
    case "game":
      const [game] = await twitchApi.getGameByName(name).catch((err) => {
        const error = new Error(`Game ${value.name} not found`);
        error.name = "GameNotFound";
        throw error;
      });

      response = await twitchApi
        .getClips({
          game_id: game.id,
          first: first,
          started_at: start,
          ended_at: end,
          after: after,
          before: before,
        })
        .catch((err) => {
          const error = new Error(`No clips found for game ${value.name}`);
          error.name = "NoClipsFound";
          throw error;
        });
      break;
    case "user":
      const [user] = await twitchApi.getUserByName(name).catch((err) => {
        const error = new Error(`User ${value.name} not found`);
        error.name = "UserNotFound";
        throw error;
      });

      response = await twitchApi
        .getClips({
          broadcaster_id: user.id,
          first: first,
          started_at: start,
          ended_at: end,
          after: after,
          before: before,
        })
        .catch((err) => {
          const error = new Error(`No clips found for user ${value.name}`);
          error.name = "NoClipsFound";
          throw error;
        });
      break;
    default:
      const error = new Error("Invalid type");
      error.name = "InvalidType";
      throw error;
  }

  return response;
}
