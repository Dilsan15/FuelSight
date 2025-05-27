const mongoose = require('mongoose');

const usedCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    originalAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    deletedAt: {
        type: Date,
        default: null // null means account still exists, date means when it was deleted
    }
}, { timestamps: true });

module.exports = mongoose.models.UsedCode || mongoose.model('UsedCode', usedCodeSchema); 