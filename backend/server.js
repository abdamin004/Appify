const express = require('express');
const dotenv=require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
// .config db file should have the way we will config the db 
//app.get method-app.get(path, [middleware], callback)
//middle ware we are sing is cors   
dotenv.config();// reading everything from .env file and then we can access it using process.env
connectDB();//connecting to db
const app = express();//initializing express app
app.use(cors());// use the cors as my middle ware 
app.use(express.json());//thats allows the server to understand the json data that been sent into the http request body
app.use(express.urlencoded({ extended: true }));// thats another middleware that allows the server to understand the url encoded data that been sent into the http request body as <form> in html and after parsing it will be available in req.body as js object
app.use('/api/events', require('./routes/events'));// simply if the request come with /api/events then it will be handled by events route that we created in routes folder
app.use('/api/gym', require('./routes/gym'));// simply if the request come with /api/gym then it will be handled by gym route that we created in routes folder
app.use('/api/auth', require('./routes/Auth'));// simply if the request come with /api/auth then it will be handled by auth route that we created in routes folder
app.get('/',(req,res)=>{ //law khabat fel url yrod 3ala el root url bas 34an a check if the server is running or not
   res.send('University Event Management API is running');
  });
app.use((err,req,res,next)=>{// error handling middleware
  console.error(err.stack); //el stack daiman feha el error details zay el line number w  error message w file name w kda 
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000; //ya2ema men el .env file aw 5000
app.listen(PORT,()=>{
  console.log(`Server running on port ${PORT}`);
});

