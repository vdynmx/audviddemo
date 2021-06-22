const commonFunction = require("../functions/commonFunctions")
const playlistModel = require("../models/playlists")
const privacyModel = require("../models/privacy")
const userModel = require("../models/users")
const likeModel = require("../models/likes")
const favouriteModel = require("../models/favourites")
const videoModel = require("../models/videos")
const ratingModel = require("../models/ratings")
const recentlyViewed = require("../models/recentlyViewed")
const dateTime = require("node-datetime")
const privacyLevelModel = require("../models/levelPermissions")
const globalModel = require("../models/globalModel")

exports.create = async (req,res) => {
    await commonFunction.getGeneralInfo(req,res,'playlist_edit_create')
    let isValid = true
    const playlistId = req.params.id
    if (playlistId) {
        await playlistModel.findByCustomUrl(playlistId, req, res,true).then(async playlist => {
            req.query.editItem = playlist
            req.query.playlistId = playlistId
            await privacyModel.permission(req, 'playlist', 'edit', playlist).then(result => {
                isValid = result
            }).catch(() => {
                isValid = false
            })
        }).catch(() => {
            isValid = false
        })
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
    if(req.query.data){
        res.send({data:req.query})
        return
    }
    req.app.render(req, res,  '/create-playlist', req.query);

}

exports.browse = async (req, res) => {
    const queryString = req.query
    await commonFunction.getGeneralInfo(req, res, 'playlist_browse')
    
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
        data['orderby'] = "playlists.playlist_id desc"
    } else if (queryString.sort == "favourite" && req.appSettings['playlist_favourite'] == 1) {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.favourite_count desc"
    } else if (queryString.sort == "view") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.view_count desc"
    } else if (queryString.sort == "like" && req.appSettings['playlist_like'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.like_count desc"
    } else if (queryString.sort == "dislike" && req.appSettings['playlist_dislike'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.dislike_count desc"
    } else if (queryString.sort == "rated" && req.appSettings['playlist_rating'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.rating desc"
    } else if (queryString.sort == "commented" && req.appSettings['playlist_comment'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "playlists.comment_count desc"
    }

    if (queryString.type == "featured" && req.appSettings['playlist_featured'] == 1) {
        req.query.search.type = queryString.type
        data['is_featured'] = 1
    } else if (queryString.type == "sponsored" && req.appSettings['playlist_sponsored'] == 1) {
        req.query.search.type = queryString.type
        data['is_sponsored'] = 1
    } else if (queryString.type == "hot" && req.appSettings['playlist_hot'] == 1) {
        req.query.search.type = queryString.type
        data['is_hot'] = 1
    }

    //get all channels as per categories
    await playlistModel.getPlaylists(req, data).then(result => {
        if (result) {
            req.query.pagging = false
            let items = result
            if (result.length > limit - 1) {
                items = result.splice(0, limit - 1);
                req.query.pagging = true
            }
            req.query.playlists = items
        }
    })

    if (req.query.data) {
        res.send({ data: req.query })
        return
    }

    req.app.render(req, res, '/playlists', req.query);
}

exports.view = async (req, res) => {

    await commonFunction.getGeneralInfo(req, res, 'playlist_view')
    req.query.tabType = (req.query.type ? req.query.type : "videos")
    req.query.playlistId = req.params.id

    let playlist = {}

    await playlistModel.findByCustomUrl(req.query.playlistId, req, res).then(result => {
        if (result)
            playlist = result
    }).catch(() => {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    })

    let showPlaylist = true
    if (Object.keys(playlist).length) {
        await privacyModel.check(req, playlist, 'playlist').then(result => {
            showPlaylist = result
            if (!showPlaylist) {
                if (req.query.data) {
                    res.send({data: req.query,permission_error:1});
                    return
                }
                req.app.render(req, res, '/permission-error', req.query);
                return
            }
        }).catch(() => {
            showPlaylist = false
        })
    }else{
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
    if (!showPlaylist){
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        return req.app.render(req, res, '/page-not-found', req.query);
    }
    await privacyModel.permission(req, 'playlist', 'delete', playlist).then(result => {
        playlist.canDelete = result
    })
   
    await privacyModel.permission(req, 'playlist', 'edit', playlist).then(result => {
        playlist.canEdit = result
    })
    if (!Object.keys(playlist).length || ((playlist.approve != 1 || playlist.private == 1) && (!req.user || playlist.owner_id != req.user.user_id && req.levelPermissions['playlist.view'] != 2  ))) {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
    await commonFunction.updateMetaData(req,{title:playlist.title,description:playlist.description,image:playlist.image})

    //playlist user details
    await userModel.findById(playlist.owner_id, req, res).then(result => {
        playlist.owner = result
    }).catch(() => {

    })

    //owner plans
    await privacyLevelModel.findBykey(req,"member",'allow_create_subscriptionplans',playlist.owner.level_id).then(result => {
        req.query.planCreate = result  == 1 ? 1 : 0
    })
    if(req.query.planCreate == 1){
        let isPermissionAllowed = false
        if(req.user && (req.user.user_id == playlist.owner_id || (req.levelPermissions["playlists.view"] && req.levelPermissions["playlists.view"].toString() == "2"))){
            isPermissionAllowed = true;
        }
        if(playlist.view_privacy && playlist.view_privacy.indexOf("package_") > -1 && !isPermissionAllowed){
            let owner_id = req.user ? req.user.user_id : 0
            let checkPlanSql = ""
            let conditionPlanSql = [owner_id,playlist.playlist_id]
            checkPlanSql += 'SELECT `member_plans`.price as `package_price`,`subscriptions`.package_id as loggedin_package_id,mp.price as loggedin_price,'
            checkPlanSql+=  ' CASE WHEN member_plans.price IS NULL THEN 1 WHEN mp.price IS NULL THEN 0 WHEN  `member_plans`.price <= mp.price THEN 1'
            checkPlanSql+=  ' WHEN  `member_plans`.price > mp.price THEN 2'
            checkPlanSql += ' ELSE 0 END as is_active_package'
            checkPlanSql += ' FROM `playlists` LEFT JOIN `member_plans` ON `member_plans`.member_plan_id = REPLACE(`playlists`.view_privacy,"package_","") LEFT JOIN'
            checkPlanSql += ' `subscriptions` ON subscriptions.id = playlists.owner_id AND subscriptions.owner_id = ? AND subscriptions.type = "user_subscribe" AND subscriptions.status IN ("active","completed") LEFT JOIN `member_plans` as mp ON mp.member_plan_id = `subscriptions`.package_id WHERE '
            checkPlanSql += ' playlists.playlist_id = ? LIMIT 1'
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
        if(req.query.tabType == "videos"){
            req.query.tabType = "plans"
        }
        //get user plans
        await userModel.getPlans(req, { owner_id: playlist.owner.user_id, item:req.query.needSubscription }).then(result => {
            if (result) {
                req.query.plans = result
            }
        })
    }else{
        if(req.query.tabType == "plans"){
            req.query.tabType = "videos"
        }
    }
    if(!req.query.needSubscription){
        //playlist videos
        let LimitNum = 13;
        let page = 1
        playlist.videos = {
            pagging: false,
            result: []
        }
        await videoModel.getVideos(req,{playlist_id:playlist.playlist_id,limit:LimitNum}).then(result => {
            let pagging = false
            if (result) {
                pagging = false
                if (result.length > LimitNum - 1) {
                    result = result.splice(0, LimitNum - 1);
                    pagging = true
                }
                playlist.videos = {
                    'pagging': pagging,
                    results: result
                }
            }
        })
    }


    if (req.user) {
        await likeModel.isLiked(playlist.playlist_id, 'playlists', req, res).then(result => {
            if (result) {
                playlist.like_dislike = result.like_dislike
            }
        })

        //favourite
        await favouriteModel.isFavourite(playlist.playlist_id, 'playlists', req, res).then(result => {
            if (result) {
                playlist['favourite_id'] = result.favourite_id
            }
        })
        //ratings
        playlist['ratings'] = 0
        await ratingModel.isRated(playlist.playlist_id, 'playlists', req, res).then(result => {
            if (result) {
                playlist['ratings'] = result.rating
            }
        })
    }

   

    if (req.appSettings['playlist_adult'] != 1 || (playlist.adult == 0 || (playlist.adult == 1 && req.query.adultAllowed))) {
        req.query.playlist = playlist
        if(playlist.approve == 1)
        recentlyViewed.insert(req, { id: playlist.playlist_id, owner_id: playlist.owner_id, type: 'playlists', creation_date: dateTime.create().format("Y-m-d H:M:S") })
    }else{
        req.query.adultPlaylist = playlist.adult
    }

    //related playlists tags
    // await playlistModel.getPlaylists(req, { owner_id: playlist.owner_id, not_playlist_id: playlist.playlist_id, 'related': true }).then(result => {
    //     if (result) {
    //         req.query.relatedPlaylists = result
    //     }
    // })

    if (req.query.data) {
        res.send({ data: req.query })
        return
    }
    req.app.render(req, res, '/playlist', req.query);
}
