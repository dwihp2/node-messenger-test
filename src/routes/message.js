require("dotenv").config();
const request = require("request");
const express = require("express");
const Message = require("../models/message.js");

const MongoClient = require("mongodb");

const router = new express.Router();

// get all messages
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find({});
    res.send(messages);
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
    return res.send(message);
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
    return res.send(message);
  } catch (e) {
    return res.status(400).send(e);
  }
});

// // variable to cache messages
// let MSG;

// // messages are cached for 1 minute
// setInterval(() => {
//   getAllMsg();
// }, 1000 * 60);

// // function to get all messages
// function getAllMsg() {
//   MongoClient.connect(
//     process.env.DB_CONNECTION,
//     {
//       auth: {
//         user: process.env.MONGO_DB_USER,
//         password: process.env.MONGO_DB_PASSWORD,
//       },
//     },
//     {
//       userNewUrlParser: true,
//       useUnifiedTopology: true,
//       function(err, client) {
//         if (err) throw err;

//         console.log("Connected to server, get ready to get message");

//         // get database name
//         var db = client.db(proces.env.DB_NAME);

//         db.collection(process.env.DB_COLLECTION)
//           .find({})
//           .toArray((err, res) => {
//             if (err) {
//               throw err;
//             }

//             client.close();
//             console.log("Showing all messages");
//             console.log(res);
//             MSG = res;
//           });
//       },
//     }
//   );
// }

// // render message
// function getMessages(req, res) {
//   // waiting for messages
//   if(MSG) {
//     res.render()
//   }
// }

module.exports = router;
