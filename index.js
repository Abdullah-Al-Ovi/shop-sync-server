const express = require('express')
const cors = require('cors')
const app = express()
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5001
require('dotenv').config()
app.use(cors({
    origin:['http://localhost:5173']
}))
app.use(express.json())
let userCollection;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wukhoja.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    userCollection = client.db('shopSync').collection('users')
    const shopCollection = client.db('shopSync').collection('shops')

    app.post('/users',async(req,res)=>{
        const userInfo = req.body 
        const existUser = await userCollection.findOne({email:userInfo.email})
        if(existUser){
          return res.send({message:'user already exist',insertedId: null})
        }
        const result = await userCollection.insertOne(userInfo)
        res.send(result)
      })

    app.post('/createShop',async(req,res)=>{
        const shopInfo = req.body
        shopInfo.limit = 3;
        console.log(shopInfo);
        const existShop = await shopCollection.findOne({ownerEmail : shopInfo.ownerEmail})
        if(existShop){
            return res.send({message:'You have already created a shop',insertedId: null})
        }
        const result = await shopCollection.insertOne(shopInfo)
        res.send(result)
    })  

    app.patch('/users/:email',async(req,res)=>{
        const updatedUserInfo = req.body
        const email = req.params?.email
      const filter = {email:email}
      const updatedDoc ={
        $set:{
          role: 'manager',
          shopName : updatedUserInfo.shopName,
          shopId: updatedUserInfo.shopId,
          shopLogo : updatedUserInfo.shopLogo
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })

    app.get('/users/manager/:email',async(req,res)=>{
        const email = req.params?.email 
        // if(email !== req.decoded?.email){
        //   return res.status(403).send({message:'Forbidden access'})
        // }
        let isManager = false 
        const exist = await userCollection.findOne({email: email})
        if(exist){
          isManager = exist.role === 'manager'
        }
        res.send(isManager)
      })
      app.get('/users/admin/:email',async(req,res)=>{
        const email = req.params?.email 
        // if(email !== req.decoded?.email){
        //   return res.status(403).send({message:'Forbidden access'})
        // }
        let isAdmin = false 
        const exist = await userCollection.findOne({email: email})
        if(exist){
          isAdmin = exist.role === 'admin'
        }
        res.send(isAdmin)
      })
    // JWT......
    app.post('/jwt',(req,res)=>{
        const user = req.body 
        const token = jwt.sign(user,process.env.ACCESS_TOKEN,{
          expiresIn:'7h'
        })
        res.send({token})
      })
  } finally {
    
    
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('Shop Sync Server');
})
app.listen(port,()=>{
    console.log(`App is running on ${port}`);
})