  
# Node JS Messenger Bot
A Facebook Messenger bot using Node JS, with task to ask first name, birth date, and asking if the user wants to know how many days till his next birthday 

### How to use this project

1. Clone this project
2. Run ```npm install``` to install depedencies
3. Rename .env.example file to .env file and fill the required variables
    - DB_NAME=test        your DB name, or by default it create "test" database name
    - DB_CONNECTION=      mongodb connect url. ex: mongodb://mongo:... 
    - DB_COLLECTION=      collection used to store messages, im using "messages"
    - MONGO_DB_PASSWORD=  password of your database
    - MONGO_DB_USER=      username of your database

    - VERIFY_TOKEN=       random string, but should be same as in the messenger app setting in facebook
    - PAGE_ACCESS_TOKEN=  generated from messenger setting (in section Access token)

4. Run ```npm start``` for starting project

I'm suggesting to host this server in cloud, you can use Heroku for that
But in this project i'm using https://railway.app, its like Heroku but its free


### Maintaining conversation

Bot is still very early on his learning phase, so you should try to correctly answer the questions and choosing answers from given cards, although you can manually type messages.

How to start conversation:

1. Say greeting message, or type #getstarted
2. when bot asking for your first name, answer with string minimum 3 character
3. Bot crosscheck your first name input, theres an quick reply to answer that
4. Second question, bot asking for your birth date. You can answer using format YYY-MM-DD
5. After that, again bot crosscheck your birth date input, theres an quick reply to answer that
6. Last question,  asking if user wants to know how many days till his next birthday
7. There are quick reply for that, if you agree then bot reply how many days till your next birthday
8. If you disagree, bot reply with gratitude and the chat end here


### Storage of messages

All the messages received from users are stored in a MongoDB Atlas database. Each website visitor has an unique id when he starts a Messenger conversation, making the storage of messages structured in an easy way.



### Technologies used

- HTML, CSS, Javascript, Node.js

