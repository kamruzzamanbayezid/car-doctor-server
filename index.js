const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5001;

// middleware
app.use(cors({
      origin: ['http://localhost:5173'],
      credentials: true
}))
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d8abmis.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
      serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
      }
});

const serviceCollection = client.db("carDoctor").collection("services");
const bookingsCollection = client.db("carDoctor").collection("bookings");

// middleware
const logger = (req, res, next) => {
      console.log('called', req.hostname, req.originalUrl);
      next();
}

// verifyToken
const verifyToken = (req, res, next) => {
      const token = req.cookies.token;
      if (!token) {
            res.status(401).send({ message: 'Unauthorized Access' })
      }
      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
            if (err) {
                  res.status(401).send({ message: 'Unauthorized Access' })
            }
            req.user = decoded
            console.log('decoded',decoded);
            next()
      })
}

async function run() {
      try {
            // Connect the client to the server	(optional starting in v4.7)
            await client.connect();

            // access token api
            app.post('/jwt', async (req, res) => {
                  const user = req.body;
                  const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' })
                  res
                        .cookie('token', token, {
                              httpOnly: true,
                              secure: false
                        })
                        .send({ message: true })
            })
            
            
            // clear token
            app.post('/logout', async (req, res) => {
                  const user = req.body;
                  res
                        .clearCookie('token', { maxAge: 0 })
                        .send({ success: true })
            })

            // services
            app.get('/services', logger, async (req, res) => {
                  const cursor = serviceCollection.find();
                  const result = await cursor.toArray();
                  res.send(result);
            })

            app.get('/services/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: id }
                  const options = {
                        projection: { title: 1, price: 1, img: 1 },
                  };
                  const result = await serviceCollection.findOne(query, options);
                  res.send(result);
            })


            // booking
            app.get('/bookings', logger, verifyToken, async (req, res) => {
                  console.log('user email:', req.user.email);
                  console.log('query email', req.query.email);

                  if (req.query?.email !== req.user?.email) {
                        return res.status(403).send({ message: 'Forbidden' })
                  }

                  let query = {};
                  if (req.query?.email) {
                        query = { email: req.query.email }
                  }
                  const result = await bookingsCollection.find(query).toArray();
                  return res.send(result)
            })



            app.get('/bookings/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const result = await bookingsCollection.findOne(query);
                  res.send(result)
            })

            app.post('/bookings', async (req, res) => {
                  const bookingService = req.body;
                  const result = await bookingsCollection.insertOne(bookingService);
                  res.send(result);
            })

            app.delete('/bookings/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const result = await bookingsCollection.deleteOne(query);
                  res.send(result);
            })

            app.patch('/bookings/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const updated = req.body;
                  const updateDoc = {
                        $set: {
                              status: updated.status
                        },
                  };
                  const result = await bookingsCollection.updateOne(query, updateDoc);
                  res.send(result);
            })

            // Send a ping to confirm a successful connection
            await client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
      } finally {
            // Ensures that the client will close when you finish/error
            // await client.close();
      }
}
run().catch(console.dir);




app.get('/', (req, res) => {
      res.send('Car doctor server is running')
})

app.listen(port, () => {
      console.log(`Car doctor server running in port: ${port}`);
})