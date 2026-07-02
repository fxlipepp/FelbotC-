const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  nameLower: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  gender: {
    type: String,
    required: true,
    trim: true,
  },
  schedule: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

scheduleSchema.pre('save', function () {
  this.updatedAt = new Date();
  if (this.name) {
    this.nameLower = this.name.toLowerCase().trim();
  }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
