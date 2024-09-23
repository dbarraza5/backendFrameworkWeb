const mongoose = require("mongoose")
const {grupoFigurasSchema} = require("./Animacion");


const evento_default = {
    nombre: "Evento de ejemplo",
    nodo_padre: "NodoPadreID",
    visible: true,
    bucle: false,
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
            grupos_figuras: [], // Puedes agregar aquí datos del grupo de figuras si fuera necesario
            clases: ["clase1", "clase2"]
        }
    ],
    movimientos: [
        {
            tipo_accion: 1, // Puede representar algún tipo de acción
            sub_tipo_accion: 2, // Subtipo de acción
            x_inicial: 30,
            y_inicial: 40,
            tiempo_inicio: 0,
            tiempo_final: 50,
            bucle: false,
            datos:{

            }
        }
    ]
};

const eventos_default ={
    eventos:[
        evento_default
    ],
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
        x_inicial: {
            type: Number,
            required: true
        },
        y_inicial: {
            type: Number,
            required: true
        },
        grupos_figuras: {
            type: [grupoFigurasSchema],
        },
        clases: {
            type: [String],
        },
    }],
    movimientos: [{
        tipo_accion: {
            type: Number,
            required: true
        },
        sub_tipo_accion: {
            type: Number,
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
        dato: {
            type: Object,  // Este es el nuevo campo que añadiste
            required: false  // Puedes decidir si es obligatorio o no
        }
    }],
});



const EventosSchema = new mongoose.Schema({
    id_proyecto: {
        type: String,
        required: true,
        immutable: true
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