
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://real-db:JjgtWwJhrPQ82TKZ@cluster0.nqmctgu.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("real-db");
    const estateCollection = db.collection("estates");
    const usersCollection = db.collection("users");
    const reviewsCollection = db.collection("reviews");

    
    app.get("/estates", async (req, res) => {
      const email = req.query.email;
      const query = email ? { userEmail: email } : {};
      const result = await estateCollection.find(query).toArray();
      res.send(result);
    });

    
    app.get("/estates/:id", async (req, res) => {
      const { id } = req.params;
      const result = await estateCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });


    app.post("/estates", async (req, res) => {
      const newProperty = req.body;
      if (
        !newProperty.propertyName ||
        !newProperty.description ||
        !newProperty.category ||
        !newProperty.price ||
        !newProperty.location ||
        !newProperty.image ||
        !newProperty.postedDate ||
        !newProperty.userEmail ||
        !newProperty.userName
      ) {
        return res.status(400).send({ error: "Missing required fields" });
      }
      const result = await estateCollection.insertOne(newProperty);
      res.send({ insertedId: result.insertedId });
    });

    app.delete("/estates/:id", async (req, res) => {
      const { id } = req.params;
      const result = await estateCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ✅ UPDATED property (fixed)
    app.put("/estates/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid ID format" });
        }

        delete updatedData._id; // ✅ MongoDB doesn't allow updating _id

        const result = await estateCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        res.send(result);
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // ✅ GET latest 6 properties
    app.get("/home-features", async (req, res) => {
      const result = await estateCollection
        .find()
        .sort({ postedDate: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // ✅ POST user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existing = await usersCollection.findOne({ email: user.email });
      if (!existing) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } else {
        res.send({ message: "User already exists" });
      }
    });

    // ✅ POST review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      if (
        !review.propertyId ||
        !review.stars ||
        !review.comment ||
        !review.userEmail ||
        !review.userName
      ) {
        return res.status(400).send({ error: "Missing review fields" });
      }
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // ✅ GET reviews by propertyId
    app.get("/reviews", async (req, res) => {
      const { propertyId } = req.query;
      const query = propertyId ? { propertyId } : {};
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    // ✅ GET reviews by user email (for MyRatings)
    app.get("/my-reviews", async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res.status(400).send({ error: "Missing email" });
      }

      const reviews = await reviewsCollection.find({ userEmail: email }).toArray();

      // Enrich with property image
      const enriched = await Promise.all(
        reviews.map(async (r) => {
          const property = await estateCollection.findOne({ _id: new ObjectId(r.propertyId) });
          return {
            ...r,
            propertyImage: property?.image || "",
          };
        })
      );

      res.send(enriched);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(" Connected to MongoDB Atlas");
  } finally {
    
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(" Real Estate Server is Running");
});

app.listen(port, () => {
  console.log(` Server listening on port ${port}`);
});
