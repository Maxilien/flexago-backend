// models/UserBlock.js
const mongoose = require("mongoose");

const UserBlockSchema = new mongoose.Schema(
  {
    blockerId: { type: String, required: true },
    blockedId: { type: String, required: true }
  },
  { timestamps: true }
);

UserBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
UserBlockSchema.index({ blockedId: 1 });

const UserBlock = mongoose.model("UserBlock", UserBlockSchema);

// A block stops contact in both directions.
UserBlock.between = (first, second) =>
  UserBlock.exists({
    $or: [
      { blockerId: String(first), blockedId: String(second) },
      { blockerId: String(second), blockedId: String(first) }
    ]
  });

UserBlock.idsHiddenFrom = async (userId) => {
  const blocks = await UserBlock.find({
    $or: [{ blockerId: String(userId) }, { blockedId: String(userId) }]
  }).lean();

  return blocks.map((block) =>
    block.blockerId === String(userId) ? block.blockedId : block.blockerId
  );
};

module.exports = UserBlock;
