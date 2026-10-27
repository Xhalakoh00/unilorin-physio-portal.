const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema(
  {
    matricNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      required: true, // e.g., 100, 200, 300, 400, 500
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['voter', 'admin'],
      default: 'voter',
    },
    votedPositions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Voter', voterSchema);