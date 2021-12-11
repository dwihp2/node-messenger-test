require("dotenv").config();
const request = require("request");
const express = require("express");
const Message = require("../models/message.js");

const mongoose = require("mongoose");

//Set up default mongoose connection

const username = process.env.MONGO_DB_USER;
const password = process.env.MONGO_DB_PASSWORD;
const cluster = process.env.DB_COLLECTION;
const dbname = process.env.DB_NAME;
mongoose.connect(process.env.DB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

const router = new express.Router();

// GET method route
router.get("/", function (req, res) {
  console.log("Get root routes");
  res.send("Check /messages for list all messages");
});

// get all messages
router.get("/messages", async (req, res) => {
  try {
    const message = await Message.find({});
    console.log(message);
    return res.send(message);
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
    return res.send(`Get item: \n\n ${message}`);
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
    return res.send(`Deleted one item: \n\n ${message}`);
  } catch (e) {
    return res.status(400).send(e);
  }
});

module.exports = router;
