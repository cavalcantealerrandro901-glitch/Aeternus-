const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 }
});

module.exports = model('User', userSchema);
