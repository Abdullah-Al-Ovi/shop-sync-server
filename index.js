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

// Authorization and authentication:
const verifyingToken =(req,res,next)=>{
  if(!req.headers?.authorization){
    return res.status(401).send({message:'User unauthorized'})
  }
  const token = req.headers.authorization.split(' ')[1]
  console.log(token);
  jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'User unauthorized'})
    }
    req.decoded = decoded
    next()
  })  
}

const verifyingAdmin =async(req,res,next)=>{
  const email = req.decoded?.email
  const exist = await userCollection.findOne({email : email})
  const isAdmin = exist.role === 'admin'
  if(!isAdmin){
    return res.status(403).send({message:'Forbidden access'})
  }
  next()
}

const verifyingManager =async(req,res,next)=>{
  const email = req.decoded?.email
  const exist = await userCollection.findOne({email : email})
  const isAdmin = exist.role === 'manager'
  if(!isAdmin){
    return res.status(403).send({message:'Forbidden access'})
  }
  next()
}

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
    const productCollection = client.db('shopSync').collection('products')
    const cartCollection = client.db('shopSync').collection('carts')
    const saleCollection = client.db('shopSync').collection('sales')

    app.post('/users',async(req,res)=>{
        const userInfo = req.body 
        const existUser = await userCollection.findOne({email:userInfo.email})
        if(existUser){
          return res.send({message:'user already exist',insertedId: null})
        }
        const result = await userCollection.insertOne(userInfo)
        res.send(result)
      })

    app.post('/createShop',verifyingToken,verifyingManager,async(req,res)=>{
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

    app.patch('/users/:email',verifyingToken,async(req,res)=>{
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
    app.get('/users/:email',verifyingToken,async(req,res)=>{
      const email = req.params?.email 
      const result = await userCollection.findOne({email: email})
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

      app.get('/products/:email',verifyingToken,verifyingManager,async(req,res)=>{
        const email = req.params.email
        const result = await productCollection.find({manager: email}).toArray()
        res.send(result)
      })

      app.get('/products/update/:id',verifyingToken,verifyingManager,async(req,res)=>{
        const id = req.params.id
        const result = await productCollection.findOne({_id: new ObjectId(id)})
        res.send(result)
      })

      app.get(`/carts/:email`,verifyingToken,verifyingManager,async(req,res)=>{
        const email = req.params.email
        const result = await cartCollection.find({manager: email}).toArray()
        res.send(result)
      })

      app.get('/sales/:email',verifyingToken,verifyingManager,async(req,res)=>{
        const email = req.params.email
        const result = await saleCollection
        .find({ manager: email })
        .sort({ sellingDate: -1 }) 
        .toArray();
        res.send(result)
      })

      app.patch('/products/update/:id',verifyingToken,verifyingManager,async(req,res)=>{
        const id = req.params.id
        const body = req.body
        console.log(id);
        console.log(body);
        const updatedDoc = {
          $set:{
                productName : body?.productName,
                productImage:body?.productImage ,
                productQuantity :body?.productQuantity ,
                productLocation :body?.productLocation,
                productionCost : body?.productionCost,
                profitMargin: body?.profitMargin,
                discount :body?.discount ,
                description:body?.description,
                sellingPrice : body?.sellingPrice 
          }
        }
        
        const result = await productCollection.updateOne({_id: new ObjectId(id)},updatedDoc)
        res.send(result)
      })

      app.post('/addProduct',verifyingToken,verifyingManager,async(req,res)=>{
        const productInfo = req.body 
        console.log(productInfo);
        const shop = await shopCollection.findOne({_id: new ObjectId(productInfo?.shopId)})
        // console.log(shop?.productsCount,shop?.limit,shop);
        if(shop?.limit>0){
          const result = await productCollection.insertOne(productInfo) 
          // console.log('hobe');
          res.send(result)
        }
        else{
          // console.log('hobena');
         return res.send({message:'You have crossed your product adding limit',insertedId: null})
         
        }
      })

      app.post('/sales',verifyingToken,verifyingManager,async(req,res)=>{
        const salesInfo = req.body
        const query = {
          _id : {
            $in: salesInfo?.cartIds?.map(id=>new ObjectId(id))
          }
        }
        const insertResult = await saleCollection.insertOne(salesInfo)
        const deleteResult = await cartCollection.deleteMany(query)

        res.send({insertResult,deleteResult})
      })


      app.post('/carts',verifyingToken,verifyingManager,async(req,res)=>{
        const cartInfo = req.body 
        const result = await cartCollection.insertOne(cartInfo)
        res.send(result)
      })

      app.patch('/changeLimit/:shopId',async(req,res)=>{
        const shopId = req.params.shopId
        const shop = await shopCollection.findOne({_id: new ObjectId(shopId)})
        const newLimit = shop?.limit - 1;
        
        const updatedDoc = {
          $set:{
            limit : newLimit
          }
        }
        const result = await shopCollection.updateOne({_id: new ObjectId(shopId)},updatedDoc)
        res.send(result)
      })

      app.patch('/updateSaleCount/:id',async(req,res)=>{
        const id = req.params.id
        console.log(id);
        const product = await productCollection.findOne({_id: new ObjectId(id)})
        const newSaleCount = product?.saleCount + 1;
        const newQuantity = product?.productQuantity - 1;
        
        const updatedDoc = {
          $set:{
            saleCount : newSaleCount,
            productQuantity: newQuantity
          }
        }
        const result = await productCollection.updateOne({_id: new ObjectId(id)},updatedDoc)
        res.send(result)
      })

      app.patch('/increaseLimit/:shopId',async(req,res)=>{
        const shopId = req.params.shopId
        const shop = await shopCollection.findOne({_id: new ObjectId(shopId)})
        const newLimit = shop?.limit + 1;
        
        const updatedDoc = {
          $set:{
            limit : newLimit
          }
        }
        const result = await shopCollection.updateOne({_id: new ObjectId(shopId)},updatedDoc)
        res.send(result)
      })

      app.patch(`/productCountIncrease/:shopId`,async(req,res)=>{
        const shopId = req.params.shopId
        const shop = await shopCollection.findOne({_id: new ObjectId(shopId)})
        const newProductsCount = shop?.productsCount + 1;
        const updatedDoc = {
          $set:{
            productsCount: newProductsCount
          }
        }
        const result = await shopCollection.updateOne({_id: new ObjectId(shopId)},updatedDoc)
        res.send(result)
      })

      app.patch(`/productCountDecrease/:shopId`,async(req,res)=>{
        const shopId = req.params.shopId
        const shop = await shopCollection.findOne({_id: new ObjectId(shopId)})
        const newProductsCount = shop?.productsCount - 1;
        const updatedDoc = {
          $set:{
            productsCount: newProductsCount
          }
        }
        const result = await shopCollection.updateOne({_id: new ObjectId(shopId)},updatedDoc)
        res.send(result)
      })

      app.delete('/products/:id',verifyingToken,verifyingManager,async(req,res)=>{
        const id = req.params.id
        const result = await productCollection.deleteOne({_id : new ObjectId(id)})
        res.send(result)
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