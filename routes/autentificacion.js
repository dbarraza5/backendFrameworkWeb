// middleware to test if authenticated
const express = require("express");
const User = require("../modelo/user")


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
            res.status(500)//.send("El usuario no existe")
            res.redirect("/")
        }else{
            user.isCorrectPassword(password, (err1, result)=>{
                if(err1){
                    res.status(500).send("Error al autenticar."+err1)
                }else if(result){
                    req.session.user = req.body
                    req.session.authenticated = true;
                    //res.send("usuario autenticado exitosamente")
                    res.redirect("/home")
                }else{
                    res.status(500)//.send("email y/o password incorrectos")
                    res.redirect("/")
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