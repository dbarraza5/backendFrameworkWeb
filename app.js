

const express = require("express")
const path = require("path")

global.app = express();
const mongoose = require("mongoose")
const session = require('express-session');
//import {config} from "./config";
const config = require("./config");

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//permitir peticiones de un servidor desde otro dominio
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", config.SERVIDOR_CLIENTE); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.set('trust proxy', 1) // trust first proxy
app.use( session( {
    name : 'app.sid',
    secret: "1234567890QWERTY",
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
}));


const {router_auth} = require("./routes/LoginRegistro")
app.use("/user", router_auth)

const router_api = require("./routes/Api")
const {isAuthenticated} = require("./middleware/Autentificacion");
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




app.listen(5000, ()=>{
    console.log("servidor en linea...")
})