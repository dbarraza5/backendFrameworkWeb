const mongoose = require("mongoose")


const ProyectoSchema = new mongoose.Schema({
    //id_proyecto: {type: String, required: true, unique: true},
    fecha_actualizacion: {type: Date, default: Date.now},
    fecha_creacion: {type: Date, default: Date.now},
    nombre_proyecto: {type: String, required: true, unique: true},
    usuario_id: {type: String,required: true},
    meta_figuras: [{
        nombre: {type: String, required: true},
        atributos: [{
            nombre: {type: String, required: true},
            tipo: {type: String, required: true},
            valor_defecto: {type: Number}
        }]
    }],

    meta_movimientos: [{
        nombre: {type: String, required: true},
        atributos: [{
            nombre: {type: String, required: true},
            tipo: {type: String, required: true},
            valor_defecto: {type: Number}
        }]
    }],

    grupos_figuras: [{
        nombre: {type: String, required: true},
        nodo_padre: {type: String, required: true},
        tiempo_inicial: {type: Number, required: true},
        tiempo_final: {type: Number, required: true},
        ciclo: {type: Boolean, required: true},
        color: {type: String, required: true},
        cx: {type: Number, required: true},
        cy: {type: Number, required: true},
        capa: {type: Number, required: true},
        grupo_movimientos: [String],

        lista_figuras:[{
            nombre: {type: String, required: true},
            tipo_figura: {type: String, required: true},
            atributos: Object
        }]
    }],

    grupo_movimientos: [{
        nombre: {type: String, required: true},
        lista_movimientos:[{
            nombre: {type: String, required: true},
            tipo: {type: String, required: true},
            atributos: Object
        }]
    }]

})

ProyectoSchema.pre('findOne', function (next){
    console.log("recuperando la cordura")
    const document = this;
    //document['info'] = 123;
    next();
})

ProyectoSchema.pre('findOneAndUpdate', function (next){
    console.log("fecha de acualizacion ahora 1")
    const document = this;
    //document.fecha_actualizacion = new Date();
    document.context= "sdffsdfsd";
    this.set({ fecha_actualizacion: Date.now() });
    //this.set({ fecha_actualizacion: 234342 });
    next();
})

const proyecto_modelo = mongoose.model('Proyecto', ProyectoSchema)
proyecto_modelo.createIndexes()

module.exports =proyecto_modelo
