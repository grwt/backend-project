import {asyncHandler} from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";






const generateAccessTokenAndRefreshToken= async(userId)=>{
  try {
    const user=await User.findById(userId)
    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();
    user.refreshToken=refreshToken
    await user.save({validateBeforeSave:false})
    return {refreshToken,accessToken}
    
  } catch (error) {
    throw new ApiError(500,"something went wrong while generating refresh and access token")
  }
}


const registerUser=asyncHandler(async(req,res)=>
{
  
  const {fullname,email,username,password}=req.body
  console.log("email",email);
  
  if(
    //checks if the fields after trimming are empty or not 
    [fullname,email,username,password].some((field)=>
    field?.trim()==="")
  ){
     throw new ApiError(400,"All fields are required")
  }
  
  //validate if userexist or not 
  const existedUser= await User.findOne({
    $or:[{ username },{ email }]
  })
  
  if(existedUser){
    throw new ApiError(409, "User with email or username already check")
  }

  const avatarLocalPath=req.files?.avatar[0]?.path;
   const coverImageLocalPath=req.files?.coverImage?.[0]?.path;
  // let coverImageLocalPath;
  // if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
  //   coverImageLocalPath=req.files.coverImage[0].path;
  // }

  if(!avatarLocalPath) throw new ApiError(400,"Avatar file is required");
  
  const avatar= await uploadOnCloudinary(avatarLocalPath)
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)
  
  if(!avatar) throw new ApiError(400,"Avatar file is required")

  const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url||"",
    email,
    password,
    username:username.toLowerCase()
  })

  const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser) throw new ApiError(500,"Something went wrong while registering the user")

  return res.status(201).json(
    new ApiResponse(200,user,"User registered succesfully")
  )

})

const loginUser= asyncHandler(async(req,res)=>{
  const {email,username,password}=req.body
// if user does not entered either email or password
  if(!(username||email)){
    throw new ApiError(400,"username or email is required")
  }
  const user=await User.findOne({
    $or:[{username},[email]]
  })

  if(!user) throw new ApiError(404,"User does not exist")

  const isPasswordValid=await user.isPasswordCorrect(password)

  if(!isPasswordValid) throw new ApiError(404,"Invalid Password")

  const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

//hamare pass jo user hai usme refershToken field khaali hai kyuki jab humne uska refrence liya tha (user field) tb uske refreshtoken field me token set nahi hua tha jo humne ab set kiya hai. Or jb ab humne updation kr diya hai to hume us user ko fir se find krna pdega thats why we are using  User.findById(user._id) pr kyuki hume client ko sensitive fields nahi bhejni esliye hmne ye use kra hai select("-password -refreshToken");
  const loggedInUser= await User.findById(user._id).select( "-password -refreshToken")
 
  const options={
   httpOnly:true, //only server can modify them
   secure:true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,{
        user:loggedInUser,accessToken,refreshToken
      },
      "User logged in succesfully"
    )
  )

})

const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
      {
        new:true
      }
  )
  const options={
   httpOnly:true, //only server can modify them
   secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{}, "User logged out"))
})

export {registerUser,loginUser,logoutUser} 