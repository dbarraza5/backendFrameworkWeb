const express = require("express");
const Proyecto = require("../modelo/proyecto")
const {Animacion} = require("../modelo/Animacion");

const router_api = express.Router();



router_api.get("/proyecto/id/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Proyecto.findOne({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    });
});

const { check, validationResult  } = require('express-validator')

const reglas =[check("nombre")
        .optional()
        .isLength({ min: 3 , max:20})
        .withMessage("the name must have minimum length of 3 and max 20")
        .trim(),]

router_api.post("/proyecto",reglas, ((req, res)=>{
    const error = validationResult(req).formatWith(({ msg }) => msg);
    const hasError = !error.isEmpty();

    if (hasError) {
        res.status(422).json({ error: error.array() });
    } else {
        const usuario_id = req.session.user.id
        const datos={
            ...req.body,
            usuario_id: usuario_id
        }
        const proyecto = new Proyecto(datos)
        proyecto.save((error, resultado) => {
            if(error){
                res.status(500).send({"error": error.message})
            }else{
                res.send(resultado)
            }
        })
    }
}));


router_api.put("/proyecto/id/:id_proyecto",reglas, ((req, res)=>{

    const error = validationResult(req).formatWith(({ msg }) => msg);

    const hasError = !error.isEmpty();

    if (hasError) {
        res.status(422).json({ error: error.array() });
    } else {
        const id_proyecto = req.params.id_proyecto;
        const filter = { '_id': id_proyecto };
        const update = {...req.body}

        const doc =  Proyecto.findOneAndUpdate(filter, update, { returnDocument:"after" },function( error, result){
            if(error)
            {
                return res.status(500).json({"error": error.message})
            }else{
                return res.json(result)
            }
        })
    }
}));

router_api.delete("/proyecto/id/:id_proyecto", ((req, res)=>{

        const id_proyecto = req.params.id_proyecto;
        const filter = { '_id': id_proyecto };

        const doc =  Proyecto.deleteOne(filter,function( error, result){
            if(error)
            {
                return res.status(500).json({"error": error.message})
            }else{
                return res.json(result)
            }
        })

}));


router_api.get("/proyecto/user/:id_usuario", (req, res)=>{
    const id_usuario = req.params.id_usuario;
    //console.log("[Cookie]")
    //console.log(req.cookies)
    const lista = Proyecto.find({'usuario_id':id_usuario },function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        return res.json(pro)
    });

});

router_api.get("/animacion/id/:id_animacion", (req, res)=>{
    const id_animacion = req.params.id_animacion;

    Animacion.findOne({ '_id': id_animacion},function (err, pro) {
        if (err ){
            return res.status(500).send({"error": err.message})
        }
        if(pro==null){
            return res.status(404).send({"error": "Animacion no encontrada"})
        }
        res.json(pro)
    });

});

router_api.put("/animacion/id/:id_animacion", ((req, res)=>{
    const id_animacion = req.params.id_animacion;
    const filter = { '_id': id_animacion };
    const update = {...req.body}
    const doc =  Animacion.findOneAndUpdate(filter, update, function( error, result){
        if(error)
        {
            res.status(500).send({"error": error.message})
        }else{
            res.send(result)
        }
    })
}));


router_api.put("/proyecto/:id_usuario/:nombre", ((req, res)=>{
    const id_usuario = req.params.id_usuario;
    const nombre = req.params.nombre;
    const filter = { 'nombre': nombre, 'usuario_id':id_usuario };
    const update = {...req.body}
    const doc =  Proyecto.findOneAndUpdate(filter, update, function( error, result){
        if(error)
        {
            res.status(500).send({"error": error.message})
        }else{
            res.send("actualizado con exito.")
        }
    })
}));

module.exports = router_api