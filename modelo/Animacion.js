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
    "grupos_figuras": [
        {
            "nombre": "default",
            "nodo_padre": "root",
            //"tiempo_inicial": 500,
            //"tiempo_final": 2000,
            //"ciclo": 1,
            "color": "#000000",
            "cx": 0,
            "cy": 0,
            "capa": 0,
            //"grupo_movimientos": [
            //    "default"
            //],
            "lista_figuras": [],
            "lista_pintado":[
                {
                    color: "#0d67c8",
                    visible: true,
                    elementos: [
                        []//al menos un grupo
                    ]

                }
            ]

        }
    ],
    lista_imagenes:[]
    //"grupo_movimientos": []
}

const crear_animacion=(id_proyecto, id_usuario, nombre_animacion, raiz)=>{
    return {
        ...animacion_default,
        id_proyecto: id_proyecto,
        nombre_animacion: nombre_animacion,
        nombre_verificacion: id_proyecto+"."+nombre_animacion,
        raiz: raiz
    }
}

const imageneSchema = new mongoose.Schema({
    path: {
        type: String,
        required: true,
    },

    url: {
        type: String,
        required: true,
    },
    nombre: {
        type: String,
        required: true,
    },
    x: {
        type: Number,
        required: true,
    },
    y: {
        type: Number,
        required: true,
    },
    ancho: {
        type: Number,
        required: true,
    },
    alto: {
        type: Number,
        required: true,
    },

    ancho_original: {
        type: Number,
        required: true,
    },
    alto_original: {
        type: Number,
        required: true,
    },

    visible: {
        type: Boolean,
        default: true
    },
    opacidad: {
        type: Number,
        default: 1,
    }
});

// Define el esquema para los grupos de figuras
const grupoFigurasSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    nodo_padre: {
        type: String,
        required: true
    },
    /*tiempo_inicial: {
        type: Number,
        required: true
    },
    tiempo_final: {
        type: Number,
        required: true
    },
    ciclo: {
        type: Boolean,
        required: true
    },*/
    color: {
        type: String,
        required: true
    },
    cx: {
        type: Number,
        required: true
    },
    cy: {
        type: Number,
        required: true
    },
    capa: {
        type: Number,
        required: true
    },
    //grupo_movimientos: [{
    //    type: mongoose.Schema.Types.ObjectId,
    //    ref: 'GrupoMovimientos'
    //}],
    lista_figuras: [{
        nombre: {
            type: String,
            required: true
        },
        tipo_figura: {
            type: String,
            required: true
        },
        atributos: Object
    }],

    lista_pintado:[
        {
            color: {
                type: String,
                required: true
            },
            visible: {
                type: Boolean,
                required: true
            },
            elementos: []
        }
    ]
});

// Define el esquema para los grupos de movimientos
const grupoMovimientosSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    lista_movimientos: [{
        nombre: {
            type: String,
            required: true
        },
        tipo: {
            type: String,
            required: true
        },
        atributos: Object
    }]
});

// Crea el modelo para los grupos de figuras utilizando el esquema definido
const GrupoFiguras = mongoose.model('GrupoFiguras', grupoFigurasSchema);

// Crea el modelo para los grupos de movimientos utilizando el esquema definido
const GrupoMovimientos = mongoose.model('GrupoMovimientos', grupoMovimientosSchema);

// Define el esquema para la animación
const AnimacionSchema = new mongoose.Schema({
    id_proyecto: {
        type: String,
        required: true,
        immutable: true
    },
    nombre_animacion: {
        type: String,
        required: true
    },
    nombre_verificacion: {
        type: String,
        unique: true
    },
    raiz: {
        type: Boolean,
        required: true
    },
    id_copia_consolidado: {
        type: String,
        default: null
    },
    consolidado: {
        type: Boolean,
        default: false
    },
    fecha_actualizacion: {
        type: Date,
        default: Date.now
    },
    fecha_creacion: {
        type: Date,
        default: Date.now
    },
    meta_figuras: [{
        nombre: {
            type: String,
            required: true
        },
        atributos: [{
            nombre: {
                type: String,
                required: true
            },
            tipo: {
                type: String,
                required: true
            },
            valor_defecto: Number
        }]
    }],
    meta_movimientos: [{
        nombre: {
            type: String,
            required: true
        },
        atributos: [{
            nombre: {
                type: String,
                required: true
            },
            tipo: {
                type: String,
                required: true
            },
            valor_defecto: Number
        }]
    }],
    grupos_figuras: {
        type: [grupoFigurasSchema],
    },

    lista_imagenes:{
        type: [imageneSchema],
    },
    /*grupo_movimientos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GrupoMovimientos'
    }]*/

    /*
    Estos atributos son un respaldo del trabajo de una animacion 
    * */
    version: {
        type: String,
    },
    id_backup: {
        type: String,
        immutable: true
    },
    is_buckup: {
        type: String,
    },
});


AnimacionSchema.pre('findOneAndUpdate', async function (next){
    this.set({ fecha_actualizacion: Date.now() });

    if("nombre_animacion" in this._update){
        const id_ =this._conditions._id;
        const doc_act =  await Animacion.findOne({ '_id': id_ }).exec()

        const verf =doc_act.id_proyecto+"."+this._update.nombre_animacion;
        this.set({ nombre_verificacion:  verf});
    }

    next();
})


AnimacionSchema.pre('save', async function (next) {
    const animacion = this;

    // Obtener los nombres de los grupos_figuras asociados a la animación
    const nombres = animacion.grupos_figuras.map((grupo) => grupo.nombre);
    const g_ = animacion.grupos_figuras

    // Validar que no haya nombres duplicados
    if (new Set(nombres).size !== nombres.length) {
        const err = new Error('No se permiten objetos con el mismo valor en el atributo nombre');
        return next(err);
    }

    next();
});


/*AnimacionSchema.pre('findOneAndUpdate', async function (next) {
    const animacion = this;

    // Obtener los nombres de los grupos_figuras asociados a la animación
    const nombres = animacion.grupos_figuras.map((grupo) => grupo.nombre);
    const g_ = animacion.grupos_figuras

    // Validar que no haya nombres duplicados
    if (new Set(nombres).size !== nombres.length) {
        const err = new Error('No se permiten objetos con el mismo valor en el atributo nombre');
        return next(err);
    }

    next();
});*/

const Animacion = mongoose.model('Animacion', AnimacionSchema)

module.exports = {Animacion, crear_animacion}