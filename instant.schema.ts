// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    blocks: i.entity({
      x: i.number().optional(),
      y: i.number().optional(),
      z: i.number().optional(),
      type: i.string(),
      sessionId: i.string().optional().indexed(),
      plantedAt: i.date().optional(),
    }),
    sessions: i.entity({
      sessionId: i.string().optional().indexed(),
      createdAt: i.number(),
      timeInSeconds: i.number(),
      paused: i.boolean().optional(),
      completedAt: i.date().optional(),
      rewardsClaimedAt: i.date().optional(),
    }),
  },
  links: {},
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
