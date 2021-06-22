const commonFunction = require("../functions/commonFunctions")
const audioModel = require("../models/audio")
const privacyModel = require("../models/privacy")
const userModel = require("../models/users")
const likeModel = require("../models/likes")
const favouriteModel = require("../models/favourites")
const recentlyViewed = require("../models/recentlyViewed")
const dateTime = require("node-datetime")
const globalModel = require("../models/globalModel")
const privacyLevelModel = require("../models/levelPermissions")

exports.create = async (req,res,next) => {
    
    let isValid = true
    const audioId = req.params.id
    if (audioId) {
        await commonFunction.getGeneralInfo(req,res,'audio_edit_create')
        await audioModel.findByCustomUrl(audioId, req, res,true).then(async audio => {
            req.query.editItem = audio
            req.query.audioId = audioId
            await privacyModel.permission(req, 'audio', 'edit', audio).then(result => {
                isValid = result
            }).catch(err => {
                isValid = false
            })
        }).catch(err => {
            isValid = false
        })
    }else{
        await commonFunction.getGeneralInfo(req,res,'audio_create')
    }
    if (!isValid) {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
     //owner plans
     await privacyLevelModel.findBykey(req,"member",'allow_create_subscriptionplans',req.user.level_id).then(result => {
        req.query.planCreate = result  == 1 ? 1 : 0
    })
    if(req.query.planCreate == 1){
        //get user plans
        await userModel.getPlans(req, { owner_id: req.user.user_id }).then(result => {
            if (result) {
                req.query.plans = result
            }
        })
    }

    req.query.audioId = audioId
    if(req.query.data){
        res.send({data:req.query})
        return
    }
    req.app.render(req, res,  '/create-audio', req.query);

}

exports.browse = async (req, res) => {
    const queryString = req.query
    await commonFunction.getGeneralInfo(req, res, 'audio_browse')
    
    const limit = 17
    const data = { limit: limit }
    req.query.search = {}
    data['type'] = queryString.type
    if (queryString.q && !queryString.tag) {
        req.query.search.q = queryString.q
        data['title'] = queryString.q
    }

    if (queryString.sort == "latest") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.audio_id desc"
    } else if (queryString.sort == "favourite" && req.appSettings['audio_favourite'] == 1) {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.favourite_count desc"
    } else if (queryString.sort == "view") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.view_count desc"
    } else if (queryString.sort == "like" && req.appSettings['audio_like'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.like_count desc"
    } else if (queryString.sort == "dislike" && req.appSettings['audio_dislike'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.dislike_count desc"
    } else if (queryString.sort == "rated" && req.appSettings['audiorating'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.rating desc"
    } else if (queryString.sort == "commented" && req.appSettings['audio_comment'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.comment_count desc"
    }else if (queryString.sort == "played") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "audio.play_count desc"
    } 

    if (queryString.type == "featured" && req.appSettings['audio_featured'] == 1) {
        req.query.search.type = queryString.type
        data['is_featured'] = 1
    } else if (queryString.type == "sponsored" && req.appSettings['audio_sponsored'] == 1) {
        req.query.search.type = queryString.type
        data['is_sponsored'] = 1
    } else if (queryString.type == "hot" && req.appSettings['audio_hot'] == 1) {
        req.query.search.type = queryString.type
        data['is_hot'] = 1
    }
    req.query.fromBrowse = 1
    req.query.audios = []
    //get all channels as per categories
    await audioModel.getAudios(req, data).then(result => {
        if (result) {
            req.query.pagging = false
            let items = result
            if (result.length > limit - 1) {
                items = result.splice(0, limit - 1);
                req.query.pagging = true
            }
            req.query.audios = items
        }
    })

    if (req.query.data) {
        res.send({ data: req.query })
        return
    }

    req.app.render(req, res, '/audio', req.query);
}

exports.view = async (req, res) => {
 
    await commonFunction.getGeneralInfo(req, res, 'audio_view')
    req.query.tabType = (req.query.type ? req.query.type : null)
    req.query.audioId = req.params.id

    let audio = {}
    let audioObj = {}

    await audioModel.findByCustomUrl(req.params.id,req).then(results => {
        if (results)
            audioObj = results
    })

    let referer  = ""
    try{
        referer = req.header('Referer');
    }catch(err){
        console.log(err)
    }
    //add user referer
    if(referer){
        let currentServerURL = process.env.PUBLIC_URL
        var currentHost = new URL(currentServerURL);
        var a = new URL(referer);
        if(a.hostname != currentHost.hostname){
            let insertObject = {}
            insertObject['owner_id'] = req.user ? req.user.user_id : 0
            insertObject['sitename'] = a.hostname
            insertObject['content_id'] = audioObj ? audioObj.audio_id : 0
            insertObject['url'] = referer
            insertObject['type'] = "audio"
            insertObject['ip'] = typeof req.headers != "undefined" && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : (req.connection && req.connection.remoteAddress ? req.connection.remoteAddress : "")
            insertObject['creation_date'] =  new Date(dateTime.create().format("Y-m-d H:M:S"));
            await globalModel.create(req,insertObject,'referers').then(res => {})
        }
    }

    //console.log(audioObj,'ldksj')
    req.isview = true;
    req.allowPeaks = true;
    await audioModel.getAudios(req,{custom_url: req.query.audioId ? req.query.audioId : "notfound", audioview: true }).then(result => {
        if (result && result.length > 0)
            audio = result[0]
    }).catch(error => {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    })
    req.allowPeaks = false;
    req.isview = false;
    let showAudio = true
    if (Object.keys(audio).length) {
        await privacyModel.check(req, audio, 'audio').then(result => {
            showAudio = result
        }).catch(error => {
            showAudio = false
        })
    }
    if (!showAudio) {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
    
    await privacyModel.permission(req, 'audio', 'delete', audio).then(result => {
        audio.canDelete = result
    })
   
    await privacyModel.permission(req, 'audio', 'edit', audio).then(result => {
        audio.canEdit = result
    })
    if (!Object.keys(audio).length || ((audio.approve != 1) && (!req.user || audio.owner_id != req.user.user_id && req.levelPermissions['audio.view'] != 2  ))) {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
    await commonFunction.updateMetaData(req,{title:audio.title,description:audio.description,image:audio.image})

    if (req.user) {
        await likeModel.isLiked(audio.audio_id, 'audio', req, res).then(result => {
            if (result) {
                audio.like_dislike = result.like_dislike
            }
        })

        //favourite
        await favouriteModel.isFavourite(audio.audio_id, 'audio', req, res).then(result => {
            if (result) {
                audio['favourite_id'] = result.favourite_id
            }
        })
        
    }

    //audio user details
    await userModel.findById(audio.owner_id, req, res).then(result => {
        audio.owner = result
    }).catch(error => {

    })


    //owner plans
    await privacyLevelModel.findBykey(req,"member",'allow_create_subscriptionplans',audio.owner.level_id).then(result => {
        req.query.planCreate = result  == 1 ? 1 : 0
    })
    if(req.query.planCreate == 1){
        let isPermissionAllowed = false
        if(req.user && (req.user.user_id == audio.owner_id || (req.levelPermissions["audio.view"] && req.levelPermissions["audio.view"].toString() == "2"))){
            isPermissionAllowed = true;
        }
        if(audio.view_privacy.indexOf("package_") > -1 && !isPermissionAllowed){
            let owner_id = req.user ? req.user.user_id : 0
            let checkPlanSql = ""
            let conditionPlanSql = [owner_id,audio.audio_id]
            checkPlanSql += 'SELECT `member_plans`.price as `package_price`,`subscriptions`.package_id as loggedin_package_id,mp.price as loggedin_price,'
            checkPlanSql+=  ' CASE WHEN member_plans.price IS NULL THEN 1 WHEN mp.price IS NULL THEN 0 WHEN  `member_plans`.price <= mp.price THEN 1'
            checkPlanSql+=  ' WHEN  `member_plans`.price > mp.price THEN 2'
            checkPlanSql += ' ELSE 0 END as is_active_package'
            checkPlanSql += ' FROM `audio` LEFT JOIN `member_plans` ON `member_plans`.member_plan_id = REPLACE(`audio`.view_privacy,"package_","") LEFT JOIN'
            checkPlanSql += ' `subscriptions` ON subscriptions.id = audio.owner_id AND subscriptions.owner_id = ? AND subscriptions.type = "user_subscribe" AND subscriptions.status IN ("active","completed") LEFT JOIN `member_plans` as mp ON mp.member_plan_id = `subscriptions`.package_id WHERE '
            checkPlanSql += ' audio.audio_id = ? LIMIT 1'
            await globalModel.custom(req,checkPlanSql,conditionPlanSql).then(result => {
                if(result && result.length > 0){
                    const res = JSON.parse(JSON.stringify(result))[0];
                    if(res.is_active_package == 0){
                        res.type = "new"
                        req.query.needSubscription = res; 
                    }else if(res.is_active_package == 2){
                        res.type = "upgrade"
                        req.query.needSubscription = res;
                    }
                }
            })
        }
    }

    if(req.query.needSubscription){
        if(!req.query.tabType){
            req.query.tabType = "plans"
        }
        //get user plans
        await userModel.getPlans(req, { owner_id: audio.owner.user_id, item:req.query.needSubscription }).then(result => {
            if (result) {
                req.query.plans = result
            }
        })
        delete audio.audio_file
        delete audio.peaks
    }else{
        if(req.query.tabType == "plans"){
            req.query.tabType = "about"
        }if(!req.query.tabType){
            req.query.tabType = "about"
        }
    }
    
    if (!req.query.password) {
        req.query.audio = audio
        delete req.query.audio.password
        if(audio.approve == 1)
            recentlyViewed.insert(req, { id: audio.audio_id, owner_id: audio.owner_id, type: 'audio', creation_date: dateTime.create().format("Y-m-d H:M:S") })

        await audioModel.getAudios(req, { orderby:" view_count desc ", not_audio_id: audio.audio_id, limit: 10 }).then(result => {
            if (result) {
                req.query.relatedAudios = result
            }
        }).catch(err => {
    
        })


    }
    
    if (req.query.data) {
        res.send({ data: req.query })
        return
    }
    req.app.render(req, res, '/audio', req.query);
}
