const mongoose = require("mongoose")
//const  = require("./Animacion");
const {Animacion,crear_animacion} = require("./Animacion");

const ProyectoSchema = new mongoose.Schema({
    //id_proyecto: {type: String, required: true, unique: true},
    fecha_actualizacion: {type: Date, default: Date.now},
    fecha_creacion: {type: Date, default: Date.now},
    nombre: {type: String, required: true},
    descripcion: {type: String, required: false},
    nombre_verificador :{type: String, unique: true},
    usuario_id: {type: String,required: true, immutable: true},
})

ProyectoSchema.pre('save', async function (next){
    console.log("tratando de guardar esta basofia: ", this._id.toString())
    if(this.isNew){
        console.log("creando animacion")
        const id_ = this._id.toString()
        this.nombre_verificador = this.usuario_id+"."+this.nombre

        try{
            const data_animacion = crear_animacion(id_, "animacion-deafult", true)
            console.log(data_animacion)
            const animacion = new Animacion(data_animacion)
            await animacion.save()
            next()
        }catch (error){
            console.log("error al crear la animacion: ", error.message)
            next(error)
        }

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
    console.log(this.get("nombre"))
    console.log(this.get("usuario_id"))
    console.log(this.usuario_id)
    this.set({ fecha_actualizacion: Date.now() });
    if("nombre" in this._update){
        const id_ =this._conditions._id;
        const doc_act =  await proyecto_modelo.findOne({ '_id': id_ }).exec()

        const verf =doc_act.usuario_id+"."+this._update.nombre;
        this.set({ nombre_verificador:  verf});

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

ProyectoSchema.pre('deleteOne', async function ( next){
    console.log("borrando Animaciones")
    const id_proyecto = this._conditions._id;
    console.log(id_proyecto)
    const doc_act =  await Animacion.deleteMany({ 'id_proyecto': id_proyecto }).exec()
    next();
})

/*ProyectoSchema.post('update', function (document, next){
    console.log("post actualizacion _____________________")
    //console.log(document)
    //const verf = document.usuario_id+"."+document.nombre;
    //document.set({ nombre_verificador:  verf});
    next();
})*/

/*ProyectoSchema.post('findOneAndUpdate',  function(doc, next) {
    console.log("act gfghffghhfgfgh")
    console.log(this._update)

    if("nombre" in this._update.$set){
        const verf = doc.usuario_id+"."+this._update.$set.nombre;
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
