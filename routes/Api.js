const express = require("express");
const Proyecto = require("../modelo/proyecto")
const {Animacion} = require("../modelo/Animacion");

const router_api = express.Router();

router_api.post("/proyecto", ((req, res)=>{
    const proyecto = new Proyecto(req.body)
    proyecto.save((error, resultado) => {
        if(error){
            res.status(500).send({"error": error.message})
        }else{
            res.send(resultado)
        }
    })
}));

router_api.get("/proyecto/id/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Proyecto.findOne({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    });
});

router_api.put("/proyecto/id/:id_proyecto", ((req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    const filter = { '_id': id_proyecto };
    const update = {...req.body}
    const doc =  Proyecto.findOneAndUpdate(filter, update, function( error, result){
        if(error)
        {
            res.status(500).send({"error": error.message})
        }else{
            res.send(result)
        }
    })
}));


router_api.get("/proyecto/user/:id_usuario", (req, res)=>{
    const id_usuario = req.params.id_usuario;

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
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    });

});

router_api.put("/animacion/id/:id_animacion", ((req, res)=>{
    const id_animacion = req.params.id_animacion;
    const filter = { 'id_proyecto': id_proyecto };
    const update = {...req.body}
    const doc =  Proyecto.findOneAndUpdate(filter, update, function( error, result){
        if(error)
        {
            res.status(500).send({"error": error.message})
        }else{
            res.send(result)
        }
    })
}));


router_api.put("/proyecto/:id_usuario/:nombre_proyecto", ((req, res)=>{
    const id_usuario = req.params.id_usuario;
    const nombre_proyecto = req.params.nombre_proyecto;
    const filter = { 'nombre_proyecto': nombre_proyecto, 'usuario_id':id_usuario };
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