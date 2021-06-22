const commonFunction = require("../../functions/commonFunctions"),
  bcrypt = require('bcryptjs'),
levelModel = require("../../models/levels"),
  packagesModel = require("../../models/packages")
const { validationResult } = require('express-validator'),
  fieldErrors = require('../../functions/error'),
  userModel = require("../../models/users"),
  errorCodes = require("../../functions/statusCodes"),
  constant = require("../../functions/constant"),
  globalModel = require("../../models/globalModel"),
  emailFunction = require("../../functions/emails"),
  md5 = require("md5"),
  languageModel = require("../../models/languages")
  dateTime = require('node-datetime')

exports.forgotPassword = async (req, res) => {
  const email = req.body.email;
  const phone = req.body.phone;
  if(!email && !phone){
    return res.send({ error: fieldErrors.errors([{ msg: constant.general.INVALIDREQUEST }], true), status: errorCodes.invalid }).end();
  }
  const errors = validationResult(req);
  console.log(errors)
  if (!errors.isEmpty()) {
    if(!phone)
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.VALID_EMAIL }], true), status: errorCodes.invalid }).end();
    else
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_PHONECREDENTIALS }], true), status: errorCodes.invalid }).end();
  }

  let captchaToken = req.body.captchaToken
  if(req.appSettings['recaptcha_enable'] == 1  && !req.fromAPP){
    let isValidCaptcha = true;
    await commonFunction.checkCaptcha(req,captchaToken).then(result => {
      if(!result){
        isValidCaptcha = false;
      }
    }).catch(err => {
      isValidCaptcha = false;
      console.log(err,'error')
    })

    if(!isValidCaptcha){
      return res.send({ error: fieldErrors.errors([{ msg: constant.general.CAPTCHAVALIDATION }], true), status: errorCodes.invalid }).end();
    }
  }

  let getModel = null
  if(phone){
    getModel = userModel.findByPhoneNumber(phone, req)
  }else{
    getModel = userModel.findByEmail(email, req, res)
  }

  return getModel.then(async user => {
    if (!user) {
      if(!phone)
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.NO_EMAIL_FOUND }], true), status: errorCodes.invalid }).end();
      else
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.NO_PHONE_FOUND }], true), status: errorCodes.invalid }).end();
    }
    await globalModel.custom(req, "DELETE FROM user_forgot WHERE user_id =?", [user.user_id]).then(result => {

    }).catch(err => {

    })
    //send email to user
    globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", ["lost_password"]).then(async resultsType => {
      if (resultsType) {
        const typeData = JSON.parse(JSON.stringify(resultsType))[0];
        let resultEmail = {}
        resultEmail.vars = typeData.vars
        resultEmail.type = typeData.type
        resultEmail.ownerEmail = user
        resultEmail.toName = user.displayname
        resultEmail.toEmail = user.email
        const code = md5(user.email + "userid" + user.user_id)
        resultEmail['resetpasswordlink'] = {}
        resultEmail['resetpasswordlink']["title"] = process.env.PUBLIC_URL + "/reset/" + code
        await globalModel.create(req, { user_id: user.user_id, code: code, creation_date: dateTime.create().format("Y-m-d H:M:S") }, "user_forgot").then(result => {
        }).catch(err => {

        })
        emailFunction.sendMessage(req, resultEmail).then(result => {

        }).catch(err => {

        })
        return res.json({ status: true,code:code });
      }else{
        return res.json({ status: true,code:"" });
      }
    });
  }).catch(error => {
    return res.send({ error: fieldErrors.errors([{ msg: constant.auth.VALID_EMAIL }], true), status: errorCodes.invalid }).end();
  });
}
exports.reset = async (req, res) => {
  const code = req.body.code
  if (!code) {
    res.send({ error: "Token expired." })
  }
  let valid = false
  let user_id = null
  await globalModel.custom(req, "SELECT * FROM user_forgot WHERE code = ?", [code]).then(result => {
      if (result && result.length) {
          const data = result[0];
          user_id = data.user_id
          let creationDate = data.creation_date
          var ONE_HOUR = 60 * 60 * 1000;
          const anHourAgo = Date.now() - ONE_HOUR;
          if (new Date(creationDate).getTime() > anHourAgo) {
              valid = true
          } else {
              valid = false
          }
      }
  }).catch(err => {

  })
  if (!valid) {
    res.send({ error: "Token expired." })
  }
  const password = req.body.password

  bcrypt
    .hash(password, 12)
    .then(async hashedPassword => {
      await globalModel.update(req, { password: hashedPassword }, "users", 'user_id', user_id).then(result => {
         globalModel.custom(req, "DELETE FROM user_forgot WHERE code =?", [code]).then(result => {

        }).catch(err => {
    
        })
        if (result) {
          return res.send({ status:true }).end();
        } else {
          return res.send({ error: "Token expired." }).end();
        }
      });
    })

}

exports.login = async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  const phone_number = req.body.phone_number;
  const code = req.body.code;
  const errors = validationResult(req);
  let isValidCode = false;
  if(phone_number){
    await globalModel.custom(req,"SELECT * FROM otp_code WHERE phone_number = ? AND type = 'login' AND code = ?",[phone_number,code]).then(result => {
      if(result && result.length){
        isValidCode = true
      }
    })
  }

  if (!errors.isEmpty() || (!isValidCode && phone_number)) {
    if(!phone_number)
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_CREDENTIALS }], true), status: errorCodes.invalid }).end();
    else
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_PHONECREDENTIALS }], true), status: errorCodes.invalid }).end();
  }

  let captchaToken = req.body.captchaToken
  if(req.appSettings['recaptcha_enable'] == 1  && !req.fromAPP){
    let isValidCaptcha = true;
    await commonFunction.checkCaptcha(req,captchaToken).then(result => {
      if(!result){
        isValidCaptcha = false;
      }
    }).catch(err => {
      isValidCaptcha = false;
      console.log(err,'error')
    })

    if(!isValidCaptcha){
      return res.send({ error: fieldErrors.errors([{ msg: constant.general.CAPTCHAVALIDATION }], true), status: errorCodes.invalid }).end();
    }
  }

  
  if(phone_number){
  //  email = req.email
    password = "otp"
  }
  req.passwordGet = true
  req.userFields = true


  let checkUser = null

  if(!email){
    checkUser = userModel.findByPhoneNumber(phone_number, req)
  }else{
    checkUser = userModel.findByEmail(email, req, res)
  }
  
  return checkUser.then(user => {
    
    req.passwordGet = false
    req.userFields = false
    if (!user) {
      return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_CREDENTIALS }], true), status: errorCodes.invalid }).end();
    }
    bcrypt
      .compare(password, user.password)
      .then(doMatch => {
        if (doMatch || phone_number) {
          if(user.active == 0){
            let verifyAgain = false
            if(req.appSettings["member_email_verification"] == 1 ){
              verifyAgain = true;
            }
            return res.send({ error: fieldErrors.errors([{ msg: constant.auth.EMAILVERIFY }], true),verifyAgain:verifyAgain, status: errorCodes.invalid }).end();
          }else if(user.approve == 0){
            return res.send({ error: fieldErrors.errors([{ msg: constant.auth.ADMINAPPROVAL }], true), status: errorCodes.invalid }).end();
          }
          req.session.user = user.user_id
          return res.json({ status: true,user_id:user.user_id });
        }
        return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_CREDENTIALS }], true), status: errorCodes.invalid }).end();
      }).catch(error => {
        return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_CREDENTIALS }], true), status: errorCodes.invalid }).end();
      });
  }).catch(error => {
    return res.send({ error: fieldErrors.errors([{ msg: constant.auth.INVALID_CREDENTIALS }], true), status: errorCodes.invalid }).end();
  });

}

exports.signup = async (req, res) => {
  if (req.imageError) {
    return res.send({ error: fieldErrors.errors([{ msg: req.imageError }], true), status: errorCodes.invalid }).end();
  }
  const fieldValues = {}
  const fieldUserDetails = {}
  fieldValues["email"] = req.body.email;
  const password = req.body.password;
  const first_name = fieldUserDetails["first_name"] = req.body.first_name;
  const last_name = fieldUserDetails["last_name"] = req.body.last_name ? req.body.last_name : "";
  fieldUserDetails["username"] = req.body.username ? req.body.username : "";
  let level_id;
  if (req.fileName) {
    fieldUserDetails["avtar"] = "/upload/images/users/" + req.fileName
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.send({ error: fieldErrors.errors(errors), status: errorCodes.invalid }).end();
  }

  let captchaToken = req.body.captchaToken
  if(req.appSettings['recaptcha_enable'] == 1 && !req.fromAPP){
    let isValidCaptcha = true;
    await commonFunction.checkCaptcha(req,captchaToken).then(result => {
      if(!result){
        isValidCaptcha = false;
      }
    }).catch(err => {
      isValidCaptcha = false;
      console.log(err,'error')
    })

    if(!isValidCaptcha){
      return res.send({ error: fieldErrors.errors([{ msg: constant.general.CAPTCHAVALIDATION }], true), status: errorCodes.invalid }).end();
    }
  }

  let is_hot, is_featured, is_sponsored;

  let codeObj = {};
  let code = req.body.code;
  if(code){
    await globalModel.custom(req,"SELECT * from invites WHERE code =?",[req.body.code]).then(async result => {
        if(result && result.length){
          codeObj = result[0];
          level_id = req.appSettings['invite_member_lid'];
          if(level_id){
            await levelModel.findById(level_id, req, res).then(result => {
              if(result){
                level_id = result.level_id
                is_hot = result.is_hot
                is_sponsored = result.is_sponsored
                is_featured = result.is_featured
              }else{
                level_id = false;
              }
            }).catch(error => {
              return res.send({ error: fieldErrors.errors([{ msg: constant.general.DATABSE }], true), status: errorCodes.invalid }).end();
            })
          }
        }else{
          code = false;
        }
    })

  }

  if(!level_id){
    await levelModel.getByType('default', req, res).then(result => {
      level_id = result.level_id
      is_hot = result.is_hot
      is_sponsored = result.is_sponsored
      is_featured = result.is_featured
    }).catch(error => {
      return res.send({ error: fieldErrors.errors([{ msg: constant.general.DATABSE }], true), status: errorCodes.invalid }).end();
    })
     //make first user admin
    await userModel.getMembers(req,{limit:1}).then(result => {
      if(!result || !result.length){
        level_id = 1
      }
    })
  }

  

  //default language
  let language = null
  await languageModel.defaultLanguage(req).then(result => {
    if(result){
      language = result.code
    }
  })

  bcrypt
    .hash(password, 12)
    .then(async hashedPassword => {
      if(req.body.phone_number){
        fieldValues["phone_number"] = req.body.phone_number
      }
      fieldValues['password'] = hashedPassword
      fieldValues['timezone'] = req.body.timezone ? req.body.timezone : req.appSettings["member_default_timezone"]
      fieldUserDetails['displayname'] = first_name + " " + last_name
      fieldUserDetails['language'] = language ? language : "en"
      fieldValues['level_id'] = level_id
      fieldValues['active'] = req.appSettings.member_email_verification == 0 ? 1 : 0
      fieldUserDetails['verified'] = 0
      fieldUserDetails['search'] = 1
      fieldUserDetails['is_sponsored'] = is_sponsored ? is_sponsored : 0
      fieldUserDetails['is_featured'] = is_featured ? is_featured : 0
      fieldUserDetails['is_hot'] = is_hot ? is_hot : 0
      fieldUserDetails['gender'] = req.body.gender ? req.body.gender : "male";
      var dt = dateTime.create(); 
      var formatted = dt.format('Y-m-d H:M:S');

      if(req.appSettings.admin_signup_email == 1 && parseInt(req.session.affiliate)){
        fieldValues['affiliate_id'] = parseInt(req.session.affiliate);
      }

      fieldValues['creation_date'] = formatted
      fieldValues['modified_date'] = formatted
      return globalModel.create(req, fieldValues, 'users').then(async result => {
        const user_id = result.insertId
        //update username if not enabled
        if(!req.body.username){
          fieldUserDetails['username'] = user_id
        }
        fieldUserDetails['user_id'] = user_id
        await globalModel.create(req, fieldUserDetails, 'userdetails').then(async result => {

        });
        //create user free subscription plan
        await globalModel.create(req, {owner_id:user_id,title:"Free Plan",description:"This is a free plan.",price:0,is_default:1,creation_date:formatted,modified_date:formatted}, 'member_plans').then(async result => {

        });
        //subscribe to newsletter
        if(req.body.subscribe){
          userModel.newsletter({email:req.body.email,first_name:fieldUserDetails["first_name"],last_name:fieldUserDetails["last_name"]},req).then(result => {
            
          })
        }

        //update invitation code user
        if(Object.keys(codeObj).length > 0){
          globalModel.update(req,{new_user_id:user_id,code:""},'invites','code',codeObj.code);
        }


        

        if(req.appSettings.member_email_verification != 1){
          //res.clearCookie('videoScriptUUID');
          req.session.user = user_id
          if(req.appSettings.welcome_email == 1){
            globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", ["welcome"]).then(async resultsType => {
              if (resultsType) {
                const typeData = JSON.parse(JSON.stringify(resultsType))[0];
                let resultEmail = {}
                resultEmail.vars = typeData.vars
                resultEmail.type = typeData.type
                resultEmail.ownerEmail = {email:fieldValues.email,language:fieldUserDetails.language,displayname:fieldUserDetails.displayname}
                resultEmail.toName = fieldUserDetails.displayname
                resultEmail.toEmail = fieldValues.email
                resultEmail['getstarted'] = {}
                resultEmail['getstarted']["title"] = process.env.PUBLIC_URL + "/login/" 
                resultEmail['getstarted']['changeText'] = req.i18n.t("Click here")
                resultEmail['contactus'] = {}
                resultEmail['contactus']["title"] = process.env.PUBLIC_URL + "/contact/" 
                resultEmail['contactus']["changeText"] = "Contact Us!"
                resultEmail['email'] = {}
                resultEmail['email']["title"] = fieldValues.email
                resultEmail['email']["changeText"] = fieldValues.email
                emailFunction.sendMessage(req, resultEmail).then(result => {
  
                }).catch(err => {
  
                })
              }
            });
          }
          //send email to admin
          if(req.appSettings.admin_signup_email == 1){
            //fetch admins
            globalModel.custom(req, "SELECT users.*,userdetails.* FROM users LEFT JOIN userdetails ON users.user_id = userdetails.user_id WHERE level_id = ?", [1]).then(async results => {
              if (results) {
                const admins = JSON.parse(JSON.stringify(results));
                if(admins.length > 0){
                  admins.forEach(admin => {
                    globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", ["notify_admin_user_signup"]).then(async resultsType => {
                      if (resultsType) {
                        const typeData = JSON.parse(JSON.stringify(resultsType))[0];
                        let resultEmail = {}
                        resultEmail.vars = typeData.vars
                        resultEmail.type = typeData.type
                        resultEmail.ownerEmail = {email:admin.email,language:admin.language,displayname:admin.displayname}
                        resultEmail.toName = admin.displayname
                        resultEmail.toEmail = admin.email
                        resultEmail['usertitle'] = {}
                        resultEmail['usertitle']["title"] = fieldUserDetails.displayname
                        resultEmail['usertitle']['type'] = "text"
                        resultEmail.disableUnsubscribe = true
                        
                        var dt = dateTime.create();
                        var formatted = dt.format('Y-m-d H:M:S');
                        resultEmail['signupdate'] = {}
                        resultEmail['signupdate']["title"] = formatted
                        resultEmail['signupdate']['type'] = "text"

                        resultEmail['userprofilelink'] = {}
                        resultEmail['userprofilelink']["title"] = process.env.PUBLIC_URL + "/"+ fieldUserDetails.username
                        resultEmail['userprofilelink']["changeText"] = "Profile"
                        emailFunction.sendMessage(req, resultEmail).then(result => {
          
                        }).catch(err => {
          
                        })
                      }
                    });
                  });
                }
              }
            })
          }
          //referral signup
          if(req.session.affiliate && parseInt(req.appSettings['referrals_points_value']) > 0){
            let id = req.session.affiliate
            let insertPointsObject = {}
            insertPointsObject["owner_id"] = id
            insertPointsObject["type"] = "referral_points"
            insertPointsObject["resource_type"] = "user"
            insertPointsObject["resource_id"] = user_id
            let pointValue = parseInt(req.appSettings['referrals_points_value'])
            
            insertPointsObject["credit"] = pointValue
            insertPointsObject["creation_date"] = formatted
            insertPointsObject["modified_date"] = formatted
            req.getConnection(function (err, connection) {
              connection.query('INSERT INTO user_point_values SET ? ', [insertPointsObject], function (err, results, fields) {
                  if(err){
                      console.log(err)
                  }else{
                      //update user points
                      connection.query('UPDATE users SET points = points + '+pointValue + " WHERE user_id = ?", [id], function (err, results, fields) {
                          if(err){
                              console.log(err)
                          }
                      })
                  }
              })
            })
            
          }
          req.session.affiliate = null
          return res.json({ status: true,user_id:user_id });
        }else{
          req.session.affiliate = null
          //send verification email to user
          globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", ["email_address_verification"]).then(async resultsType => {
            if (resultsType) {
              const typeData = JSON.parse(JSON.stringify(resultsType))[0];
              let resultEmail = {}
              resultEmail.vars = typeData.vars
              resultEmail.type = typeData.type
              resultEmail.ownerEmail = {email:fieldValues.email,language:fieldUserDetails.language,displayname:fieldUserDetails.displayname}
              resultEmail.toName = fieldUserDetails.displayname
              resultEmail.toEmail = fieldValues.email
              const code = md5(fieldValues.email + "userid" + formatted)
              resultEmail['verificationlink'] = {}
              resultEmail['verificationlink']["title"] = process.env.PUBLIC_URL + "/verify-account/" + code
              resultEmail['verificationlink']['changeText'] = req.i18n.t("Click here")
              resultEmail['email'] = {}
              resultEmail['email']["title"] = fieldValues['email']
              resultEmail['email']["type"] = "text"
              await globalModel.create(req, { user_id: user_id, code: code, creation_date: formatted }, "user_verify").then(result => {
              }).catch(err => {
 
              })
              emailFunction.sendMessage(req, resultEmail).then(result => {

              }).catch(err => {

              })
            }
          });
          return res.json({ status: true,'emailVerification':1 });
        }
      }).catch(error => {
        console.log(error)
        return res.send({ error: fieldErrors.errors([{ msg: constant.general.DATABSE }], true), status: errorCodes.serverError }).end();
      })
    })

}

exports.removeotp = (req,res) => {
  let phone = req.body.phone
  let type = req.body.type
  let code = req.body.code

  globalModel.custom(req,"DELETE from otp_code WHERE code = ? AND type = ? AND phone_number = ?",[code,type,phone]).then(result => {

  })
  return res.send({})
}

exports.resendVerification = async (req,res) => {

  let email = req.body.email
  let phone = req.body.phone

  let fieldValues = {}
  //fetch User
  if(email){
    await userModel.findByEmail(email, req, res).then(user => {
      if (user) {
        fieldValues = user
      }
    }).catch(err => {

    })
  }else{
    await userModel.findByPhoneNumber(phone, req).then(user => {
      if (user) {
        fieldValues = user
      }
    }).catch(err => {

    })
  }
  if(Object.keys(fieldValues).length == 0){
    return res.send({ error: fieldErrors.errors([{ msg: constant.auth.NO_EMAIL_FOUND }], true), status: errorCodes.serverError }).end();
  }
  var dt = dateTime.create(); 
  var formatted = dt.format('Y-m-d H:M:S');
  //send verification email to user
  globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", ["email_address_verification"]).then(async resultsType => {
    if (resultsType) {
      const typeData = JSON.parse(JSON.stringify(resultsType))[0];
      let resultEmail = {}
      resultEmail.vars = typeData.vars
      resultEmail.type = typeData.type
      resultEmail.ownerEmail = {email:fieldValues.email,language:fieldValues.language,displayname:fieldValues.displayname}
      resultEmail.toName = fieldValues.displayname
      resultEmail.toEmail = fieldValues.email
      const code = md5(fieldValues.email + "userid" + formatted)
      resultEmail['verificationlink'] = {}
      resultEmail['verificationlink']["title"] = process.env.PUBLIC_URL + "/verify-account/" + code
      resultEmail['verificationlink']['changeText'] = req.i18n.t("Click here")
      resultEmail['email'] = {}
      resultEmail['email']["title"] = fieldValues['email']
      resultEmail['email']["type"] = "text"
      //delete old entry

      await globalModel.custom(req, "DELETE FROM user_verify WHERE user_id =?", [fieldValues.user_id]).then(result => {

      }).catch(err => {
  
      })

      await globalModel.create(req, { user_id: fieldValues.user_id, code: code, creation_date: formatted }, "user_verify").then(result => {
      }).catch(err => {

      })
      emailFunction.sendMessage(req, resultEmail).then(result => {

      }).catch(err => {

      })
      return res.send({ success: fieldErrors.errors([{ msg: constant.auth.RESENDEMAILVERIFY }], true),code:code, status: errorCodes.created }).end();
    }else{
      return res.send({ success: fieldErrors.errors([{ msg: constant.auth.RESENDEMAILVERIFY }], true), status: errorCodes.created }).end();
    }
  });
  
}