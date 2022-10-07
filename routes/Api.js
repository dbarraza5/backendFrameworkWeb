const express = require("express");
const Proyecto = require("../modelo/proyecto")

const router_api = express.Router();

router_api.post("/proyecto", ((req, res)=>{
    const proyecto = new Proyecto(req.body)
    proyecto.save(error => {
        if(error){
            const resultado = error.message
            res.json({resultado})
        }else{
            res.send("Usuario registrado exitosamente.")
        }
    })
}));

router_api.get("/proyecto/:id_usuario/:nombre_proyecto", (req, res)=>{
    const id_usuario = req.params.id_usuario;
    const nombre_proyecto = req.params.nombre_proyecto;


    Proyecto.findOne({ 'nombre_proyecto': nombre_proyecto, 'usuario_id':id_usuario },function (err, pro) {
        if (err) return handleError(err);
        res.json(pro)
    });

});


router_api.put("/proyecto/:id_usuario/:nombre_proyecto", ((req, res)=>{
    const id_usuario = req.params.id_usuario;
    const nombre_proyecto = req.params.nombre_proyecto;
    const filter = { 'nombre_proyecto': nombre_proyecto, 'usuario_id':id_usuario };
    const update = {...req.body}
    let resultado = null;
    const doc =  Proyecto.findOneAndUpdate(filter, update, function( error, result){
        if(error)
        {
            console.log("error "+ error)
            console.log(result)
            resultado = error.message
            res.json({resultado})
        }else{
            res.send("actualizado con exito.")
        }
    })
}));

module.exports = router_api