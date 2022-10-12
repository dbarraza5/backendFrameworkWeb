const mongoose = require("mongoose")
const animacion_default = {
    "meta_figuras": [
        {
            "nombre": "PUNTO",
            "atributos": [
                {
                    "nombre": "cx",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                },
                {
                    "nombre": "cy",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                }
            ]
        },
        {
            "nombre": "RECTA",
            "atributos": [
                {
                    "nombre": "x1",
                    "tipo": "TIPO_INT",
                    "valor_defecto": -20
                },
                {
                    "nombre": "y1",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                },
                {
                    "nombre": "x2",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 20
                },
                {
                    "nombre": "y2",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                },
                {
                    "nombre": "cx",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 200
                },
                {
                    "nombre": "cy",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 200
                }
            ]
        },
        {
            "nombre": "CIRCULO",
            "atributos": [
                {
                    "nombre": "radiox",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 10
                },
                {
                    "nombre": "radioy",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 10
                },
                {
                    "nombre": "cx",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                },
                {
                    "nombre": "cy",
                    "tipo": "TIPO_INT",
                    "valor_defecto": 0
                }
            ]
        }
    ],
    "meta_movimientos": [
        {
            "nombre": "MRU",
            "atributos":[
                {"nombre":"velocidad","tipo": "TIPO_FLOAT", "valor_defecto": 20},
                {"nombre":"sentido","tipo": "TIPO_BOOL", "valor_defecto": 1},
                {"nombre":"direccion","tipo": "TIPO_BOOL", "valor_defecto": 1}
            ]
        }
    ],
    "grupos_figuras": [],
    "grupo_movimientos": []
}

const crear_animacion=(id_proyecto, nombre_animacion, raiz)=>{
    return {
        ...animacion_default,
        id_proyecto: id_proyecto,
        nombre_animacion: nombre_animacion,
        nombre_verificacion: id_proyecto+"."+nombre_animacion,
        raiz: raiz
    }
}

const AnimacionSchema = new mongoose.Schema({
    id_proyecto: {type: String, required: true},
    nombre_animacion: {type: String, required: true},
    nombre_verificacion: {type: String, unique: true},
    raiz: {type: Boolean, required:true},
    id_copia_consolidado: {type: String, default: null},
    consolidado: {type: Boolean, default:false},
    fecha_actualizacion: {type: Date, default: Date.now},
    fecha_creacion: {type: Date, default: Date.now},
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

AnimacionSchema.pre('findOneAndUpdate', function (next){
    this.set({ fecha_actualizacion: Date.now() });
    next();
})

const Animacion = mongoose.model('Animacion', AnimacionSchema)

const ProyectoSchema = new mongoose.Schema({
    //id_proyecto: {type: String, required: true, unique: true},
    fecha_actualizacion: {type: Date, default: Date.now},
    fecha_creacion: {type: Date, default: Date.now},
    nombre_proyecto: {type: String, required: true},
    nombre_verificador :{type: String, unique: true},
    usuario_id: {type: String,required: true},
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
    //next();
})


ProyectoSchema.pre('findOne', function (next){
    console.log("recuperando la cordura")
    const document = this;
    next();
})

ProyectoSchema.pre('findOneAndUpdate', function (next){
    console.log("fecha de acualizacion ahora 1")
    const document = this;
    this.set({ fecha_actualizacion: Date.now() });
    next();
})

const proyecto_modelo = mongoose.model('Proyecto', ProyectoSchema)
proyecto_modelo.createIndexes()

module.exports =proyecto_modelo
