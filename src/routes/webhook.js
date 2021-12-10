require("dotenv").config();
const request = require("request");
const express = require("express");
const router = new express.Router();
const moment = require("moment");
const Message = require("../models/message.js");

// global variable for storing message information
let COUNT_MESSAGES = 0;
let WEBHOOK_MSG = "";
let SENDER_ID = "";
let LATEST_MESSAGE = "";
let PREV_WORD = "";
let PREV_OF_LATEST = "";
let FIRST_NAME = "";
let BIRTH_DATE = "";

// function to check whether user in DB
// if yes, return position in DB
function checkInDB(arrMsg, msgId = SENDER_ID) {
  for (let i = 0; i < arrMsg.length; i++) {
    if (arrMsg[i].senderId === msgId) {
      return i;
    }
  }
  return -1;
}

// function to add message to DB
function postMessage(req, res) {
  if (COUNT_MESSAGES % 2 == 0) return;

  let MongoClient = require("mongodb").MongoClient;

  // create the message object
  let obj = new Message({
    senderId: SENDER_ID,
    text: [WEBHOOK_MSG],
  });

  console.log(`OBJ` + obj);

  MongoClient.connect(
    process.ent.DB_CONNECTION,
    {
      auth: {
        user: process.env.MONGO_DB_USER,
        password: process.env.MONGO_DB_PASSWORD,
      },
    },
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    (err, client) => {
      if (err) {
        throw err;
      }

      console.log("Connected to the server for inserting message");

      // Get database name
      let db = client.db(process.env.DB_NAME);

      // search if user already in database
      db.collection(process.env.DB_COLLECTION)
        .find({})
        .toArray((err, res) => {
          if (err) {
            throw err;
          }
          console.log("Display data: " + res);

          // check whwther user is in DB
          let posInDB = checkInDB(res);

          // if user is not in DB
          if (posInDB < 0) {
            db.collection(process.env.DB_COLLECTION).insertOne(
              obj,
              (error, res) => {
                if (error) {
                  throw error;
                }

                console.log(
                  "1 message inserted for not in DB userId=" + SENDER_ID
                );
                client.close();
              }
            );
          }
          // user in DB
          else {
            let userArrMsg = res[posInDB]._id;
            console.log("User Messages: " + userArrMsg);

            let newText = [];
            newText = [...userArrMsg];

            db.collection(process.env.DB_COLLECTION).update(
              {
                _id: res[posInDB]._id,
              },
              {
                $set: { text: newText },
              }
            );

            console.log("1 message inserted for in DB userId=" + SENDER_ID);
            client.close();
          }
        });
    }
  );
}

// Create endpoint webhook
router.post("/webhook", (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach((entry) => {
      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      // console.log(webhookEvent);

      // Get the sender PSID
      let sender_psid = webhookEvent.sender.id;
      SENDER_ID = webhookEvent.sender.id;
      // console.log(`Sender PSID:` + sender_psid);

      // check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        COUNT_MESSAGES += 1;
        WEBHOOK_MSG = webhookEvent.message.text;

        postMessage(req, res);
        handleMessage(sender_psid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        COUNT_MESSAGES += 1;

        postMessage(req, res);
        WEBHOOK_MSG = webhookEvent.postback.payload;
        handlePostback(sender_psid, webhookEvent.postback);
      }
    });

    // Return a 200 OK response to all events
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Return 404 not fount if event is not from a page
    res.sendStatus(404);
  }
});

// GET webhook
router.get("/webhook", (req, res) => {
  // Place your verify token here, should be a random string
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // parse query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Respond with 403 forbidden if verify tokens do not match
      res.sendStatus(404);
    }
  }
});

// function Sends response messages via the send API
function callSendAPI(sender_psid, response, quick_reply = { text: "" }) {
  // construct message body
  let req_body;

  if (!quick_reply.text) {
    req_body = {
      recipient: {
        id: sender_psid,
      },
      message: { text: response },
    };
  } else {
    req_body = {
      recipient: {
        id: sender_psid,
      },
      messaging_type: "RESPONSE",
      message: quick_reply,
    };
  }

  // Send the HTTP request to the messenger platform
  request(
    {
      uri: "https://graph.facebook.com/v7.0/me/messages",
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: "POST",
      json: req_body,
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!");
      } else console.log("Unable to send message:" + err);
    }
  );
}

function handleMessage(sender_psid, message) {
  // check kind of message
  try {
    if (message.quick_reply) {
      handleQuickReply(sender_psid, message);
    } else if (message.attachments) {
      handleAttachmentMessage(sender_psid, message);
    } else if (message.text) {
      handleTextMessage(sender_psid, message);
    } else {
      callSendAPI(
        sender_psid,
        `The bot needs more training. You said "${message.text}". Try to say "Hi" or "#getStarted" to restart the conversation..`
      );
    }
  } catch (error) {
    console.error(error);
    callSendAPI(
      sender_psid,
      `An error has occured: '${error}'. We have been notified and will fix the issue shortly!`
    );
  }
}

function handleAttachmentMessage(sender_psid, message) {
  callSendAPI(sender_psid, `Received attachment message ${message.text}`);
}

function handleTextMessage(sender_psid, message) {
  // getting current message
  let mess = message.text;
  mess = mess.toLowerCase();

  PREV_WORD = PREV_OF_LATEST;
  PREV_OF_LATEST = LATEST_MESSAGE;
  LATEST_MESSAGE = mess;

  // message.nlp did not work -> made a workaround
  let greeting = ["hi", "hey", "hello"];
  let accept_conv = ["yup", "yes", "yeah", "sure", "yep", "i do"];
  let deny_conv = ["no", "nah", "nope", "not now", "maybe later"];
  let thanks_conv = [
    "thanks",
    "thx",
    "thank you",
    "thank you very much",
    "thanks a lot",
    "thanks!",
    "thank you!",
  ];

  let resp;

  // reinitialize conversation
  if (mess === "#getStarted") {
    FIRST_NAME = "";
    BIRTH_DATE = "";
    LATEST_MESSAGE = "";
    PREV_OF_LATEST = "";
    PREV_WORD = "";

    // uncomment following for clearing messages
    // ARR_MESSAGES = [];
    // COUNT_MESSAGES = 0;
  }

  // greeting case
  if (greeting.includes(mess) || mess === "#getStarted") {
    if (FIRST_NAME === "") {
      resp = {
        text: "Hello! Would you like to answer few questions?",
        quick_replies: [
          {
            content_type: "text",
            title: "Sure",
            payload: "sure",
          },
          {
            content_type: "text",
            title: "Not now",
            payload: "not now",
          },
        ],
      };
      callSendAPI(sender_psid, ``, resp);
    } else {
      callSendAPI(
        sender_psid,
        `The bot needs more training. You said "${message.text}". Try to say "Hi" or "#getStarted" to restart the conversation.`
      );
    }
  }
  // accept case
  else if (accept_conv.includes(mess)) {
    if (FIRST_NAME === "") {
      if (countWords(LATEST_MESSAGE) === 1 && !greeting.includes(PREV_WORD)) {
        for (var i = 0; i < accept_conv.length; i++) {
          if (mess.includes(accept_conv[i])) break;
        }

        if (i !== accept_conv.length) {
          FIRST_NAME = capitalizeFirstLetter(extractName());
          console.log(FIRST_NAME);

          callSendAPI(
            sender_psid,
            `We will take your first name as ${FIRST_NAME}. Secondly, we would like to know your birth date. Write it down below in the format YYYY-MM-DD. Example: 1987-03-25`
          );
        } else {
          callSendAPI(sender_psid, `First, please write below your first name`);
        }
      } else {
        callSendAPI(sender_psid, `First, please write below your first name`);
      }
    } else if (BIRTH_DATE === "") {
      if (
        countWords(LATEST_MESSAGE) === 1 &&
        extractDate().split("-").length - 1 === 2
      ) {
        BIRTH_DATE = PREV_OF_LATEST;
        console.log(BIRTH_DATE);

        let resp = {
          text: `You agreed that your birth date is ${BIRTH_DATE}. Would you like to know how many days are until your next birtday?`,
          quick_replies: [
            {
              content_type: "text",
              title: "I do",
              payload: "i do",
            },
            {
              content_type: "text",
              title: "Not interested",
              payload: "not interested",
            },
          ],
        };

        callSendAPI(sender_psid, ``, resp);
      } else {
        callSendAPI(
          sender_psid,
          `Secondly, we would like to know your birth date. Write it down below in the format YYYY-MM-DD. Example: 1987-03-25`
        );
      }
    } else if (FIRST_NAME !== "" && BIRTH_DATE !== "") {
      let days_left = countBirthDays();

      // bad information introduced
      if (days_left === -1) {
        callSendAPI(
          sender_psid,
          `Birth date introduced is false. If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
        );
      } else {
        callSendAPI(
          sender_psid,
          `There are ${days_left} days until your next birthday`
        );
      }
    } else {
      callSendAPI(
        sender_psid,
        `The bot needs more training. You said "${message.text}". Try to say "Hi" or "#getStarted" to restart the conversation.`
      );
    }
  }
  // deny case
  else if (deny_conv.includes(mess)) {
    callSendAPI(
      sender_psid,
      `Thank you for your answer. If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
    );
  }
  // gratitude case
  else if (thanks_conv.includes(mess)) {
    callSendAPI(
      sender_psid,
      `You're welcome! If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
    );
  }
  // user may have introduced first name and/or birth date
  else {
    let resp;

    // if we don't know user first name yet
    if (!FIRST_NAME) {
      LATEST_MESSAGE = capitalizeFirstLetter(LATEST_MESSAGE);
      resp = {
        text: "Is " + LATEST_MESSAGE + " your first name?",
        quick_replies: [
          {
            content_type: "text",
            title: "Yes",
            payload: "yes",
          },
          {
            content_type: "text",
            title: "No",
            payload: "no",
          },
        ],
      };

      callSendAPI(sender_psid, ``, resp);
    } // if we don't know user birth date yet
    else if (!BIRTH_DATE) {
      resp = {
        text: "Is " + LATEST_MESSAGE + " your birth date?",
        quick_replies: [
          {
            content_type: "text",
            title: "Yep",
            payload: "yep",
          },
          {
            content_type: "text",
            title: "Not at all",
            payload: "not at all",
          },
        ],
      };

      callSendAPI(sender_psid, ``, resp);
    }
    // something else
    else {
      callSendAPI(
        sender_psid,
        `Thank you for your answer. If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
      );
    }
  }
}

// function to capitalize first letter of a word
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// // function to count birth days
// function countBirthDays(birthDate = BIRTH_DATE) {
//   var today = new Date();

//   // we extract user birth date information in decimal
//   var user_year = parseInt(birthDate.substring(0, 4), 10);
//   var user_month = parseInt(birthDate.substring(5, 7), 10);
//   var user_day = parseInt(birthDate.substring(8, 10), 10);

//   // bad information introduced
//   if (user_year >= today.getFullYear() || user_month > 12 || user_day > 31) {
//     return -1;
//   } else {
//     // valid information -> proceed to calculus
//     const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
//     let days_left = Math.round(
//       Math.abs(
//         (today - new Date(today.getFullYear(), user_month - 1, user_day)) /
//           oneDay
//       )
//     );

//     return days_left;
//   }
// }

// func to count birth day
function countBirthDays(birthDate = BIRTH_DATE) {
  let today = moment().format("YYYY-MM-DD");

  // calculate current age of person in years
  const years = moment().diff(birthDate, "years");

  // Special case if birthday is today; we do NOT need an extra year added
  const adjustToday = birthDate.substring(5) === today.substring(5) ? 0 : 1;

  // Add age plus one year (unless birthday is today) to get next birthday
  const nextBirthday = moment(birthDate).add(years + adjustToday, "years");

  // Final calculation in days
  const daysUntilBirthday = nextBirthday.diff(today, "days");

  // bad information
  if (years > moment().get("year")) {
    return -1;
  }
  // valid information
  else {
    return daysUntilBirthday;
  }
}

// function to handle quick replies
function handleQuickReply(sender_psid, message) {
  let mess = message.text;
  mess = mess.toLowerCase();

  // user agreed to answer questions
  if (mess === "sure") {
    if (!FIRST_NAME) {
      callSendAPI(sender_psid, `First, please write below your first name`);
    } else {
      callSendAPI(
        sender_psid,
        `The bot needs more training. You said "${message.text}". Try to say "Hi" or "#getStarted" to restart the conversation.`
      );
    }
  }
  // user agreed on his first name
  else if (mess === "yes") {
    for (let i = 3; i < LATEST_MESSAGE.length; i++) {
      FIRST_NAME += LATEST_MESSAGE[i];

      if (LATEST_MESSAGE[i] === " ") break;
    }
    FIRST_NAME = capitalizeFirstLetter(FIRST_NAME);
    console.log(FIRST_NAME);

    callSendAPI(
      sender_psid,
      `Secondly, we would like to know your birth date. Write it down below in the format YYYY-MM-DD. Example: 1987-03-25`
    );
  }
  // user agreed on his birth date
  else if (mess === "yep") {
    for (let i = 0; i < LATEST_MESSAGE.length; i++) {
      BIRTH_DATE += LATEST_MESSAGE[i];

      if (LATEST_MESSAGE[i] === " ") break;
    }
    console.log(BIRTH_DATE);

    let resp = {
      text: `You agreed that your birth date is ${BIRTH_DATE}. Would you like to know how many days are until your next birtday?`,
      quick_replies: [
        {
          content_type: "text",
          title: "I do",
          payload: "i do",
        },
        {
          content_type: "text",
          title: "Not interested",
          payload: "not interested",
        },
      ],
    };

    callSendAPI(sender_psid, ``, resp);
  }
  // user agreed to know birth date days
  else if (mess === "i do") {
    let days_left = countBirthDays();

    // bad information introduced
    if (days_left === -1) {
      callSendAPI(
        sender_psid,
        `Birth date introduced is false. If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
      );
    } else {
      // valid information -> proceed to calculus

      callSendAPI(
        sender_psid,
        `There are ${days_left} days until your next birthday. `
      );
    }
  } else if (
    mess === "not now" ||
    mess === "no" ||
    mess === "not at all" ||
    mess === "not interested"
  ) {
    callSendAPI(
      sender_psid,
      `Thank you for your answer. If you wish to start this conversation again write "#getStarted". Goodbye 🖐`
    );
  } else {
    callSendAPI(
      sender_psid,
      `The bot needs more training. You said "${message.text}". Try to say "Hi" or "#getStarted" to restart the conversation.`
    );
  }
}

// function used to count number of words in a string
function countWords(str) {
  var matches = str.match(/[\w\d\’\'-]+/gi);
  return matches ? matches.length : 0;
}

// function used to extract user first name
// from previous latest message
function extractName(givenName = PREV_OF_LATEST) {
  let name = "";
  for (let i = 3; i < givenName.length; i++) {
    if (givenName[i] === " ") break;

    name += givenName[i];
  }
  return name;
}

// function to extract date given by user
function extractDate(givenDate = PREV_OF_LATEST) {
  let dt = "";
  for (let i = 3; i < givenDate.length; i++) {
    if (givenDate[i] === " ") break;

    dt += givenDate[i];
  }
  return dt;
}

module.exports = router;
