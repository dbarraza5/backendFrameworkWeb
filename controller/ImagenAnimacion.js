const multer = require("multer");

const upload = multer({ storage: storage });


const fs = require('node:fs');
const sizeOf = require('image-size');

function crearCarpetas(folderName){
    //const folderName = 'storage/uploads';
    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
        }
    } catch (err) {
        console.error(err);
    }
}

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const id_animacion = req.params.id_animacion;
        const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();
        if (animacion_){
            const proyecto_ = await Proyecto.findOne({ '_id': animacion_.id_proyecto }).exec();
            const path_ = '/home/app/storage/usuarios/'+proyecto_.usuario_id
                +'/proyectos/'+animacion_.id_proyecto+'/animaciones/'+animacion_._id;
            crearCarpetas(path_);
            // Generar manualmente el _id
            const nuevoIdImagen = mongoose.Types.ObjectId();
            const nuevaImagen = {
                _id: nuevoIdImagen,
                path: path_,
                nombre: file.originalname,
                x: 0,
                y: 0,
                ancho: 243,
                alto: 324,
                ancho_original: 122,//dimensions.width,
                alto_original: 123,//dimensions.height,
                visible: true
            };
            animacion_.lista_imagenes.push(nuevaImagen);
            await animacion_.save();
            console.log("id imagen: "+nuevoIdImagen);
            req.params.id_imagen = nuevoIdImagen;
            req.params.path_imagen = path_;
            cb(null, path_);
        }
        //cb(null, '/home/app/storage/uploads/'); // Ruta donde se guardarán los archivostyr
    },
    filename: function (req, file, cb) {
        if(req.params.id_imagen){
            const ext_ = obtenerExtension(file.originalname);
            cb(null, req.params.id_imagen.toString()+"."+ext_); // Nombre del archivo original
        }

    }
});

const subirImagen = upload.single;

export default subirImagen;