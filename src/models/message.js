const mongoose = require("mongoose");

const { Schema } = mongoose;

const MessageSchema = new Schema({
  senderId: {
    type: String,
    required: true,
  },
  text: [
    {
      type: String,
      required: true,
    },
  ],
});

module.exports = mongoose.model("message", MessageSchema);
