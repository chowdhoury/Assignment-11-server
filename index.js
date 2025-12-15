require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECURITY_KEY);
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
    const ordersCollection = database.collection("orders");
    const paymentsCollection = database.collection("payments");



    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log("New User", user);
      const isExisting = await usersCollection.findOne({ email: user.email });
      if (isExisting) {
        // console.log("User already exists");
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send({ message: "User created successfully" });
    });

    app.patch('/users/:userId', async (req, res) => {
      const userId = req.params.userId;
      const updatedRole = req.body;
      // console.log("Updating user:", userId, "with data:", updatedRole);
      const filter = { _id: new ObjectId(userId) };
      const updateDoc = {
        $set: updatedRole,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send({ message: "User updated successfully" });
    });






    app.get("/books", async (req, res) => {
      const email = req.query.email;
      // console.log("Email:", email);

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
      // console.log("get Email:", email);

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
      // console.log("Book ID:", id);
      const book = await booksCollection.findOne({_id: new ObjectId(id)});
      // console.log("Book:", book);
      res.send(book);
    });

    app.patch('/allbooks/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBook = req.body;
      // console.log("Updating book:", id, "with data:", updatedBook);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBook,
      };
      const result = await booksCollection.updateOne(filter, updateDoc);
      res.send({ message: "Book updated successfully" });
    });

    app.post("/books", async (req, res) => {
      const book = req.body;
      // console.log("New Book", book);
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
      // console.log("Wishlist Query:", query);
      if(Object.keys(query).length > 0){
        const result = await wishlistCollection.findOne(query);
        // console.log("Wishlist Result:", result);
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
      // console.log("Delete Wish Item Book ID:", id, "User Email:", userEmail);
      const result = await wishlistCollection.deleteOne({ bookId: id, userEmail: userEmail });
      res.send({ message: "Wish item deleted successfully" });
    });




    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const sellerEmail = req.query.seller;
      // console.log("Seller Email:", sellerEmail);
      // console.log("Orders Email:", email);
      const query = {
      };
      if (email) {
        query["buyer.email"] = email;
      }
      if (sellerEmail) {
        query["seller.email"] = sellerEmail;
      }
      const result = await ordersCollection.find(query).sort({createdAt: -1}).toArray();
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      // console.log("New Order", order);
      const result= await ordersCollection.insertOne(order);
      res.send({ message: "Order placed successfully" });
    });

    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const updatedOrder = req.body;
      // console.log("Updating order:", id, "with data:", updatedOrder);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedOrder,
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send({ message: "Order updated successfully" });
    });





    // Payments 
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      console.log("Payment Info:", paymentInfo);
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
    });


    // if (sessionId) {
    //   fetch(
    //     `${
    //       import.meta.env.VITE_server_url
    //     }/payment-success?sessionId=${sessionId}`
    //   )
    //     .then((res) => res.json())
    //     .then((data) => {
    //       console.log("Payment verification data:", data);
    //     });
    // }

    app.post("/payment-success", async (req, res) => {
      const { sessionId } = req.body;
        
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log("Stripe Session:", session);
      if(session.status === "complete"){
        const orderId = session.metadata.orderId;
        const filter = { orderId: orderId };
        const updateDoc = {
          $set: {
            paymentStatus: "paid",
            status: "processing",
            transactionId: session.payment_intent,
          }
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
        };
      res.send({ orderId: session.metadata.orderId, transactionId: session.payment_intent });
    });


    app.get('/invoices', async (req, res) => {
      const buyerEmail = req.query.buyerEmail;
      const query = {};
      if (buyerEmail) {
        query.buyerEmail = buyerEmail;
      }
      const result = await paymentsCollection.find(query).sort({paymentTime: -1}).toArray();
      res.send(result);
    });












  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
