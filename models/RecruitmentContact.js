const mongoose = require('mongoose');

const recruitmentContactSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true, index: true },
  phone: { type: String, default: '' },
  name: { type: String, default: 'Usuario' },
  status: { type: String, default: 'contacted' },
  lastPromoAt: { type: Date, default: null },
  promoMessageIds: { type: [String], default: [] },
  handledIncomingIds: { type: [String], default: [] },
  groupId: { type: String, default: '' },
  groupName: { type: String, default: '' },
  detectionScore: { type: Number, default: 0 }
}, { timestamps: true, collection: 'recruitment_contacts' });

module.exports = mongoose.models.RecruitmentContact ||
  mongoose.model('RecruitmentContact', recruitmentContactSchema);
