const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    manifesto: {
      type: String,
    },
    imageUrl: {
      type: String,
      default: '', // Will store the Cloudinary URL
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', candidateSchema);