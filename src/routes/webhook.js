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

// Create endpoint webhook
router.post("/webhook", (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach((entry) => {
      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      let sender_psid = webhookEvent.sender.id;
      SENDER_ID = webhookEvent.sender.id;
      console.log(`Sender PSID:` + sender_psid);

      // check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        COUNT_MESSAGES += 1;
        WEBHOOK_MSG = webhookEvent.message.text;

        // postMessage(req, res);
        handleMessage(sender_psid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        COUNT_MESSAGES += 1;

        // postMessage(req, res);
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
  // check what kind of message received
  try {
    if (message.quick_reply) {
      handleQuickReply(sender_psid, message);
    } else if (message.attachments) {
      handleAttachmentMessage(sender_psid, message);
    } else if (message.text) {
      handleTextMessage(sender_psid, message);
    }
    // something else
    else {
      callSendAPI(
        sender_psid,
        `Cant process incoming message, bot need to train more. You said ${message.text}. Try to say Hi or #getStarted to start again`
      );
    }
  } catch (err) {
    console.error(err);
    callSendAPI(sender_psid, `An error has occured: ${error}`);
  }
}

function handleAttachmentMessage(sender_psid, message) {
  callSendAPI(sender_psid, `Received attachment message ${message.text}`);
}

function handleTextMessage(sender_psid, message) {
  // getting current message
  let msg = message.text;
  msg = msg.toLowerCase();

  PREV_WORD = PREV_OF_LATEST;
  PREV_OF_LATEST = LATEST_MESSAGE;
  LATEST_MESSAGE = msg;

  // kind of accepted reaction from user
  let greeting = ["hi", "hai", "hello"];
  let accepted_msg = ["yeah", "yup", "sure", "yep", "yes", "y"];
  let deny_msg = ["nah", "no", "nope", "maybe later"];
  let thanks_msg = [
    "thanks",
    "thank you",
    "thanks a lot",
    "thank you very much",
  ];

  let response;

  if (msg === "#getStarted") {
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
  if (greeting.includes(msg)) {
    if (FIRST_NAME === "") {
      response = {
        text: "Hello! Would you like to answer few questions?",
        quick_replies: [
          {
            "content-type": "text",
            title: "Sure",
            payload: "sure",
          },
          {
            "content-type": "text",
            title: "Nope",
            payload: "nope",
          },
        ],
      };
      callSendAPI(sender_psid, ``, response);
    } else {
      callSendAPI(
        sender_psid,
        `Cant process incoming message, bot need to train more. You said ${message.text}. Try to say Hi or #getStarted to start again`
      );
    }
  }

  // accept case
  else if (accepted_msg.includes(msg)) {
    // FIRST_NAME empty
    if (FIRST_NAME === "") {
      if (countWords(LATEST_MESSAGE) === 1 && !greeting.includes(PREV_WORD)) {
        for (const i = 0; i < accepted_msg.length; i++) {
          if (msg.includes(accepted_msg[i])) break;
        }

        if (i !== accepted_msg.length) {
          FIRST_NAME = capitalizeFirstLetter(extractName());
          console.log(FIRST_NAME);

          callSendAPI(
            sender_psid,
            `We will record your first name as ${FIRST_NAME}, Next, what is your birth date? Write it down below in the format YYYY-MM-DD. Example: 1994-01-18`
          );
        } else {
          callSendAPI(sender_psid, `First, please write below your first name`);
        }
      } else {
        callSendAPI(sender_psid, `First, please write below your first name`);
      }
    }
    // BIRTH_DATE empty
    else if (BIRTH_DATE === "") {
      if (
        countWords(LATEST_MESSAGE) === 1 &&
        extractDate().split("-").length - 1 === 2
      ) {
        BIRTH_DATE = PREV_OF_LATEST;
        console.log(BIRTH_DATE);

        let response = {
          text: `We record your birth date is ${BIRTH_DATE}. Would you like to know how many days until your birthday?`,
          quick_replies: [
            {
              content_type: "text",
              title: "I do",
              payload: "i do",
            },
            {
              content_type: "text",
              title: "Not today",
              payload: "not today",
            },
          ],
        };

        callSendAPI(sender_psid, ``, response);
      } else {
        callSendAPI(
          sender_psid,
          `We will record your first name as ${FIRST_NAME}, Next, what is your birth date? Write it down below in the format YYYY-MM-DD. Example: 1994-01-18`
        );
      }
    }
    // if first name and birth date is not empty
    else if (FIRST_NAME !== "" && BIRTH_DATE !== "")
      var remaining_days = countBirthDays();

    if (remaining_days === -1) {
      callSendAPI(
        sender_psid,
        `False birth date. If you wish to start again write #getStarted. See You`
      );
    } else {
      // show remaining days until birthday
      callSendAPI(
        sender_psid,
        `There are ${remaining_days} days until your birthday!`
      );
    }
  }

  // deny case
  else if (deny_msg.includes(msg)) {
    callSendAPI(
      sender_psid,
      `Thank you for your answer. If you wish to start again write #getStarted. See You`
    );
  }

  // gratitude case
  else if (thanks_msg.includes(msg)) {
    callSendAPI(
      sender_psid,
      `You're welcome!. If you wish to start again write #getStarted. See You`
    );
  }

  //
  else {
    let response;

    // if bot dont know the first name
    if (!FIRST_NAME) {
      LATEST_MESSAGE = capitalizeFirstLetter(LATEST_MESSAGE);
      response = {
        text: `Is it ${LATEST_MESSAGE} your first name?`,
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

      callSendAPI(sender_psid, ``, response);
    }

    // if bot dont know the birth date
    else if (!BIRTH_DATE) {
      response = {
        text: `Is it ${LATEST_MESSAGE} your birth date?`,
        quick_replies: [
          {
            content_type: "text",
            title: "Yeah",
            payload: "yeah",
          },
          {
            content_type: "text",
            title: "Nope",
            payload: "nope",
          },
        ],
      };

      callSendAPI(sender_psid, ``, response);
    }
    // something else
    else {
      callSendAPI(
        sender_psid,
        `Thank you for your answer. If you wish to start again write #getStarted. See You`
      );
    }
  }

  // function to capitalize first letter of a word
  function capitalizeFirstLetter(string) {
    return string.charAt[0].toUpperCase() + string.slice(1);
  }

  // func to count birth day
  function countBirthDays(birthDate = BIRTH_DATE) {
    let today = moment().format("YYYY-MM-DD");

    // calculate current age of person in years
    const years = moment().diff(birthDate, "years");

    // Special case if birthday is today; we do NOT need an extra year added
    const adjustToday = birthdate.substring(5) === today.substring(5) ? 0 : 1;

    // Add age plus one year (unless birthday is today) to get next birthday
    const nextBirthday = moment(birthdate).add(years + adjustToday, "years");

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

  function handleQuickReply(sender_psid, message) {
    let msg = message.text;
    msg = msg.toLowerCase();

    if (msg === "sure") {
      if (!FIRST_NAME) {
        callSendAPI(sender_psid, `First, please write below your first name`);
      } else {
        callSendAPI(
          sender_psid,
          `Cant process incoming message, bot need to train more. You said ${message.text}. Try to say Hi or #getStarted to start again`
        );
      }
    }
    // user agreed on his first name
    else if (msg === "yes") {
      for (const i = 3; i < LATEST_MESSAGE.length; i++) {
        FIRST_NAME += LATEST_MESSAGE[i];

        if (LATEST_MESSAGE[i] === " ") break;
      }

      FIRST_NAME = capitalizeFirstLetter(FIRST_NAME);
      console.log(FIRST_NAME);

      callSendAPI(
        sender_psid,
        `We will record your first name as ${FIRST_NAME}, Next, what is your birth date? Write it down below in the format YYYY-MM-DD. Example: 1994-01-18`
      );
    }
    // user aggreed on his birth date
    else if (msg === "yeah") {
      for (const i = 3; i < LATEST_MESSAGE.length; i++) {
        BIRTH_DATE += LATEST_MESSAGE[i];

        if (LATEST_MESSAGE[i] === " ") break;
      }
      console.log(BIRTH_DATE);

      let response = {
        text: `We record your birth date is ${BIRTH_DATE}. Would you like to know how many days until your birthday?`,
        quick_replies: [
          {
            content_type: "text",
            title: "I do",
            payload: "i do",
          },
          {
            content_type: "text",
            title: "Not today",
            payload: "not today",
          },
        ],
      };

      callSendAPI(sender_psid, ``, response);
    }
    // user agreed to know bith date days
    else if (msg === "i do") {
      var remaining_days = countBirthDays();

      // bad information
      if (remaining_days === -1) {
        callSendAPI(
          sender_psid,
          `False birth date. If you wish to start again write #getStarted. See You`
        );
      }
      // valid information, executed count birthda
      else {
        // show remaining days until birthday
        callSendAPI(
          sender_psid,
          `There are ${remaining_days} days until your birthday!`
        );
      }
    } else if (
      msg === "no" ||
      msg === "maybe later" ||
      msg === "nope" ||
      msg === "not at all"
    ) {
      callSendAPI(
        sender_psid,
        `Thank you for your answer. If you wish to start again write #getStarted. See You`
      );
    } else {
      callSendAPI(
        sender_psid,
        `Cant process incoming message, bot need to train more. You said ${message.text}. Try to say Hi or #getStarted to start again`
      );
    }
  }

  function countWords(string) {
    var matches = str.match(/[\w\d\’\'-]+/gi);
    return matches ? matches.length : 0;
  }

  // function to extract first name of user
  function extractName(firstName = PREV_OF_LATEST) {
    let name = "";
    for (let i = 3; i < FIRST_NAME; i++) {
      name += firstName[i];
    }
    return name;
  }

  // function to extract date from user
  function extractDate(date = PREF_OF_LATEST) {
    let dt = "";
    for (let i = 3; i < date.length; i++) {
      if (date[i] === " ") break;
      dt += date[i];
    }
    return dt;
  }
}

module.exports = router;
