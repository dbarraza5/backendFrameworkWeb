const express = require("express")
const path = require("path")

global.app = express();
const mongoose = require("mongoose")
const session = require('express-session');

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1) // trust first proxy
app.use( session( {
    name : 'app.sid',
    secret: "1234567890QWERTY",
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
}));


const {router_auth, isAuthenticated,} = require("./routes/autentificacion")
app.use(router_auth)

const router_api = require("./routes/Api")
app.use("/api", router_api)


//https://dev.to/emmysteven/solved-mongoose-unique-index-not-working-45d5
const mongo_uri = "mongodb://localhost:27017/framework-videojuego"
const options = {
    autoIndex: true, //this is the code I added that solved it all
}
mongoose.connect(mongo_uri,options ,function (err){
    if(err){
        throw err;
    }else{
        console.log("conexion exitosa ${mongo_uri}")
    }
})

app.get("/", (req, res)=>{
})


app.get("/home", isAuthenticated, (req, res)=>{
    res.send('hello, ' + req.session.user+ '!' +
        ' <a href="/logout">Logout</a>')
    //return res.send("aver")
})




app.listen(3000, ()=>{
    console.log("servidor en linea...")
})