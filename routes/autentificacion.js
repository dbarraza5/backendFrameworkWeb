// middleware to test if authenticated
const express = require("express");
const User = require("../modelo/user")

const jwt = require("jsonwebtoken")

const TOKEN_KEY = "YclxoVrkm21fQ20w92IKmaueerKR4l0h";

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(authHeader);
    if(token==null)
        return res.status(401).send("Token requerido");
    jwt.verify(token, TOKEN_KEY, (err, user)=>{
        if(err) return res.status(403).send("Token invalido");
        console.log(user);
        req.user = user;
        next();
    });
}

function isAuthenticated (req, res, next) {
    if (req.session.user){
        next()
    }else{
        res.status(400)//.send({error: "usted no esta autenticado."});
        res.redirect("/")
        next('route')
    }

}

const router_auth = express.Router();


router_auth.get("/ventas", verifyToken,((req, res)=>{
    res.send("sdfdsfsdf")
}))

router_auth.post("/register", ((req, res) => {
    const {email, pasword} = req.body;
    console.log(req.body)
    const user = new User(req.body)
    user.save(error => {
        if(error){
            res.status(500).send("Error al registrar al usuario."+error)
        }else{
            res.send("Usuario registrado exitosamente.")
        }
    })
}))

router_auth.post("/login", ((req, res, next) => {
    const {email, password} = req.body;
    User.findOne({"email":email}, (error, user)=>{
        if(error){
            res.status(500).send("Error del loggin."+error)
        }else if(!user){
            return res.status(500).json({"error": "email y/o password incorrectos"})
        }else{
            user.isCorrectPassword(password, (err1, result)=>{
                if(err1){
                    return res.status(500).json({"error": "Error al autenticar."+err1})
                    //res.status(500).send("Error al autenticar."+err1)
                }else if(result){
                    req.session.user = req.body
                    req.session.authenticated = true;
                    const token = jwt.sign(
                    {userId: user._id, email: user.email},
                        TOKEN_KEY,
                        {expiresIn: "2h"}
                    )
                    const respuesta = {id: user._id, token: token}

                    res.send(respuesta)
                    //res.redirect("/home")
                }else{
                    return res.status(500).json({"error": "email y/o password incorrectos"})
                    //res.status(500)//.send("email y/o password incorrectos")
                    //res.redirect("/")
                }
            })
        }
    })
}))

router_auth.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect("/")
});

module.exports = {router_auth, isAuthenticated}