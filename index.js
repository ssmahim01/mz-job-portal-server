require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://mz-job-portal.web.app',
    'https://mz-job-portal.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if(!token){
    return res.status(401).send({message: 'Unauthorized access'})
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'Unauthorized access'});
    }

    req.user = decoded;
    next();
  })

};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ybs8l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    const jobCollection = client.db("jobPortalDB").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortalDB")
      .collection("job_applications");

    // Auth related APIs
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '5h'});

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success: true})
    });

    app.post("/logout", (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success: true})
    });

    // Jobs related APIs

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};

      if (email) {
        query = { hr_email: email };
      }

      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const insertResult = await jobCollection.insertOne(newJob);
      res.send(insertResult);
    });

    // Job Application related APIs

    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      // token email !== query email
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'Forbidden access'})
      }

      const result = await jobApplicationCollection.find(query).toArray();

      for (const application of result) {
        const secondQuery = { _id: new ObjectId(application.job_id) };
        const jobResult = await jobCollection.findOne(secondQuery);
        if (jobResult) {
          application.title = jobResult.title;
          application.location = jobResult.location;
          application.jobType = jobResult.jobType;
          application.salaryRange = jobResult.salaryRange;
          application.applicationDeadline = jobResult.applicationDeadline;
          application.company = jobResult.company;
          application.company_logo = jobResult.company_logo;
        }
      }

      res.send(result);
    });

    app.get("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const singleResult = await jobApplicationCollection.findOne(query);
      res.send(singleResult);
    });

    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);

      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      let newCount = 0;

      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          applicationCount: newCount,
        },
      };

      const updateResult = await jobCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: data.status,
        },
      };

      const updateResult = await jobApplicationCollection.updateOne(
        filter,
        updatedDoc
      );

      res.send(updateResult);
    });

    app.delete("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const deleteResult = await jobApplicationCollection.deleteOne(query);
      // console.log(deleteResult);
      res.send(deleteResult);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MZ Job Portal server is ready");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});