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
            "visible": true,
            "color": "#000000",
            "cx": 0,
            "cy": 0,
            "capa": 0,
            //"grupo_movimientos": [
            //    "default"
            //],
            "clases":["root"],
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

const crear_animacion=(id_proyecto, id_usuario, nombre_animacion, raiz, descripcion='')=>{
    return {
        ...animacion_default,
        id_proyecto: id_proyecto,
        nombre_animacion: nombre_animacion,
        descripcion: descripcion,
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
    },*/
    visible: {
        type: Boolean,
        required: true
    },
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
    clases:{
        type:[String]
    },
    // Transformacion de instancia (frontend: Clases/EditorAnimacion/TransformacionInstancia.js):
    // { rotacion, escala_x, escala_y, ancla_x, ancla_y }. Opcional; se aplica al
    // dibujar, sin modificar las figuras. Sin declararlo aca Mongoose lo descartaba
    // al guardar (schema estricto).
    transformacion: {
        rotacion: {type: Number},
        escala_x: {type: Number},
        escala_y: {type: Number},
        ancla_x: {type: Number},
        ancla_y: {type: Number},
    },
    // Instancia por referencia (Fase 6): el grupo es el contenedor de un asset (el
    // documento de eventos de otro proyecto, con su dibujo y sus eventos). Sus partes
    // NO se guardan: el editor las carga del asset y las anima con `evento`
    // (desplazado `desfase` ms, repitiendose si `bucle`).
    // Fase 7: fotogramas clave por propiedad {x:[{t,v,interp}], y, rotacion, escala_x,
    // escala_y, opacidad} y opacidad base (0..1). Ver frontend Clases/EditorEvento/Claves.js
    claves: {type: mongoose.Schema.Types.Mixed},
    // Fase 7B: que hace el objeto despues de su ultima clave: repetir, ida_vuelta,
    // continuar (vacio = quedarse en la ultima)
    claves_bucle: {type: String},
    // Fase 8: camara (solo el grupo camara), orden por profundidad de sus hijos y plano
    camara: {ancho: {type: Number}, alto: {type: Number}, zoom: {type: Number}},
    orden_profundidad: {type: Boolean},
    plano: {type: Number},
    // Fase 9: efecto (grupo con clase "efecto": {tipo, ...parametros}) y reaccion
    // fisica del objeto ({modo: fijo|rigido|desarmar, nivel, masa, rebote, friccion})
    efecto: {type: mongoose.Schema.Types.Mixed},
    fisica: {type: mongoose.Schema.Types.Mixed},
    opacidad: {type: Number},
    instancia: {
        id_eventos: {type: String},
        nombre: {type: String},     // nombre del asset en la Biblioteca
        version: {type: String},    // Fase 6C: _id de la version congelada; vacio = la ultima
        evento: {type: String},
        bucle: {type: Boolean},
        desfase: {type: Number},
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

const metaFiguraSchema = new mongoose.Schema({
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
    descripcion: {
        type: String,
        //required: false
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
    meta_figuras: {
        type:[metaFiguraSchema]
    },
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

module.exports = {Animacion, crear_animacion,grupoFigurasSchema,  metaFiguraSchema}