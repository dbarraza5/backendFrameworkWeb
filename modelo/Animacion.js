const mongoose = require("mongoose")


const AnimacionSchema = new mongoose.Schema({
    id_proyecto: {type: String, required: true},
    nombre_animacion: {type: String, required: true, unique: true},
    raiz: {type: Boolean, required:true},
    consolidado: {type: Boolean, default:false},
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



const animacion_default = {
    "nombre_proyecto": "proyecto-aux",
    "usuario_id": "danielx25",
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