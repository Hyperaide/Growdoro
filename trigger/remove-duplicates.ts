import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { db } from "../lib/instant";

export const removeDuplicates = task({
  id: "remove-duplicates",
  maxDuration: 3000,
  run: async (payload: any, { ctx }) => {
    
    const data = await db.query({
      $users: {
        blocks: {}
      }
    })

    console.log(data);

    for (const user of data.$users) {
      console.log(user.id);
      // if there are more than one block with same x, y, and z, remove the duplicate
      const duplicateBlocks = user.blocks.filter((block, index, self) =>
        index !== self.findIndex((t) => t.x === block.x && t.y === block.y && t.z === block.z)
      );

      console.log(duplicateBlocks.length);

      if (duplicateBlocks.length > 0) {
        console.log(`Removing ${duplicateBlocks.length} duplicate blocks for user ${user.id}`);
        duplicateBlocks.forEach(async (block) => {
          await db.transact(db.tx.blocks[block.id].delete())
        })
      }
    }
  },
});