const mongoose = require('mongoose');

const archivedResultSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true,
  },
  archivedAt: {
    type: Date,
    default: Date.now,
  },
  totalVotesCast: {
    type: Number,
    default: 0,
  },
  electionData: [
    {
      positionTitle: String,
      candidates: [
        {
          fullName: String,
          voteCount: Number,
          isWinner: Boolean,
        }
      ]
    }
  ]
});

module.exports = mongoose.model('ArchivedResult', archivedResultSchema);