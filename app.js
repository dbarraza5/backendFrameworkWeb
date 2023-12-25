

const express = require("express")
const path = require("path")

global.app = express();
const mongoose = require("mongoose")
const session = require('express-session');
//import {config} from "./config";
const config = require("./config");

app.use(express.static(path.join(__dirname, 'public')))
//app.use(express.json());
//app.use(express.urlencoded({ extended: true }));

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const cookieParser = require("cookie-parser");
//app.use(cookieParser());

var cors = require('cors')
var corsOptions = {
    credentials: true,
    origin: [config.SERVIDOR_CLIENTE],
    methods: ["GET","HEAD","PUT","PATCH","POST","DELETE"],
    optionSuccessStatus:200,
    //"preflightContinue": false,
    //"optionsSuccessStatus": 204
}

app.use(cors(corsOptions))
//app.options("*", cors());
//permitir peticiones de un servidor desde otro dominio
/*app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", config.SERVIDOR_CLIENTE); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});*/
const mongo_uri = "mongodb://daniel:12345@db_mongo_docker:27017/framework-videojuego?authSource=admin"
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
    uri: mongo_uri,
    collection: 'sessions'
});

const oneDay = 1000 * 60 * 60 * 24;
app.set('trust proxy', 1) // trust first proxy
app.use( session( {
    //name: 'app.sid',
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: {
        sameSite: true,
        maxAge: oneDay,
        secure: false,
        //sameSite: 'none'
    },
    rolling: true,
    resave: false,
    store: store
}));


const {router_auth} = require("./routes/LoginRegistro")
app.use("/user", router_auth)

const router_api = require("./routes/Api")

const {verifyToken} = require("./middleware/Autentificacion");
const {isAuthenticated} = require("./middleware/Autentificacion");
app.use("/api", isAuthenticated,verifyToken, router_api)


//https://dev.to/emmysteven/solved-mongoose-unique-index-not-working-45d5

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


/*app.get("/home", isAuthenticated, (req, res)=>{
    res.send('hello, ' + req.session.user+ '!' +
        ' <a href="/logout">Logout</a>')
    //return res.send("aver")
})*/




app.listen(5000, ()=>{
    console.log("servidor en linea...")
})