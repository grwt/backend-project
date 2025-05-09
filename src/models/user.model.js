import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema= new Schema(
  {
    username:{
      type:String,
      required:true,
      unique:true,
      lowercase:true,
      trim:true, //clean whitespaces
      index:true //speed up queries on username
    },
    fullname:{
      type:String,
      required:true,
      trim:true,
      index:true
    },
    avatar:{
      type:String,
      required:true,
    },
    coverImage:{
      type:String,
    },
    watchHistory:[
      {
        type:Schema.Types.ObjectId,
        ref:"Video"
      }
    ],
    password:{
      type:String,
      required:[true,'Password is required']
    },
    refreshToken:{
      type:String
    }

  },
  {
    timestamps:true
  }
)


userSchema.pre("save", function(next)
{ //if there is no changes in the password enterd by the user than simply return next(), or proceed ahed.
  if(!this.isModified("password")) return next();

  this.password=bcrypt.hash(this.password,10)
  next()

})

userSchema.methods.isPasswordCorrect=async function(password){
  return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken=function(){
  return jwt.sign(
    {
      _id:this._id,
      email:this.email,
      username:this.username,
      fullname:this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken=function(){
  return jwt.sign(
    {
      _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}



export const User=mongoose.model("User",userSchema)