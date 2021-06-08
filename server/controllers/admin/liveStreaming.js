const forms = require('forms')
const formFunctions = require('../../functions/forms/file');
const settings = require("../../models/settings")
const levels = require("../../models/levels")
const fileManager = require("../../models/fileManager")
const permission = require("../../models/levelPermissions")
const videoModel = require("../../models/videos")
const md5 = require("md5");
const globalModel = require('../../models/globalModel');

exports.delete = async (req, res) => {
    const id = req.params.id
    let backURL = req.header('Referer') || process.env.ADMIN_SLUG + "/videos";
    if (!id || !req.user) {
        res.redirect(backURL)
        return
    }
    await videoModel.delete(id, req).then(result => {
        res.redirect(backURL)
        return
    })
}

exports.levels = async (req, res) => {
    let level_id = req.params.level_id
    
    let memberLevels = {}
    let flag = ""
    let type = "user"
    await levels.findAll(req, req.query).then(result => {
        if (result) {
            result.forEach(res => {
                if(res.flag != "public"){
                    if ((!level_id && res.flag == "default")) {
                        level_id = res.level_id
                    }
                    if (res.level_id == level_id || (!level_id && res.flag == "default")) {
                        flag = res.flag
                        type = res.type
                    }
                    memberLevels[res.level_id] = res.title
                }
            });
        }
    })
    const cacheContent = await permission.getKeyValue(req, level_id)
    //get uploaded file by admin
    const files = { "": "" }

    await fileManager.findAll(req, { "column": "path", "like": "image" }).then(result => {
        result.forEach(res => {
            let url = res.path.split(/(\\|\/)/g).pop()
            files[res.path] = res.orgName
        });
    })

    const url = req.originalUrl.replace(process.env.ADMIN_SLUG, '');
    var fields = forms.fields;
    var validators = forms.validators;
    var widgets = forms.widgets;
    const cssClasses = {
        label: [""],
        field: ["form-group"],
        classes: ["form-control"]
    };


    let formFields = {
        level_id: fields.string({
            label: "Member Role",
            choices: memberLevels,
            required: true,
            widget: widgets.select({ "classes": ["select"] }),
            cssClasses: { "field": ["form-group"] },
            value: level_id
        }),
    }

    if (flag != "public") {
           let formFieldsPublic ={
                create: fields.string({
                    choices: {"1" : "Yes, allow to create Live Streaming","0" : "No, do not allow to create Live Streaming"},
                   widget: widgets.select({ "classes": ["select"] }),
                    label:"Allow member to create Live Streaming",
                    fieldsetClasses:"form_fieldset",
                    cssClasses: {"field" : ["form-group"]},
                    value:cacheContent["livestreaming.create"] ? cacheContent["livestreaming.create"].toString() : 1
                })
            }
            formFields = {...formFields,...formFieldsPublic}
    }

    if (flag != "public") {
        let formFields1 = {
            quota: fields.string({
                label: "No. Of Live Streaming member can create to selected level? Enter 0 for unlimited",
                validators: [validators.integer('Enter integer value only.')],
                cssClasses: { "field": ["form-group"] },
                widget: widgets.text({ "classes": ["form-control"] }),
                value: cacheContent["livestreaming.quota"] ? cacheContent["livestreaming.quota"].toString() : 0
            }),
            duration: fields.string({
                label: "Enter the duration of the Live Streaming in minutes? Enter 0 for unlimited",
                validators: [validators.integer('Enter integer value only.')],
                cssClasses: { "field": ["form-group"] },
                widget: widgets.text({ "classes": ["form-control"] }),
                value: cacheContent["livestreaming.duration"] ? cacheContent["livestreaming.duration"].toString() : 10
            }),
         
        }
        formFields = { ...formFields, ...formFields1 }
    }
    var reg_form = forms.create(formFields, { validatePastFirstError: true });
    reg_form.handle(req, {
        success: function (form) {
            permission.insertUpdate(req, res, form.data, level_id, "livestreaming").then(result => {
                res.send({ success: 1, message: "Operation performed successfully.", url: process.env.ADMIN_SLUG + "/live-streaming/levels/" + level_id })
            })
        },
        error: function (form) {
            const errors = formFunctions.formValidations(form);
            res.send({ errors: errors });
        },
        other: function (form) {
            res.render('admin/videos/levels', { nav: url, reg_form: reg_form, title: "Live Streaming Member Role Settings",livestreaming:true });
        }
    });
}

exports.settings = async (req, res) => {
    const url = req.originalUrl.replace(process.env.ADMIN_SLUG, '');
    var fields = forms.fields;
    var validators = forms.validators;
    var widgets = forms.widgets;
    var cssClasses = {
        field: ["form-group"],
        classes: ["form-control"]
    };

    //update users stream key
 //   await globalModel.custom(req,"UPDATE users set streamkey = MD5(CONCAT(user_id,'"+(process.env.SECRETKEY ? process.env.SECRETKEY : '') +"')) WHERE streamkey IS NULL",[]).then(result => {}).catch(err => {});
    //get uploaded file by admin
    const files = { "": "" }

    await fileManager.findAll(req, { "column": "path", "like": "image" }).then(result => {
        result.forEach(res => {
            let url = res.path.split(/(\\|\/)/g).pop()
            files[res.path] = res.orgName
        });
    })
   
    let region = {}
    region["us-east-1"] = "US East (N. Virginia)";
    region["us-east-2"] = "US East (Ohio)";
    region["us-west-1"] = "US West (N. California)";
    region["us-west-2"] = "US West (Oregon)";
    region["ap-northeast-2"] = "Asia Pacific (Seoul)";
    region["ap-south-1"] = "Asia Pacific (Mumbai)";
    region["ap-southeast-1"] = "Asia Pacific (Singapore)";
    region["ap-southeast-2"] = "Asia Pacific (Sydney)";
    region["ap-northeast-1"] = "Asia Pacific (Tokyo)";
    region["ca-central-1"] = "Canada (Central)";
    region["eu-central-1"] = "EU (Frankfurt)";
    region["eu-west-1"] = "EU (Ireland)";
    region["eu-west-2"] = "EU (London)";
    region["sa-east-1"] = "South America (São Paulo)";
    region["us-central-1"] = "us-central-1";
 
    let formFields = {}

    formFields = {
        live_stream_start: fields.string({
            choices: { "1": "Yes", "0": "No" },
            widget: widgets.select({ "classes": ["select"] }),
            label: "Enable Live Streaming on your website?",
            fieldsetClasses: "form_fieldset",
            cssClasses: { "field": ["form-group"] },
            value: settings.getSetting(req, "live_stream_start", '0').toString()
        })
    }

    if(process.env.ANTMEDIASERVER){
        formFields1 = {
            antserver_media_singlekey: fields.string({
                required: true,
                choices: { "1": "Yes", "0": "No" },
                widget: widgets.select({ "classes": ["select"] }),
                label: "Create single key for users to stream",
                fieldsetClasses: "form_fieldset",
                cssClasses: { "field": ["form-group antmedia_data"] },
                value: settings.getSetting(req, "antserver_media_singlekey", '0').toString()
            }),
            live_streaming_type: fields.string({
                choices: { "1": "Agora", "0": "Ant Media Server" },
                widget: widgets.select({ "classes": ["select"] }),
                label: "Choose from below the Live Streaming Type",
                fieldsetClasses: "form_fieldset",
                cssClasses: { "field": ["form-group"] },
                value: settings.getSetting(req, "live_streaming_type", '1').toString()
            }),
            live_streaming_cdn: fields.string({
                label:"AntMedia Server External Storage URL(* leave blank if you use same server for storage)",
                cssClasses: { "field": ["form-group antmedia_data"] },
                widget: widgets.text({ "classes": ["form-control"] }),
                value: settings.getSetting(req, "live_streaming_cdn", '').toString()
            }),
            live_streaming_cdnserver: fields.string({
                label:"AntMedia Server CDN URL(* leave blank if you don't have CDN URL)",
                cssClasses: { "field": ["form-group antmedia_data"] },
                widget: widgets.text({ "classes": ["form-control"] }),
                value: settings.getSetting(req, "live_streaming_cdnserver", '').toString()
            }),
            antserver_media_url: fields.string({
                label:"AntMedia Server URL",
                cssClasses: { "field": ["form-group antmedia_data"] },
                widget: widgets.text({ "classes": ["form-control"] }),
                value: settings.getSetting(req, "antserver_media_url", process.env.PUBLIC_URL).toString()
            }),
            antserver_media_hlssupported: fields.string({
                required: true,
                choices: { "1": "Yes", "0": "No" },
                widget: widgets.select({ "classes": ["select"] }),
                label: "HLS Live Streaming Supported",
                fieldsetClasses: "form_fieldset",
                cssClasses: { "field": ["form-group antmedia_data"] },
                value: settings.getSetting(req, "antserver_media_hlssupported", '0').toString()
            }),
            antserver_media_token: fields.string({
                required: true,
                choices: { "1": "Yes", "0": "No" },
                widget: widgets.select({ "classes": ["select"] }),
                label: "Create token for live streaming",
                fieldsetClasses: "form_fieldset",
                cssClasses: { "field": ["form-group antmedia_data"] },
                value: settings.getSetting(req, "antserver_media_token", '1').toString()
            }),
           
        }

        formFields = {...formFields,...formFields1}
    }


    formFields2 = {
        antmedia_upload_system: fields.string({
            choices: { "s3": "S3", "wisabi": "Wasabi",'0': "Local Storage" },
            widget: widgets.select({ "classes": ["select"] }),
            label: "Ant Media File Storage?",
            fieldsetClasses: "form_fieldset",
            cssClasses: { "field": ["form-group antmedia_data"] },
            value: settings.getSetting(req, "antmedia_upload_system", '0').toString()
        }),
        live_stream_save: fields.string({
            choices: { "1": "Yes", "0": "No" },
            widget: widgets.select({ "classes": ["select"] }),
            label: "Save user Live Streaming on your website?",
            fieldsetClasses: "form_fieldset",
            cssClasses: { "field": ["form-group"] },
            value: settings.getSetting(req, "live_stream_save", '0').toString()
        }),
        
        agora_app_id: fields.string({
            label: "Agora App ID",
            cssClasses: { "field": ["form-group agora_data"] },
            widget: widgets.text({ "classes": ["form-control"] }),
            value: req.loguserallowed ? "****" : settings.getSetting(req, "agora_app_id", '')
        }),

        agora_site: fields.string({
            widget: formFunctions.makeClickable({ content: 'To start Live Streaming feature, you\'ll need to create an account in [0]', replace: [{ 0: '<a href="https://www.agora.io/en/" target="_blank">Agora</a>' }] }),
            cssClasses: { "field": ["form-group agora_data", "form-description"] },
        }),
        
        agora_app_certificate: fields.string({
            label: "Agora App Certificate",
            cssClasses: { "field": ["form-group agora_data"] },
            widget: widgets.text({ "classes": ["form-control"] }),
            value: req.loguserallowed ? "****" : settings.getSetting(req, "agora_app_certificate", '')
        }),
        

        // livestreaming_default_photo: fields.string({
        //     label: "Default Photo on Live Streaming",
        //     choices: files,
        //     required: false,
        //     widget: widgets.select({ "classes": ["select"] }),
        //     cssClasses: { "field": ["form-group"] },
        //     value: settings.getSetting(req, "livestreaming_default_photo", "").toString()
        // }),
        cloud_recording_s3: fields.string({
            widget: formFunctions.makeClickable({ content: '<h2 style="text-align: center;margin: 40px;text-decoration: underline;">Amazon s3 bucket details to save cloud recoding for future use videos.</h2>', replace: [] }),
            cssClasses: { "field": ["form-group", "form-description"] },
        }),
        agora_customer_id: fields.string({
            label: "Agora Customer ID",
            cssClasses: { "field": ["form-group agora_data"] },
            widget: widgets.text({ "classes": ["form-control"] }),
            value: req.loguserallowed ? "****" : settings.getSetting(req, "agora_customer_id", '')
        }),
        agora_customer_certificate: fields.string({
            label: "Agora Customer Certificate",
            cssClasses: { "field": ["form-group agora_data"] },
            widget: widgets.text({ "classes": ["form-control"] }),
            value: req.loguserallowed ? "****" : settings.getSetting(req, "agora_customer_certificate", '')
        }),
        agora_s3_bucket: fields.string({
            label:"Amazon Bucket Name",
            cssClasses: {"field" : ["form-group"]},
            widget: widgets.text({"classes":["form-control"]}),
            value:req.loguserallowed ? "****" : settings.getSetting(req,"agora_s3_bucket",'')
        }),

       
        
        agora_s3_access_key: fields.string({ 
            label : "Amazon S3 Key" ,
            cssClasses:cssClasses,
            widget: widgets.text({"classes":["form-control"]}),
            value:req.loguserallowed ? "****" : settings.getSetting(req,"agora_s3_access_key","")
        }),

        agora_s3_secret_access_key: fields.string({
            label:"Amazon S3 Secret Key",
            cssClasses: {"field" : ["form-group"]},
            widget: widgets.text({"classes":["form-control"]}),
            value:req.loguserallowed ? "****" : settings.getSetting(req,"agora_s3_secret_access_key",'')
        }),
       
        agora_s3_region: fields.string({
            choices: region,
            widget: widgets.select({"classes":["select"]}),
            label:"Amazon S3 buket Region",
            cssClasses: {"field" : ["form-group"],label:['select']},
            value:req.loguserallowed ? "****" : settings.getSetting(req,"agora_s3_region","us-east-1")
        }),
        
        livestreaming_commission_type: fields.string({
            choices: { "1": "Fixed Price", "2": "Percentage" },
            widget: widgets.select({ "classes": ["select"] }),
            label: "Commission Type of sell livestreaming?",
            fieldsetClasses: "form_fieldset",
            cssClasses: { "field": ["form-group"] },
            value: settings.getSetting(req, "livestreaming_commission_type", '1').toString()
        }),
        livestreaming_commission_value: fields.string({
            label: "Get Commission from sell livestreaming (put 0 if you not want comission.)",
            cssClasses: { "field": ["form-group"] },
            widget: widgets.text({ "classes": ["form-control"] }),
            value: settings.getSetting(req, "livestreaming_commission_value", '')
        }),

    }
    formFields = {...formFields,...formFields2}

    var reg_form = forms.create(formFields, { validatePastFirstError: true });
    reg_form.handle(req, {
        success: function (form) {
            delete form.data.agora_site
            delete form.data.agora_s3_bucket_name
            delete form.data.agora_s3_secret_access_key_name
            delete form.data.agora_s3_access_key_name
            delete form.data.cloud_recording_s3

            settings.setSettings(req, form.data)
            res.send({ success: 1, message: "Setting Saved Successfully." })
        },
        error: function (form) {
            const errors = formFunctions.formValidations(form);
            res.send({ errors: errors });
        },
        other: function (form) {
            res.render('admin/videos/settings', { nav: url, reg_form: reg_form, title: "Live Streaming Settings" });
        }
    });
}