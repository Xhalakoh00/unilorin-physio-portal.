const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g., "President", "Welfare Director"
    },
    displayOrder: {
      type: Number,
      default: 0, // Used to sequence positions on the ballot
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Position', positionSchema);