require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const e = require("express");
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

app.get("/", (req, res) => {
  res.send("Hello World!");
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
    const booksCollection = database.collection("books");
    const wishlistCollection = database.collection("wishlist");



    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("New User", user);
      const isExisting = await usersCollection.findOne({ email: user.email });
      if (isExisting) {
        console.log("User already exists");
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send({ message: "User created successfully" });
    });

    app.patch('/users/:userId', async (req, res) => {
      const userId = req.params.userId;
      const updatedRole = req.body;
      console.log("Updating user:", userId, "with data:", updatedRole);
      const filter = { _id: new ObjectId(userId) };
      const updateDoc = {
        $set: updatedRole,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send({ message: "User updated successfully" });
    });

    app.get("/books", async (req, res) => {
      const email = req.query.email;
      console.log("Email:", email);

      const query = {
        visibility: "public"
      };

      if (email) {
        query["seller.email"] = email;
      }

      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allbooks", async (req, res) => {
      const email = req.query.email;
      console.log("Email:", email);

      const query = {
      };

      if (email) {
        query["seller.email"] = email;
      }

      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });



    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const book = await booksCollection.findOne({_id: new ObjectId(id)});
      res.send(book);
    });

    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBook = req.body;
      console.log("Updating book:", id, "with data:", updatedBook);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBook,
      };
      const result = await booksCollection.updateOne(filter, updateDoc);
      res.send({ message: "Book updated successfully" });
    });


    app.post("/books", async (req, res) => {
      const book = req.body;
      console.log("New Book", book);
      const result = await booksCollection.insertOne(book);
      res.send({ message: "Book added successfully" });
    });

    app.get("/wishlist", async (req, res) => {
      const query = {};
      const userEmail = req.query.userEmail;
      if (userEmail) {
        query.userEmail = userEmail;
      }
      if (req.query.bookId) {
        query.bookId = req.query.bookId;
      }
      console.log("Wishlist Query:", query);
      if(Object.keys(query).length > 0){
        const result = await wishlistCollection.findOne(query);
        console.log("Wishlist Result:", result);
        return res.send(result);
      }
      const result = await wishlistCollection.find().toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wishItem = req.body;
      // console.log("New Wish Item", wishItem);
      // return;
      const result = await wishlistCollection.insertOne(wishItem);
      res.send({ message: "Wish item added successfully" });
    });

    app.delete('/wishlist', async (req, res) => {
      const id = req.query.bookId;
      const userEmail = req.query.userEmail;
      console.log("Delete Wish Item Book ID:", id, "User Email:", userEmail);
      const result = await wishlistCollection.deleteOne({ bookId: id, userEmail: userEmail });
      res.send({ message: "Wish item deleted successfully" });
    });














  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
