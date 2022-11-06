const mongoose = require("mongoose")
//const  = require("./Animacion");
const {Animacion,crear_animacion} = require("./Animacion");

const ProyectoSchema = new mongoose.Schema({
    //id_proyecto: {type: String, required: true, unique: true},
    fecha_actualizacion: {type: Date, default: Date.now},
    fecha_creacion: {type: Date, default: Date.now},
    nombre_proyecto: {type: String, required: true},
    nombre_verificador :{type: String, unique: true},
    usuario_id: {type: String,required: true, immutable: true},
})

ProyectoSchema.pre('save', function (next){
    console.log("tratando de guardar esta basofia: ", this._id.toString())
    if(this.isNew){
        console.log("creando animacion")
        const id_ = this._id.toString()
        this.nombre_verificador = this.usuario_id+"."+this.nombre_proyecto
        const data_animacion = crear_animacion(id_, "animacion-deafult", true)
        const animacion = new Animacion(data_animacion)
        animacion.save(error => {
            if(error){
                console.log("error al crear la animacion: ", error.message)
                //res.status(500).send({"error": error.message})
                next(error)
            }else{
                next();
            }
        })
    }
    next();
})


ProyectoSchema.pre('findOne', function (next){
    console.log("recuperando la cordura")
    const document = this;
    next();
})

ProyectoSchema.pre('findOneAndUpdate', async function ( next){
    console.log("fecha de acualizacion ahora 1");
    console.log(this._update);
    console.log(this.get("nombre_proyecto"))
    console.log(this.get("usuario_id"))
    console.log(this.usuario_id)

    if("nombre_proyecto" in this._update){
        const id_ =this._conditions._id;
        const doc_act =  await proyecto_modelo.findOne({ '_id': id_ }).exec()

        const verf =doc_act.usuario_id+"."+this._update.nombre_proyecto;
        this.set({ nombre_verificador:  verf});
        this.set({ fecha_actualizacion: Date.now() });
        /*doc.save(error => {
            if(error){
                console.log("error actualizar el nombre de verificacion ", error.message)
                //res.status(500).send({"error": error.message})
                next(error)
            }else{
                next();
            }
        })*/
    }

    //this.set({ fecha_actualizacion: Date.now() });
    next();
})

/*ProyectoSchema.post('update', function (document, next){
    console.log("post actualizacion _____________________")
    //console.log(document)
    //const verf = document.usuario_id+"."+document.nombre_proyecto;
    //document.set({ nombre_verificador:  verf});
    next();
})*/

/*ProyectoSchema.post('findOneAndUpdate',  function(doc, next) {
    console.log("act gfghffghhfgfgh")
    console.log(this._update)

    if("nombre_proyecto" in this._update.$set){
        const verf = doc.usuario_id+"."+this._update.$set.nombre_proyecto;
        doc.set({ nombre_verificador:  verf});
        doc.save(error => {
            if(error){
                console.log("error actualizar el nombre de verificacion ", error.message)
                //res.status(500).send({"error": error.message})
                next(error)
            }else{
                next();
            }
        })
    }
    //next();
});*/

const proyecto_modelo = mongoose.model('Proyecto', ProyectoSchema)
proyecto_modelo.createIndexes()

module.exports =proyecto_modelo
