require("dotenv").config();
const request = require("request");
const express = require("express");
const Message = require("../models/message.js");

const MongoClient = require("mongodb");

const router = new express.Router();

// get all messages
router.get("/messages", async (req, res) => {
  try {
    const message = await Message.find({});
    res.render(JSON.stringify(message));
  } catch (e) {
    res.status(400).send(e);
  }
});

// get message by id
router.get("/messages/:id", async (req, res) => {
  const _id = req.params.id;
  try {
    const message = await Message.findById(_id);
    if (message) return res.sendStatus(404);
    return res.render(message);
  } catch (e) {
    return res.status(400).send(e);
  }
});

// delete message by id
router.delete("/messages/:id", async (req, res) => {
  const _id = req.params.id;
  try {
    const message = await Message.findByIdAndDelete(_id);
    if (message) return res.sendStatus(404);
    return res.send(JSON.stringify(message));
  } catch (e) {
    return res.status(400).send(e);
  }
});

module.exports = router;
