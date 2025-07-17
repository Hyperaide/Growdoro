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
    profiles: i.entity({
      username: i.string().unique().indexed(),
      supporter: i.boolean().optional(),
      supporterSince: i.date().optional(),
      supporterUntil: i.date().optional(),
      stripeCustomerId: i.string().optional(),
      stripeDetails: i.json().optional(),
      createdAt: i.date(),
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
      timeRemaining: i.number().optional(),
      paused: i.boolean().optional(),
      completedAt: i.date().optional(),
      rewardsClaimedAt: i.date().optional(),
    }),
  },
  links: {
    userProfile: {
      forward: { on: 'profiles', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'one', label: 'profile' }
    },
    userSessions: {
      forward: { on: 'sessions', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'sessions' }
    },
    userBlocks: {
      forward: { on: 'blocks', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'blocks' }
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
