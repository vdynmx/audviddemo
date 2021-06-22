const commonFunction = require("../functions/commonFunctions")
const privacyModel = require("../models/privacy")
const userModel = require("../models/users")
const likeModel = require("../models/likes")
const favouriteModel = require("../models/favourites")
const videoModel = require("../models/videos")
const channelModel = require("../models/channels")
const playlistModel = require("../models/playlists")
const blogModel = require("../models/blogs")
const audioModel = require("../models/audio")
const recentlyViewed = require("../models/recentlyViewed")
const dateTime = require("node-datetime")
const globalModel = require("../models/globalModel")


exports.browse = async (req, res) => {

    const queryString = req.query
    await commonFunction.getGeneralInfo(req, res, 'member_browse')

    const limit = 13
    const data = {}
    req.query.search = {}
    data['type'] = queryString.type
    if (queryString.q && !queryString.tag) {
        req.query.search.q = queryString.q
        data['title'] = queryString.q
    }

    if (queryString.sort == "latest") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "users.user_id desc"
    } else if (queryString.sort == "favourite" && req.appSettings['member_favourite'] == 1) {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.favourite_count desc"
    } else if (queryString.sort == "view") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.view_count desc"
    } else if (queryString.sort == "like" && req.appSettings['member_like'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.like_count desc"
    } else if (queryString.sort == "dislike" && req.appSettings['member_dislike'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.dislike_count desc"
    } else if (queryString.sort == "rated" && req.appSettings['member_rating'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.rating desc"
    } else if (queryString.sort == "commented" && req.appSettings['member_comment'] == "1") {
        req.query.search.sort = queryString.sort
        data['orderby'] = "userdetails.comment_count desc"
    }

    if (queryString.type == "featured" && req.appSettings['member_featured'] == 1) {
        req.query.search.type = queryString.type
        data['is_featured'] = 1
    } else if (queryString.type == "sponsored" && req.appSettings['member_sponsored'] == 1) {
        req.query.search.type = queryString.type
        data['is_sponsored'] = 1
    } else if (queryString.type == "hot" && req.appSettings['member_hot'] == 1) {
        req.query.search.type = queryString.type
        data['is_hot'] = 1
    }
    //get all members
    await userModel.getMembers(req, data).then(result => {
        let members = []
        if (result) {
            req.query.pagging = false
            members = result
            if (result.length > limit - 1) {
                members = result.splice(0, limit - 1);
                req.query.pagging = true
            }
        }
        req.query.members = members
    }).catch(err => {
        console.log(err)
    })

    if (req.query.data) {
        res.send({ data: req.query })
        return
    }

    req.app.render(req, res, '/members', req.query);
}

exports.view = async (req, res, next) => {
    const custom_url = req.params.id
    req.query.tabType = (req.query.type ? req.query.type : null)

    let member = {}
    await userModel.findByUsername(custom_url, req, res).then(result => {
        if (result)
            member = result
    }).catch(error => {
        if (req.query.data) {
            res.send({data: req.query,pagenotfound:1});
            return
        }
        req.app.render(req, res, '/page-not-found', req.query);
        return
    })
    if (Object.keys(member).length) {
        await commonFunction.getGeneralInfo(req, res, 'member_view')
        await commonFunction.updateMetaData(req,{title:member.displayname,description:member.about,image:member.avtar})
        let LimitNum = 13;
        let members = {
            pagging: false,
            result: []
        }
        let data = {}
        data.limit = LimitNum
        data.owner_id = member.user_id
        //get videos
        await videoModel.getVideos(req, data).then(result => {
            let pagging = false
            if (result) {
                pagging = false
                if (result.length > LimitNum - 1) {
                    result = result.splice(0, LimitNum - 1);
                    pagging = true
                }
                req.query.videos = {
                    'pagging': pagging,
                    results: result
                }
            }
        })
        if (req.appSettings["enable_channel"] == 1) {
            //get channels
            await channelModel.getChannels(req, data).then(result => {
                let pagging = false
                if (result) {
                    pagging = false
                    if (result.length > LimitNum - 1) {
                        result = result.splice(0, LimitNum - 1);
                        pagging = true
                    }
                    req.query.channels = {
                        'pagging': pagging,
                        results: result
                    }
                }
            })
        }else{
            if(req.query.tabType == "channels"){
                req.query.tabType = null
            }
        }
        if (req.appSettings["enable_playlist"] == 1) {
            //get playlists
            let dataPlaylist = data
            dataPlaylist['limit'] = 17
            await playlistModel.getPlaylists(req, dataPlaylist).then(result => {
                let pagging = false
                if (result) {
                    pagging = false
                    if (result.length > dataPlaylist['limit'] - 1) {
                        result = result.splice(0, dataPlaylist['limit'] - 1);
                        pagging = true
                    }
                    req.query.playlists = {
                        'pagging': pagging,
                        results: result
                    }
                }
            })
        }else{
            if(req.query.tabType == "playlists"){
                req.query.tabType = null
            }
        }
        if (req.appSettings["enable_blog"] == 1) {
            //get blogs
            LimitNum = 17
            await blogModel.getBlogs(req, { limit: LimitNum, owner_id: member.user_id }).then(result => {
                let pagging = false
                if (result) {
                    pagging = false
                    if (result.length > LimitNum - 1) {
                        result = result.splice(0, LimitNum - 1);
                        pagging = true
                    }
                    req.query.blogs = {
                        'pagging': pagging,
                        results: result
                    }
                }
            })
        }else{
            if(req.query.tabType == "blogs"){
                req.query.tabType = null
            }
        }
        if (req.appSettings["enable_audio"] == 1) {
            //get audio
            await audioModel.getAudios(req, { limit: LimitNum, owner_id: member.user_id }).then(result => {
                let pagging = false
                if (result) {
                    pagging = false
                    if (result.length > LimitNum - 1) {
                        result = result.splice(0, LimitNum - 1);
                        pagging = true
                    }
                    req.query.audio = {
                        'pagging': pagging,
                        results: result
                    }
                }
            })
        }else{
            if(req.query.tabType == "audio"){
                req.query.tabType = null
            }
        }
        
        if (req.user) {
            await likeModel.isLiked(member.user_id, 'members', req, res).then(result => {
                if (result) {
                    member.like_dislike = result.like_dislike
                }
            })

            //favourite
            await favouriteModel.isFavourite(member.user_id, 'members', req, res).then(result => {
                if (result) {
                    member['favourite_id'] = result.favourite_id
                }
            })
        }
        const privacyLevelModel = require("../models/levelPermissions")
        await privacyLevelModel.findBykey(req,"member",'allow_create_subscriptionplans',member.level_id).then(result => {
            req.query.planCreate = result  == 1 ? 1 : 0
        })
        await privacyLevelModel.findBykey(req,"member",'show_homebutton_profile',member.level_id).then(result => {
            req.query.showHomeButtom = result  == 1 && req.query.planCreate == 1 ? 1 : 0
        })

        let dataPaid = {}
        dataPaid.limit = LimitNum
        dataPaid.owner_id = member.user_id
        dataPaid.user_sell_home_content = true;
        //get videos
        await videoModel.getVideos(req, dataPaid).then(result => {
            let pagging = false
            if (result) {
                pagging = false
                if (result.length > LimitNum - 1) {
                    result = result.splice(0, LimitNum - 1);
                    pagging = true
                }
                req.query.paidVideos = {
                    'pagging': pagging,
                    results: result
                }
            }
        })

        let dataLive = {}
        dataLive.limit = LimitNum
        dataLive.owner_id = member.user_id
        dataLive.is_live_videos = true;
        //get videos
        await videoModel.getVideos(req, dataLive).then(result => {
            let pagging = false
            if (result) {
                pagging = false
                if (result.length > LimitNum - 1) {
                    result = result.splice(0, LimitNum - 1);
                    pagging = true
                }
                req.query.liveVideos = {
                    'pagging': pagging,
                    results: result
                }
            }
        })

        if(req.query.planCreate == 1){
            req.query.userProfilePage = 1;
            //if home button is enabled
            if(req.query.showHomeButtom == 1){          
                // get top 3 newest monthly plan videos
                
                req.query.homeData = {}
                req.query.homeData['latest_videos'] = []
                req.query.homeData['latest_blogs'] = []
                req.query.homeData['latest_audio'] = []
                req.query.homeData['sell_videos'] = []
                
                req.query.homeData['most_latest_videos'] = []
                req.query.homeData['most_latest_blogs'] = []
                req.query.homeData['most_latest_audio'] = []
                req.query.homeData['most_sell_videos'] = []
                
                req.query.homeData['donation_videos'] = []
                let data = {}
                data['orderby'] = "videos.video_id desc"
                data['user_home_content'] = true;
                data.owner_id = member.user_id
                await videoModel.getVideos(req, data).then(result => {
                    if (result && result.length) {
                        req.query.homeData['latest_videos'] = result
                    }
                }).catch(error => {
        
                })

                let dataMost = {}
                dataMost['orderby'] = "videos.view_count desc"
                dataMost['user_home_content'] = true;
                dataMost.owner_id = member.user_id
                await videoModel.getVideos(req, dataMost).then(result => {
                    if (result && result.length) {
                        req.query.homeData['most_latest_videos'] = result
                    }
                }).catch(error => {
        
                })

                if (req.appSettings["enable_blog"] == 1) {
                    // get top 3 newest monthly plan blog
                    let dataBlog = {}
                    dataBlog['orderby'] = "blogs.blog_id desc"
                    dataBlog['user_home_content'] = true;
                    dataBlog.owner_id = member.user_id
                    await blogModel.getBlogs(req, dataBlog).then(result => {
                        if (result && result.length) {
                            req.query.homeData['latest_blogs'] = result
                        }
                    }).catch(error => {
        
                    })
                    let mostDataBlog = {}
                    mostDataBlog['orderby'] = "blogs.view_count desc"
                    mostDataBlog['user_home_content'] = true;
                    mostDataBlog.owner_id = member.user_id
                    await blogModel.getBlogs(req, mostDataBlog).then(result => {
                        if (result && result.length) {
                            req.query.homeData['most_latest_blogs'] = result
                        }
                    }).catch(error => {
        
                    })
                }
                if (req.appSettings["enable_audio"] == 1) {
                    // get top 3 newest monthly plan audio
                    let dataAudio = {}
                    dataAudio['orderby'] = "audio.audio_id desc"
                    dataAudio['user_home_content'] = true;
                    dataAudio.owner_id = member.user_id
                    await audioModel.getAudios(req, dataAudio).then(result => {
                        if (result && result.length) {
                            req.query.homeData['latest_audio'] = result
                        }
                    }).catch(error => {
        
                    })
                    let mostDataAudio = {}
                    mostDataAudio['orderby'] = "audio.view_count desc"
                    mostDataAudio['user_home_content'] = true;
                    mostDataAudio.owner_id = member.user_id
                    await audioModel.getAudios(req, mostDataAudio).then(result => {
                        if (result && result.length) {
                            req.query.homeData['most_latest_audio'] = result
                        }
                    }).catch(error => {
        
                    })
                }
                //get top 3 newest price sell videos
                let dataVideos = {}
                dataVideos['orderby'] = "videos.video_id desc"
                dataVideos['user_sell_home_content'] = true;
                dataVideos.owner_id = member.user_id
                await videoModel.getVideos(req, dataVideos).then(result => {
                    if (result && result.length) {
                        req.query.homeData['sell_videos'] = result
                    }
                }).catch(error => {
        
                })

                let sellDataVideos = {}
                sellDataVideos['orderby'] = "videos.view_count desc"
                sellDataVideos['user_sell_home_content'] = true;
                sellDataVideos.owner_id = member.user_id
                await videoModel.getVideos(req, sellDataVideos).then(result => {
                    if (result && result.length) {
                        req.query.homeData['most_sell_videos'] = result
                    }
                }).catch(error => {
        
                })

                //top donated users
                await videoModel.donors({limit: 10, offset:0, video_owner_id: member.user_id, offthemonth:1}, req).then(result => {
                    if (result && result.length) {
                        req.query.homeData['donation_videos'] = result
                    }
                }).catch(error => {
        
                })
            }

            //get user plans
            //get audio
            await userModel.getPlans(req, { owner_id: member.user_id }).then(result => {
                if (result) {
                    req.query.plans = {
                        results: result
                    }
                }
            })

            if(req.user){
                const condition = []
                let sql = 'SELECT expiration_date,package_id FROM subscriptions where 1 = 1'
                condition.push(parseInt(req.user.user_id))
                sql += " and owner_id = ?"
                condition.push("user_subscribe")
                sql += " and type = ?"
                condition.push(member.user_id)
                sql += " and id = ?"
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                condition.push(formatted)
                sql += " and (expiration_date IS NULL || expiration_date >= ?)"
                sql += " and (status = 'completed' || status = 'approved' || status = 'active') "
                condition.push(1)
                sql += " LIMIT ?"
                await globalModel.custom(req,sql,condition).then(result => {
                    if(result && result.length > 0){
                        let item = JSON.parse(JSON.stringify(result));
                        if(item && item.length > 0){
                            let subscription = item[0] 
                            req.query.userSubscription = true
                            req.query.userSubscriptionID = subscription.package_id
                        } 
                        
                    }
                })
            }
            if(req.user && req.user.user_id == member.user_id){
                //get subscribers
                let LimitNum = 13;
                let page = 1
                let offsetArtist = (page - 1) * LimitNum
                await userModel.getSubscribers(req,{user_id:member.user_id, limit: LimitNum, offset:offsetArtist}).then(result => {
                    let pagging = false
                    if (result) {
                        pagging = false
                        if (result.length > LimitNum - 1) {
                            result = result.splice(0, LimitNum - 1);
                            pagging = true
                        }
                        member.subscribers = {
                            'pagging': pagging,
                            results: result
                        }
                    }
                }).catch(error => {
                    console.log(error)
                })
            }
        }
        await privacyModel.permission(req, 'member', 'delete', member).then(result => {
            member.canDelete = result
        })
        await privacyModel.permission(req, 'member', 'edit', member).then(result => {
            member.canEdit = result
        })
        if (req.session.memberSubscriptionPaymentStatus) {
            req.query.memberSubscriptionPaymentStatus = req.session.memberSubscriptionPaymentStatus
            req.session.memberSubscriptionPaymentStatus = null
        }
        req.query.member = member
        recentlyViewed.insert(req, { id: member.user_id, owner_id: member.user_id, type: 'members', creation_date: dateTime.create().format("Y-m-d H:M:S") })
        req.query.memberId = custom_url
        if (req.query.data) {
            res.send({ data: req.query })
            return
        }
        req.app.render(req, res, '/member', req.query);
    } else {
        next()
    }
}
