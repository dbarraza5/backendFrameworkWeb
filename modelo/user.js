const bcrypt = require("bcrypt")
const mongoose = require("mongoose")

const saltRounds = 10;
//https://mongoosejs.com/docs/api/schema.html#schema_Schema-pre
//https://ull-esit-pl-1617.github.io/estudiar-cookies-y-sessions-en-expressjs-victor-pamela-jesus/cookies/chapter6.html
const UserSchema = new mongoose.Schema({
    email: {type: String, require: true, unique: true},
    password: {type: String, require: true}
})


UserSchema.pre('save', function (next){
    if(this.isNew || this.isModifie("password")){
        const document = this;
        bcrypt.hash(document.password, saltRounds, (err, hashedpassowrd)=>{
            if(err){
                next(err);
            }else{
                document.password = hashedpassowrd;
                next();
            }
        })
    }else{
        next();
    }
})

UserSchema.methods.isCorrectPassword = function (check_password, callback){
    console.log(check_password)
    bcrypt.compare(check_password, this.password, function (err, same){
        if(err){
            callback(err)
        }else{
            callback(err, same)
        }
    })
}


module.exports = mongoose.model('usuario', UserSchema)