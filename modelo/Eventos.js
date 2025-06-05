const mongoose = require("mongoose")
const {grupoFigurasSchema} = require("./Animacion");


const evento_default = {
    nombre: "EventoGeneral",
    nodo_padre: "Nodo_Default",
    visible: true,
    bucle: false,
    tiempo_bucle: 0,
    tiempo_inicio: 0,
    tiempo_final: 100,
    x: 0,
    y: 0,
    reposicionar: true,
    tiempo_relativo: 0,
    objetos: [
        {
            tipo: 1, // Puede representar algún tipo de objeto
            x_inicial: 10,
            y_inicial: 20,
            id_objeto:"cubo",
            movimientos:[
                {
                    tipo: 1,//1: centro figura 2: figuras del grupo
                    id_mov: "mov1"
                }
            ]
        }
    ],
    movimientos: [
        {
            tipo: 1, // Puede representar algún tipo de acción
            //sub_tipo_accion: 2, // Subtipo de acción
            ids_grupos:["cubo"],
            /*x_inicial: 30,
            y_inicial: 40,*/
            tiempo_inicio: 0,
            tiempo_final: 50,
            bucle: false,
            tiempo_bucle: 0,
            activo:true,
            datos:{
                velocidad:120,
            }
        }
    ],
    script:"function script(){console.log('vbbv');}"
};


const evento_default2 = {
    nombre: "Evento_2",
    nodo_padre: "EventoGeneral",
    visible: true,
    bucle: false,
    tiempo_bucle: 0,
    tiempo_inicio: 80,
    tiempo_final: 140,
    x: 40,
    y: 0,
    reposicionar: true,
    tiempo_relativo: 0,
    objetos: [
        {
            tipo: 1, // Puede representar algún tipo de objeto
            x_inicial: 0,
            y_inicial: 0,
            id_objeto:"cubo"
        }
    ],
    movimientos: [
        {
            tipo: 1, // Puede representar algún tipo de acción
            //sub_tipo_accion: 2, // Subtipo de acción
            ids_grupos:["cubo"],
            /*x_inicial: 30,
            y_inicial: 40,*/
            tiempo_inicio: 0,
            tiempo_final: 30,
            bucle: true,
            tiempo_bucle: 5,
            datos:{
                velocidad:290,
            },
            activo:true,
        },
        {
            tipo: 2, // Puede representar algún tipo de acción
            //sub_tipo_accion: 2, // Subtipo de acción
            ids_grupos:["cubo"],
            /*x_inicial: 30,
            y_inicial: 40,*/
            tiempo_inicio: 30,
            tiempo_final: 60,
            bucle: false,
            tiempo_bucle: 0,
            datos:{
                angulo:45,
                velocidad:70,
            },
            activo:false,
        }
    ],
    script:null
};


const evento_default3 = {
    nombre: "Evento_3",
    nodo_padre: "EventoGeneral",
    visible: true,
    bucle: false,
    tiempo_bucle: 0,
    tiempo_inicio: 1000,
    tiempo_final: 1222,
    x: 111,
    y: 222,
    reposicionar: false,
    tiempo_relativo: 1.1,
    objetos: [
    ],
    movimientos: [
    ],
    script:null
};

const eventos_default ={
    nombre: "evento_default",
    eventos:[
        evento_default,
        evento_default2,
        evento_default3
    ],
    grupos_figuras: [
        {
            "nombre": "cubo",
            "nodo_padre": "root",
            "visible": true,
            "color": "#000000",
            "cx": 0,
            "cy": 0,
            "capa": 0,
            "clases": [
                "cubo"
            ],
            "lista_figuras": [
                {
                    "nombre": "frec0",
                    "tipo_figura": "RECTA",
                    "atributos": {
                        "x1": 0,
                        "y1": -43,
                        "x2": 0,
                        "y2": 44,
                        "cx": 213,
                        "cy": 208
                    },
                    "_id": "670dd15cbd2f56f53b076917"
                },
                {
                    "nombre": "frec1",
                    "tipo_figura": "RECTA",
                    "atributos": {
                        "x1": -42,
                        "y1": 0,
                        "x2": 43,
                        "y2": 0,
                        "cx": 255,
                        "cy": 252
                    },
                    "_id": "670dd15cbd2f56f53b076918"
                },
                {
                    "nombre": "frec2",
                    "tipo_figura": "RECTA",
                    "atributos": {
                        "x1": -41,
                        "y1": 0,
                        "x2": 41,
                        "y2": 1,
                        "cx": 254,
                        "cy": 165
                    },
                    "_id": "670dd15cbd2f56f53b076919"
                },
                {
                    "nombre": "frec3",
                    "tipo_figura": "RECTA",
                    "atributos": {
                        "x1": -1,
                        "y1": -43,
                        "x2": 2,
                        "y2": 43,
                        "cx": 296,
                        "cy": 209
                    },
                    "_id": "670dd15cbd2f56f53b07691a"
                }
            ],
            "lista_pintado": [
                {
                    "color": "#000000",
                    "visible": true,
                    "elementos": [
                        []
                    ],
                    "_id": "670dd15cbd2f56f53b07691b"
                }
            ],
            "_id": "670dd15cbd2f56f53b076916",
            "cx_solid": 0,
            "cy_solid": 0
        }
    ], // Puedes agregar aquí datos del grupo de figuras si fuera necesario
    version:1
}

const crear_evento=(id_proyecto)=>{
    return {
        ...eventos_default,
        id_proyecto: id_proyecto,
    }
}


// Define el esquema para los para los eventos
const EventoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    nodo_padre: {
        type: String,
        required: true
    },
    visible: {
        type: Boolean,
        required: true
    },
    bucle: {
        type: Boolean,
        required: true
    },
    tiempo_bucle: {
        type: Number,
        required: true
    },
    tiempo_inicio: {
        type: Number,
        required: true
    },
    tiempo_final: {
        type: Number,
        required: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    reposicionar: {
        type: Boolean,
        required: true
    },
    tiempo_relativo: {
        type: Number,
        required: true
    },
    objetos: [{
        tipo: {
            type: Number,
            required: true
        },
        id_objeto: {
            type: String,
            required: true
        },
        x_inicial: {
            type: Number,
            required: true
        },
        y_inicial: {
            type: Number,
            required: true
        },
        movimientos: [{
            tipo:{
                type: Number,
                required: true
            },
            id_mov:{
                type: String,
                required: true
            }
        }]
    }],
    movimientos: [{
        tipo: {
            type: Number,
            required: true
        },
        /*sub_tipo_accion: {
            type: Number,
            required: true
        },*/
        ids_grupos: {
            type: [String],
        },
        /*x_inicial: {
            type: Number,
            required: true
        },
        y_inicial: {
            type: Number,
            required: true
        },*/
        tiempo_bucle: {
            type: Number,
            required: true
        },
        tiempo_inicio: {
            type: Number,
            required: true
        },
        tiempo_final: {
            type: Number,
            required: true
        },
        bucle: {
            type: Boolean,
            required: true
        },
        activo: {
            type: Boolean,
            required: true
        },
        datos: {
            type: Object,  // Este es el nuevo campo que añadiste
            required: false  // Puedes decidir si es obligatorio o no
        }
    }],
    script: {
        type: String,
    },
    //crear una seccion de solo script y no tenga que ser movimientos
});



const EventosSchema = new mongoose.Schema({
    id_proyecto: {
        type: String,
        required: true,
        immutable: true
    },
    nombre: {
        type: String,
        required: true,
    },
    fecha_actualizacion: {
        type: Date,
        default: Date.now
    },
    fecha_creacion: {
        type: Date,
        default: Date.now
    },
    eventos: {
        type: [EventoSchema],
    },
    grupos_figuras: {
        type: [grupoFigurasSchema],
    },
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

const Eventos = mongoose.model('Evento', EventosSchema)

module.exports={Eventos, crear_evento}