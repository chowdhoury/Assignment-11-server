require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECURITY_KEY);
const admin = require("firebase-admin");
const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(
  cors({
    origin: ["http://localhost:5173", "https://assignment-11-bfd3b.web.app"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.user_Email = userInfo.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

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
    const ordersCollection = database.collection("orders");
    const paymentsCollection = database.collection("payments");

    app.get("/users", verifyAccessToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", verifyAccessToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user.role });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const isExisting = await usersCollection.findOne({ email: user.email });
      if (isExisting) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send({ message: "User created successfully" });
    });

    app.patch("/users/:userId", verifyAccessToken, async (req, res) => {
      const userId = req.params.userId;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (requester.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admins only" });
      }
      const updatedRole = req.body;
      const filter = { _id: new ObjectId(userId) };
      const updateDoc = {
        $set: updatedRole,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send({ message: "User updated successfully" });
    });







    app.get("/books", async (req, res) => {
      const email = req.query.email;

      const query = {
        visibility: "public",
      };

      if (email) {
        query["seller.email"] = email;
      }

      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allbooks", verifyAccessToken, async (req, res) => {
      const email = req.query.email;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (
        requester.role !== "admin" &&
        (requester.role !== "librarian" || requester.email !== email)
      ) {
        return res.status(403).send([]);
      }
      const query = {};
      if (email) {
        query["seller.email"] = email;
      }
      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allbooks/:id", verifyAccessToken, async (req, res) => {
      const id = req.params.id;
      const book = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(book);
    });

    app.patch("/allbooks/:id", verifyAccessToken, async (req, res) => {
      const id = req.params.id;
      const updatedBook = req.body;
      const theBook = await booksCollection.findOne({ _id: new ObjectId(id) });
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (
        (requester.role !== "librarian" ||
          requester.email !== theBook.seller.email) &&
        requester.role !== "admin"
      ) {
        return res.status(403).send([]);
      }
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBook,
      };
      const result = await booksCollection.updateOne(filter, updateDoc);
      res.send({ message: "Book updated successfully" });
    });

    app.post("/books", verifyAccessToken, async (req, res) => {
      const book = req.body;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (requester.role !== "librarian") {
        return res.status(403).send({ message: "Forbidden: Librarians only" });
      }
      const result = await booksCollection.insertOne(book);
      res.send({ message: "Book added successfully" });
    });

    app.delete("/books/:id", verifyAccessToken, async (req, res) => {
      const id = req.params.id;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (requester.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admins only" });
      }
      await wishlistCollection.deleteMany({ bookId: id });
      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({ message: "Book deleted successfully" });
    });










    app.get("/wishlist", verifyAccessToken, async (req, res) => {
      const query = {};
      const userEmail = req.query.userEmail;
      if (userEmail !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }
      if (userEmail) {
        query.userEmail = userEmail;
      }
      if (req.query.bookId) {
        query.bookId = req.query.bookId;
      }
      if (req.query.bookId) {
        const result = await wishlistCollection.findOne(query);
        return res.send(result || null);
      }
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/wishlist", verifyAccessToken, async (req, res) => {
      const wishItem = req.body;
      if (wishItem.userEmail !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }
      const result = await wishlistCollection.insertOne(wishItem);
      res.send({ message: "Wish item added successfully" });
    });

    app.delete("/wishlist", verifyAccessToken, async (req, res) => {
      const id = req.query.bookId;
      const userEmail = req.query.userEmail;
      if (userEmail !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }
      const result = await wishlistCollection.deleteOne({
        bookId: id,
        userEmail: userEmail,
      });
      res.send({ message: "Wish item deleted successfully" });
    });

    app.get("/orders", verifyAccessToken, async (req, res) => {
      const email = req.query.email;
      const sellerEmail = req.query.seller;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (requester.role === "admin") {
        const query = {};
        if (email) {
          query["buyer.email"] = email;
        }
        if (sellerEmail) {
          query["seller.email"] = sellerEmail;
        }
        const result = await ordersCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        return res.send(result);
      }

      if (email && email !== req.user_Email && sellerEmail !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }

      const query = {};
      if (email) {
        query["buyer.email"] = email;
      }
      if (sellerEmail) {
        query["seller.email"] = sellerEmail;
      }
      const result = await ordersCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/orders", verifyAccessToken, async (req, res) => {
      const order = req.body;
      if (order.buyer.email !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }
      const result = await ordersCollection.insertOne(order);
      res.send({ message: "Order placed successfully" });
    });

    app.patch("/orders/:id", verifyAccessToken, async (req, res) => {
      const id = req.params.id;
      const updatedOrder = req.body;
      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });

      if (!order) {
        return res.status(404).send({ message: "Order not found" });
      }

      // Only admin, seller, or buyer can update the order
      if (
        requester.role !== "admin" &&
        order.seller.email !== req.user_Email &&
        order.buyer.email !== req.user_Email
      ) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }

      // console.log("Updating order:", id, "with data:", updatedOrder);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedOrder,
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send({ message: "Order updated successfully" });
    });
    app.post(
      "/create-checkout-session",
      verifyAccessToken,
      async (req, res) => {
        const paymentInfo = req.body;
        if (paymentInfo.buyer.email !== req.user_Email) {
          return res.status(403).send({ message: "Forbidden: Access denied" });
        }
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  images: [paymentInfo?.bookCover],
                  name: paymentInfo?.bookTitle,
                  description: `by ${paymentInfo?.author}`,
                },
                unit_amount: Math.round(paymentInfo?.price * 100),
              },
              quantity: 1,
            },
          ],
          customer_email: paymentInfo?.buyer?.email,
          mode: "payment",
          metadata: {
            orderId: paymentInfo?.orderId,
            bookTitle: paymentInfo?.bookTitle,
            buyerEmail: paymentInfo?.buyer?.email,
          },
          success_url: `${process.env.CLIENT_URL}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/dashboard/payment-failed`,
        });
        res.send({ url: session.url });
      }
    );

    app.post("/payment-success", async (req, res) => {
      const { sessionId } = req.body;

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === "complete") {
        const orderId = session.metadata.orderId;
        const filter = { orderId: orderId };
        const updateDoc = {
          $set: {
            paymentStatus: "paid",
            status: "processing",
            transactionId: session.payment_intent,
          },
        };
        const result = await ordersCollection.updateOne(filter, updateDoc);
        const isExisting = await paymentsCollection.findOne({
          sessionId: sessionId,
        });
        if (isExisting) {
          return res.send({
            orderId: isExisting.orderId,
            transactionId: isExisting.transactionId,
          });
        }
        const paymentRecord = {
          orderId: orderId,
          transactionId: session.payment_intent,
          amount: session.amount_total / 100,
          paymentTime: new Date(),
          buyerEmail: session.customer_email,
          bookTitle: session.metadata.bookTitle,
          sessionId: session.id,
        };
        const paymentResult = await paymentsCollection.insertOne(paymentRecord);
      }
      res.send({
        orderId: session.metadata.orderId,
        transactionId: session.payment_intent,
      });
    });

    app.get("/invoices", verifyAccessToken, async (req, res) => {
      const buyerEmail = req.query.buyerEmail;
      const requester = await usersCollection.findOne({
        email: req.user_Email,
      });
      if (requester.role === "admin") {
        const query = {};
        if (buyerEmail) {
          query.buyerEmail = buyerEmail;
        }
        const result = await paymentsCollection
          .find(query)
          .sort({ paymentTime: -1 })
          .toArray();
        return res.send(result);
      }
      if (buyerEmail !== req.user_Email) {
        return res.status(403).send({ message: "Forbidden: Access denied" });
      }

      const query = {};
      if (buyerEmail) {
        query.buyerEmail = buyerEmail;
      }
      const result = await paymentsCollection
        .find(query)
        .sort({ paymentTime: -1 })
        .toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
