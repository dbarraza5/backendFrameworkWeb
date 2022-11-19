// middleware to test if authenticated
const express = require("express");
const User = require("../modelo/user")

const jwt = require("jsonwebtoken")
const config = require("../config");
const {verifyToken, isAuthenticated} = require("../middleware/Autentificacion");


const router_auth = express.Router();


router_auth.get("/ventas", verifyToken, isAuthenticated, ((req, res) => {
    res.send("sdfdsfsdf")
}))

router_auth.post("/register", ((req, res) => {
    const {email, pasword} = req.body;
    console.log(req.body)
    const user = new User(req.body)
    user.save(error => {
        if (error) {
            res.status(500).send(error)//.json({error: error})
        } else {
            res.json({"msj": "Usuario registrado exitosamente."})
        }
    })
}))

router_auth.post("/login", ((req, res, next) => {
    const {email, password} = req.body;
    User.findOne({"email": email}, (error, user) => {
        if (error) {
            res.status(500).send("Error del loggin." + error)
        } else if (!user) {
            return res.status(500).json({"error": "email y/o password incorrectos"})
        } else {
            user.isCorrectPassword(password, (err1, result) => {
                if (err1) {
                    return res.status(500).json({"error": "Error al autenticar." + err1})
                    //res.status(500).send("Error al autenticar."+err1)
                } else if (result) {
                    const token = jwt.sign(
                        {userId: user._id, email: user.email},
                        config.TOKEN_KEY,
                        {expiresIn: "2h"}
                    )
                    req.token = token;
                    req.session.user = {email:req.body.email}
                    req.session.authenticated = true;
                    //req.session.save()
                    const respuesta = {
                        id: user._id,
                        name: user.name,
                        surname: user.surname,
                        email: user.email,
                        token: token,
                    }

                    console.log(req.session)
                    res.send(respuesta)


                    //res.redirect("/home")
                } else {
                    return res.status(500).json({"error": "email y/o password incorrectos"})
                    //res.status(500)//.send("email y/o password incorrectos")
                    //res.redirect("/")
                }
            })
        }
    })
}))

router_auth.get('/logout', function (req, res) {
    //jwt.destroy(req.token, config.TOKEN_KEY);
    console.log(req.session.user)
    req.session.destroy();
    req.session = null;
    res.send("ok")
    //res.redirect("/")
});

module.exports = {router_auth}