const config = require("../config");
const jwt = require("jsonwebtoken");


function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    //console.log("AUTH = "+authHeader);
    if (token == null)
        return res.status(401).send("Token requerido");
    jwt.verify(token, config.TOKEN_KEY, (err, user) => {
        console.log("USER="+user);
        if (err) {
            if(err.name==="TokenExpiredError"){
                req.session.destroy()
                req.session = null
                res.clearCookie("usuario")
            }
            return res.status(403).send({error: err});
        }
        req.user = user;
        next();
    });
}

function isAuthenticated(req, res, next) {
    /*console.log("[Cookie1]")
    console.log( req.headers.cookie)

    console.log("[session]")
    console.log( req.session.user)*/
    if (req.session.user) {
        next()
    } else {
        res.status(401).send({error: {name:"NoAutenticado",msj:"usted no esta autenticado."}});
        //res.redirect("/")
        //next('route')
    }
}

module.exports = {verifyToken, isAuthenticated}