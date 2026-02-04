import { z } from "zod";

export const ClientMsgSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set_fps"), fps: z.number().min(1).max(60) }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("stop") }),
  z.object({ type: z.literal("navigate"), url: z.string().url() }),
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("move"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), deltaY: z.number() })
]);
