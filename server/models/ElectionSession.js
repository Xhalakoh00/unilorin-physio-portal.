const mongoose = require('mongoose');

const electionSessionSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true, // e.g., "2025/2026"
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Active', 'Completed', 'Archived'],
    default: 'Upcoming',
  }
}, { timestamps: true });

module.exports = mongoose.model('ElectionSession', electionSessionSchema);