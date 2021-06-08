const forms = require('forms')
const formFunctions = require('../../functions/forms/file');
const settings = require("../../models/settings")
const levels = require("../../models/levels")
const pagging = require("../../functions/pagging")
const globalModel = require("../../models/globalModel")
const permission = require("../../models/levelPermissions")
const audioModel = require("../../models/points")
const async = require('async')

exports.index = async (req, res) => {
    const url = req.originalUrl.replace(process.env.ADMIN_SLUG,'');
    var fields = forms.fields;
    var validators = forms.validators;
    var widgets = forms.widgets;
    var cssClasses = {
        field : ["form-group"],
        classes : ["form-control"]
    };

    var reg_form = forms.create({
        enable_ponts: fields.string({
            choices: {"1" : "Yes","0" : "No"},
           widget: widgets.select({ "classes": ["select"] }),
            label:"Do you want to enable points system on your website?",
            fieldsetClasses:"form_fieldset",
            cssClasses: {"field" : ["form-group"]},
            value:settings.getSetting(req,"enable_ponts",'0').toString()
        }),
        points_value: fields.string({
            label:"Points Value in "+req.appSettings['payment_default_currency'],
            cssClasses: {"field" : ["form-group"]},
            widget: widgets.text({"classes":["form-control"]}),
            value: settings.getSetting(req,"points_value",'0')
        }),
        points_label: fields.string({ 
            widget: formFunctions.makeClickable({content : 'Enter the value of credit points in [0] for 1[1]? (For example. 1[2] = 1000 points)',replace: [{0:req.appSettings['payment_default_currency']},{1: req.appSettings['payment_default_currency']},{2: req.appSettings['payment_default_currency']}]}),
            cssClasses:{"field" : ["form-group","form-description"]},
        }),

        signup_referrals: fields.string({
            choices: {"1" : "Yes","0" : "No"},
           widget: widgets.select({ "classes": ["select"] }),
            label:"Enable Signup Invitation Referrals",
            fieldsetClasses:"form_fieldset",
            cssClasses: {"field" : ["form-group"]},
            value:settings.getSetting(req,"signup_referrals",'0').toString()
        }),
        referrals_points_value: fields.string({
            label:"Referrals Points given to User on successful referral signup.",
            cssClasses: {"field" : ["form-group"]},
            widget: widgets.text({"classes":["form-control"]}),
            value: settings.getSetting(req,"referrals_points_value",'0')
        }),


    },{validatePastFirstError:true});
    reg_form.handle(req, {
        success: function (form) {
            if(parseFloat(form.data['points_value']) < 0){
                res.send({ "errors": { 'points_value': "Please enter valid value." } })
                return
            }
            if(parseFloat(form.data['referrals_points_value']) < 0){
                res.send({ "errors": { 'referrals_points_value': "Please enter valid value." } })
                return
            }
            delete form.data.points_label

            settings.setSettings(req,form.data)
            res.send({success:1,message:"Setting Saved Successfully."})
        },
        error: function(form){
            const errors = formFunctions.formValidations(form);
            res.send({errors:errors});
        },
        other: function (form) {
            res.render('admin/points/index',{nav:url,reg_form:reg_form,title:"Points Settings"});
        }
    });
}
exports.approve = async (req,res) => {
    const id = req.params.id
    if ((!id && !req.body.level_id) || !req.user) {
        res.send({error:1})
        return
    }
    await globalModel.custom(req,"SELECT * from point_settings where point_id = ?",id).then(async result => {
        if(result && result.length){
            let item = result[0]
            await globalModel.update(req,{approve:!item.approve},"point_settings","point_id",id).then(result => {
                
                res.send({status:!item.approve})
            })
        }else{
            //create new
            let insertData = {}
            insertData['level_id'] = req.body.level_id
            insertData['type'] = req.body.type
            insertData['resource_type'] = req.body.resource_type
            insertData['approve'] = 1

            await globalModel.custom(req,'INSERT INTO point_settings SET ? ',[insertData]).then(result => {
                res.send({status:true,id:result.insertId})
            })
            //res.send({error:1})
        }
    })  
}

exports.createPoints = (req,results,level_id,type) => {
    return new Promise(async (resolve,reject) => {
        async.forEachOf(results, async function (item, i, callback) {
            let insertData = {}
            let first = req.body.first[i]
            let max = req.body.max[i]
            let next = req.body.next[i]
            let deduct = req.body.deduct[i]
            insertData['level_id'] = level_id
            insertData['type'] = item
            insertData['resource_type'] = type
            insertData['first_time'] = first
            insertData['next_time'] = next
            insertData['approve'] = 1
            insertData['max'] = max
            insertData['deduct'] = deduct
            await globalModel.custom(req,'INSERT INTO point_settings SET ? ON DUPLICATE KEY UPDATE first_time = ?, next_time = ?, max = ?, deduct = ?',[insertData,first,next,max,deduct]).then(result => {
                
            })
            if (i == results.length - 1) {
                resolve(true)
            }
        }, function (err) {
            console.log(err)
            resolve(true)
        })
        
    })
}

exports.levels = async (req,res) => {
    let level_id = req.query.level_id
    
    

    let memberLevels = []
    await  levels.findAll(req,req.query).then(result => {
         if(result){
             result.forEach(res => {
                 if(res.flag != "public"){  
                    if((!level_id && res.flag == "default")){
                        level_id = res.level_id
                    }
                    
                    memberLevels.push(res)
                }
             });
         }
    })
    let resultsItem = []
    let type = req.query.type
    let query = req.query
    if(!req.query.level_id){
        query.level_id = level_id
    }
    if(!type){
        type = "members"
        query.type = "members"
    }

    //save post values
    if(req.body.max){
        await exports.createPoints(req,req.body.type,level_id,type)
    }
    
    let conditions = []
    conditions.push(level_id)
    conditions.push(type)
    let sql = "SELECT *,notificationtypes.type as notification_type FROM notificationtypes LEFT JOIN point_settings ON notificationtypes.type = point_settings.type AND point_settings.level_id = ? WHERE notificationtypes.type != 'level_member_expiry' AND notificationtypes.type != 'member_invite' AND content_type= ?"
    await globalModel.custom(req,sql,conditions).then(res => {
        resultsItem = JSON.parse(JSON.stringify(res));
    })
    req.i18n.changeLanguage("en");
    const url = req.originalUrl.replace(process.env.ADMIN_SLUG,'');
    res.render('admin/points/values', {req:req,memberLevels:memberLevels,loggedin_id: (req.user ? req.user.user_id : ""), loggedinLevel_id: (req.user ? req.user.level_id : ""), query: query, nav: url, resultsItem: resultsItem, title: "Point Values" });

}
