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
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    votingPin: {
      type: String, // This will store the securely generated OTP/PIN
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