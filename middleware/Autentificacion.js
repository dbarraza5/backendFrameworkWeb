const config = require("../config");
const jwt = require("jsonwebtoken");


function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(authHeader);
    if (token == null)
        return res.status(401).send("Token requerido");
    jwt.verify(token, config.TOKEN_KEY, (err, user) => {
        if (err) {
            return res.status(403).send("Token invalido");
        }
        console.log(user);
        req.user = user;
        next();
    });
}

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next()
    } else {
        res.status(400)//.send({error: "usted no esta autenticado."});
        res.redirect("/")
        next('route')
    }
}