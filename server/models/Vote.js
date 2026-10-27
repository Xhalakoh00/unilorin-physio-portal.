const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voter',
      required: true,
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
  },
  { timestamps: true }
);

// Ensures a voter can only cast one vote per position at the database level
voteSchema.index({ voter: 1, position: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);