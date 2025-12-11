require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

app.use(
  cors({
    origin: process.env.CLIENT_URL, // NOT '*'
    credentials: true,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});










async function run() {
  try {
    const database = client.db("boimela");
    const usersCollection = database.collection("users");





    app.get('/users',  async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log('New User', user);
      const isExisting = await usersCollection.findOne({ email: user.email });
      if (isExisting) {
        console.log('User already exists');
        return res.send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send({ message: 'User created successfully' });
    });


    app.get('/books', async (req, res) => {
      const booksCollection = database.collection("books");
      const result = await booksCollection.find().toArray();
      res.send(result);
    });


    app.post('/books', async (req, res) => {
      const booksCollection = database.collection("books");
      const book = req.body;
      console.log('New Book', book);
      const result = await booksCollection.insertOne(book);
      res.send({ message: 'Book added successfully' });
    });


    app.get('/books' async (req, res) => {
      const result = await booksCollection.find().toArray();
      res.send(result);
    });















  } finally {

  }
}
run().catch(console.dir);












app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});