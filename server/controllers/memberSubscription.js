const recurringPaypal = require("../functions/recurring-paypal")
const globalModel = require("../models/globalModel")
const dateTime = require("node-datetime")
const followModel = require("../models/followers")

exports.browse = async (req, res) => {
    let resource_id = req.params.id
    let itemObject = {}
    let type = "user"
    let valid = false
    if (resource_id && type) { 
        await globalModel.custom(req,"SELECT member_plans.*, userdetails.username from member_plans LEFT JOIN userdetails ON userdetails.user_id = member_plans.owner_id where member_plan_id = ?",[resource_id]).then(result => {
            let item = JSON.parse(JSON.stringify(result));
            if(item && item.length > 0){
                itemObject = item[0]
                valid = true
            }
        })
    }
    if(!valid){
        res.redirect("/")
        res.end()
        return
    }

    req.session.orderId = null
    //delete all user pending orders
    await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(_result => {
        
    })
    let currentDate = dateTime.create().format("Y-m-d H:M:S")
    //create order
    await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: 1, state: "initial", creation_date: currentDate, source_type: "user_subscribe", source_id: itemObject.owner_id }, "orders").then(result => {
        if (result) {
            req.session.orderId = result.insertId
        } else {

        }
    })
    if (!req.session.orderId) {
        res.redirect("/")
        res.end()
        return
    }
    const data = {}
    data["amount"] = parseFloat(itemObject.price).toFixed(2)
    data['id'] = resource_id
    data["description"] = itemObject.description
    data["headingTitle"] = itemObject.title
    data["returnUrl"] = `${process.env.PUBLIC_URL}/subscription/successulPayment/`+resource_id
    data["cancelUrl"] = `${process.env.PUBLIC_URL}/subscription/cancelPayment/`+resource_id
    data.frequency = "month"
    data.interval = 1
    data.sku = "order_"+req.session.orderId
    data.title = itemObject.title
    data.frequency = "month"
    data.interval = 1


    itemObject.type = "month"
    itemObject.duration_type = "year"
    itemObject.duration = 100
    itemObject.interval = 1

    return recurringPaypal.init(req, res, data,itemObject).then(result => {
        if (result.url) {
            req.session.resource_id = resource_id
            req.session.tokenUserPayment = result.token
            res.redirect(302, result.url)
        } else {
            res.redirect("/"+itemObject.username+"?type=plans")
        }
    }).catch(err => {
        console.log(err, ' ======= Member subscription RECURRING ERR ============')
        return res.redirect("/"+itemObject.username+"?type=plans")
    })
     
}

exports.successul = async (req, res, _next) => {

    let id = req.params.id
    let type = "user"
    let gateway = req.body.gateway ? req.body.gateway : req.query.gateway
    let currentDate = dateTime.create().format("Y-m-d H:M:S")

    if (!gateway &&  (!req.session.tokenUserPayment || !req.session.resource_id || !req.session.orderId) ) {
        return res.redirect(302, '/')
    } else {
        if(gateway){
            req.session.orderId = null
            //delete all user pending orders
            await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(_result => {
            })
            //create order
            await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: gateway, state: "initial", creation_date: currentDate, source_type: "user_subscribe", source_id: id }, "orders").then(result => {
                if (result) {
                    req.session.orderId = result.insertId
                } else {
                }
            })
        }

        let resource_id = id ? id : req.session.resource_id
        let orderID = req.session.orderId
        let orders = {}
        let itemObject = {}
        await globalModel.custom(req, "SELECT * FROM orders where order_id =?",orderID).then(result => {
            let item = JSON.parse(JSON.stringify(result));
            if(item && item.length > 0){
                orders = item[0] 
            } else {
                resource_id = null
            }
        }).catch(_err => {
            resource_id = null
        })
        if(orders.source_type == "user_subscribe"){
            await globalModel.custom(req, "SELECT member_plans.*, userdetails.username from member_plans LEFT JOIN userdetails ON userdetails.user_id = member_plans.owner_id where member_plan_id = ?",resource_id).then(result => {
                let item = JSON.parse(JSON.stringify(result));
                if(item && item.length > 0){
                    itemObject = item[0] 
                } 
            }).catch(_err => {
                
            })
        }
        if (!resource_id || Object.keys(itemObject).length == 0) {
            res.send("/")
            res.end()
        }

        //check free plan
        if(parseFloat(itemObject.price) == 0){
            //free plan
            //cancel subscription from gateway
            req.memberUSERID = resource_id
            let memberSubscription = require("../functions/ipnsFunctions/channelSupportSubscriptions");
            await memberSubscription.cancelAll({user_id:req.user.user_id,subscription_type:"user_subscribe"}, "User changed subscription plan.", null,req);
            // //cancel other active subscription
            await globalModel.custom(req,"UPDATE subscriptions SET status = ? WHERE owner_id = ? AND id = ?",["cancelled",req.user.user_id,resource_id]);

            // //cancel other active orders
            // await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
            req.memberUSERID = null
            //subscribe user
            let data = {}
            var dt = dateTime.create();
            var formatted = dt.format('Y-m-d H:M:S');
            data['type'] = "members"
            data['id'] = itemObject.owner_id
            data['owner_id'] = req.user.user_id
            data['creation_date'] = formatted
            await followModel.isFollowed(req,data.type,req.user.user_id,data.id).then(result => {
                if(result){
                    data['followId'] = result.follower_id   
                }
            })
            if(!data['followId']){
             await followModel.insert(data,req,res).then(result => {});
            }
            await globalModel.create(req, {gateway_id:gateway, type:"user_subscribe",id:itemObject.owner_id, expiration_date: null, owner_id: req.user.user_id, package_id: resource_id, status: "completed",creation_date: currentDate, modified_date: currentDate, gateway_profile_id: null,order_id:req.session.orderId }, "subscriptions").then(async _result => {
                globalModel.update(req,{gateway_id:gateway,gateway_transaction_id:null,state:"completed"},"orders","order_id",req.session.orderId)
                req.session.memberSubscriptionPaymentStatus = "successFree"
                if(req.query.type == "channel"){
                    res.redirect("/channel/"+req.query.custom_url+"?type=plans")
                }else if(req.query.type == "blog"){
                    res.redirect("/blog/"+req.query.custom_url+"?type=plans")
                }else if(req.query.type == "playlist"){
                    res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
                }else if(req.query.type == "audio"){
                    res.redirect("/audio/"+req.query.custom_url+"?type=plans")
                }else if(req.query.type == "video"){
                    res.redirect("/watch/"+req.query.custom_url+"?type=plans")
                }else{
                    res.redirect("/"+itemObject.username+"?type=plans")
                }
                res.end()
            })
            return;
        }

        let responseGateway = {}
        let isValidResult = false;

        orders.type = "month"
        orders.duration_type = "year"
        orders.duration = 100
        orders.interval = 1

        if(gateway == "2"){
            const { payment_method} = req.body;
            const email = req.user.email
            const stripe = require('stripe')(req.appSettings['payment_stripe_client_secret']);

            await new Promise(async function(resolve, _){

                //create plan
                let existingPlan = null;
                await new Promise(async function(resolve, _reject){
                    stripe.plans.retrieve(
                        "user_"+orders.source_id+"_"+itemObject.owner_id+"_"+(String(itemObject.price).replace(".",'_'))
                    ,function(err,response){
                        if(err){
                            resolve()
                        }else{
                            existingPlan = response
                            resolve()
                        }
                    });
                })
                if(!existingPlan || !existingPlan.id){
                    
                    existingPlan = await stripe.plans.create({
                        "id":"user_"+orders.source_id+"_"+itemObject.owner_id+"_"+(String(itemObject.price).replace(".",'_')),
                        "amount_decimal": parseFloat(itemObject.price)*100,
                        "interval": orders.type,
                        "interval_count": orders.interval,
                        "currency": req.appSettings.payment_default_currency,
                        "product": {
                            "name" : itemObject.title+req.i18n.t(" User Subscription"),
                            //"description": itemObject.title,
                            //"image":(req.imageSuffix ? req.imageSuffix : process.env.PUBLIC_URL)+itemObject.image,
                            "type" : "service"
                        },
                        'metadata':{
                            'gateway_id': 2,
                            'package_id': id
                        }
                    })
                }
                await stripe.customers.create({
                    payment_method: payment_method,
                    email: email,
                    invoice_settings: {
                        default_payment_method: payment_method,
                    },
                },function(err, customer) {
                    if(err){
                        resolve()
                        res.send({ error: err.raw.message });
                    }else{
                        stripe.subscriptions.create({
                            customer: customer.id,
                            items: [{ plan: existingPlan.id }],
                            expand: ['latest_invoice.payment_intent'],
                            'metadata':{
                                'gateway_id': 2,
                                'order_id': req.session.orderId,
                                "type":"user_subscribe"
                            }
                        },function(err, subscription) {
                            if(err){
                                resolve()
                                res.send({ error: err.raw.message });
                            }else{                            
                                const status = subscription['latest_invoice']['payment_intent']['status'] 
                                const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']
                                if(status == "requires_action"){
                                    req.session.orderConfirmPackageID = resource_id
                                    req.session.orderConfirmPackagestate = "completed";
                                    req.session.orderConfirmPackagesid = subscription.id;
                                    res.json({'client_secret': client_secret, 'status': status});
                                }else{
                                    responseGateway.state = "completed";
                                    responseGateway.id = subscription.id;
                                    isValidResult = true;
                                }
                                resolve()
                            }
                        });                            
                    }
                });
            })
        }else{
            await recurringPaypal.execute(req, req.session.tokenUserPayment).then(async executeResult => {
                if (executeResult) {
                    responseGateway.state = "completed";
                    responseGateway.id = executeResult.id;
                    isValidResult = true;
                } else {
                    req.session.memberSubscriptionPaymentStatus = "fail"
                    if(req.query.type == "channel"){
                        res.redirect("/channel/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "blog"){
                        res.redirect("/blog/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "playlist"){
                        res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "audio"){
                        res.redirect("/audio/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "video"){
                        res.redirect("/watch/"+req.query.custom_url+"?type=plans")
                    }else{
                        res.redirect("/"+itemObject.username+"?type=plans")
                    }
                    res.end()
                }
            }).catch(_err => {
                req.session.memberSubscriptionPaymentStatus = "fail"
                res.redirect("/"+itemObject.username)
                res.end()
            }) 
        }

        if(isValidResult){
            let changed_expiration_date = await recurringPaypal.getExpirationDate(orders)

            //cancel subscription from gateway
            let memberSubscription = require("../functions/ipnsFunctions/channelSupportSubscriptions");
            req.memberUSERID = resource_id
            await memberSubscription.cancelAll({user_id:req.user.user_id,subscription_type:"user_subscribe"}, "User changed subscription plan.", null,req);
            // //cancel other active subscription
            await globalModel.custom(req,"UPDATE subscriptions SET status = ? WHERE owner_id = ? AND id = ?",["cancelled",req.user.user_id,resource_id]);
            // //cancel other active orders
            // await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
            req.memberUSERID = null
            //subscribe user

            let data = {}
            var dt = dateTime.create();
            var formatted = dt.format('Y-m-d H:M:S');
            data['type'] = "members"
            data['id'] = itemObject.owner_id
            data['owner_id'] = req.user.user_id
            data['creation_date'] = formatted
            await followModel.isFollowed(req,data.type,req.user.user_id,data.id).then(result => {
                if(result){
                    data['followId'] = result.follower_id   
                }
            })
            if(!data['followId']){
                await followModel.insert(data,req,res).then(result => {});
            }
            await globalModel.create(req, {gateway_id:gateway ? gateway : 1, type:"user_subscribe",id:itemObject.owner_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: resource_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async _result => {
                globalModel.update(req,{gateway_id:gateway ? gateway : 1,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase()},"orders","order_id",req.session.orderId)
                req.query.type = responseGateway.state.toLowerCase()
                if(!gateway){
                    req.session.memberSubscriptionPaymentStatus = "success"
                    if(req.query.type == "channel"){
                        res.redirect("/channel/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "blog"){
                        res.redirect("/blog/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "playlist"){
                        res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "audio"){
                        res.redirect("/audio/"+req.query.custom_url+"?type=plans")
                    }else if(req.query.type == "video"){
                        res.redirect("/watch/"+req.query.custom_url+"?type=plans")
                    }else{
                        res.redirect("/"+itemObject.username+"?type=plans")
                    }
                    res.end()
                }else{
                    res.send({status:true})
                }
            })
        }

    }
}
exports.cancelPlan = async (req,res) => {
    let resource_id = req.params.id
    let itemObject = {}
    await globalModel.custom(req, "SELECT member_plans.*, userdetails.username from member_plans LEFT JOIN userdetails ON userdetails.user_id = member_plans.owner_id where member_plan_id = ?",resource_id).then(result => {
        let item = JSON.parse(JSON.stringify(result));
        if(item && item.length > 0){
            itemObject = item[0] 
        } 
    }).catch(_err => {
        
    })
    if(Object.keys(itemObject).length == 0){
        res.redirect("/")
        res.end()
        return
    }
    //cancel subscription from gateway
    req.memberUSERID = itemObject.owner_id
    let memberSubscription = require("../functions/ipnsFunctions/channelSupportSubscriptions");
    await memberSubscription.cancelAll({user_id:req.user.user_id,subscription_type:"user_subscribe"}, "User changed subscription plan.", null,req);
    // //cancel other active subscription
    req.memberUSERID = null
   await globalModel.custom(req,"UPDATE subscriptions SET status = ? WHERE owner_id = ? AND id = ?",["cancelled",req.user.user_id,itemObject.owner_id]);
    // //cancel other active orders
    // await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
    // //subscribe user
    if(req.query.type == "channel"){
        res.redirect("/channel/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "blog"){
        res.redirect("/blog/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "playlist"){
        res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "audio"){
        res.redirect("/audio/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "video"){
        res.redirect("/watch/"+req.query.custom_url+"?type=plans")
    }else{
        res.redirect("/"+itemObject.username+"?type=plans")
    }
    res.end()
}
exports.finishPayment = async(req,res) => {
    let resource_id = req.session.orderConfirmPackageID
    let responseGateway = {}
    responseGateway.state = req.session.orderConfirmPackagestate;
    responseGateway.id = req.session.orderConfirmPackagesid
    let currentDate = dateTime.create().format("Y-m-d H:M:S")

    let packageObj = {}
    await globalModel.custom(req, "SELECT member_plans.*, userdetails.username from member_plans LEFT JOIN userdetails ON userdetails.user_id = member_plans.owner_id where member_plan_id = ?",resource_id).then(result => {
        let item = JSON.parse(JSON.stringify(result));
        if(item && item.length > 0){
            packageObj = item[0] 
        } 
    }).catch(_err => {
        
    })
    if (!resource_id || Object.keys(packageObj) == 0) {
       res.send({error: "error" })
       return;
    }
    packageObj.type = "month"
    packageObj.duration_type = "year"
    packageObj.duration = 100
    packageObj.interval = 1
    let changed_expiration_date = await recurringPaypal.getExpirationDate(packageObj)
    //cancel subscription from gateway
    let memberSubscription = require("../functions/ipnsFunctions/channelSupportSubscriptions");
    req.memberUSERID = resource_id
    await memberSubscription.cancelAll({user_id:req.user.user_id,subscription_type:"user_subscribe"}, "User changed subscription plan.", null,req);
    //cancel other active subscription
    await globalModel.custom(req,"UPDATE subscriptions SET status = ? WHERE owner_id = ? AND id = ?",["cancelled",req.user.user_id,resource_id]);
    // //cancel other active orders
    // await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
    req.memberUSERID = null
    let data = {}
    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d H:M:S');
    data['type'] = "members"
    data['id'] = packageObj.owner_id
    data['owner_id'] = req.user.user_id
    data['creation_date'] = formatted
    await followModel.isFollowed(req,data.type,req.user.user_id,data.id).then(result => {
        if(result){
            data['followId'] = result.follower_id   
        }
    })
    if(!data['followId']){
        await followModel.insert(data,req,res).then(result => {});
    }
    await globalModel.create(req, {gateway_id:2,type:"user_subscribe",id:packageObj.owner_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: resource_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async _result => {
        globalModel.update(req,{gateway_id:2,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase()},"orders","order_id",req.session.orderId)
        res.send({status:true});
    })
}
exports.cancel = async (req, res, _next) => {
    let resource_id = req.session.resource_id
    let orderID = req.session.orderId
    let itemObject = {}
    await globalModel.custom(req, "SELECT member_plans.*, userdetails.username from member_plans LEFT JOIN userdetails ON userdetails.user_id = member_plans.owner_id where member_plan_id = ?",orderID).then(result => {
        let item = JSON.parse(JSON.stringify(result));
        if(item && item.length > 0){
            itemObject = item[0]
        } else {
            resource_id = null
        }
    }).catch(_err => {
        resource_id = null
    })
    if (!resource_id || !req.session.tokenUserPayment || Object.keys(itemObject).length == 0) {
        if(req.query.type == "channel"){
            res.redirect("/channel/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "blog"){
            res.redirect("/blog/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "playlist"){
            res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "audio"){
            res.redirect("/audio/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "video"){
            res.redirect("/watch/"+req.query.custom_url+"?type=plans")
        }else{
            res.redirect("/"+itemObject.username+"?type=plans")
        }
        if (req.session.paypalData) {
            req.session.paypalData = null
        }
        res.end()
        return
    }
    req.session.tokenUserPayment = null
    if (req.session.paypalData) {
        req.session.paypalData = null
    }    

    if (!req.session.tokenUserPayment) {
        if(req.query.type == "channel"){
            res.redirect("/channel/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "blog"){
            res.redirect("/blog/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "playlist"){
            res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "audio"){
            res.redirect("/audio/"+req.query.custom_url+"?type=plans")
        }else if(req.query.type == "video"){
            res.redirect("/watch/"+req.query.custom_url+"?type=plans")
        }else{
            res.redirect("/"+itemObject.username+"?type=plans")
        }
        if (req.session.paypalData) {
            req.session.paypalData = null
        }
        res.end()
        return
    }
    req.session.tokenUserPayment = null
    if (req.session.paypalData) {
        req.session.paypalData = null
    }
    if (!resource_id) {
        res.send("/")
        res.end()
        return
    }
    req.session.memberSubscriptionPaymentStatus = "cancel"
    if(req.query.type == "channel"){
        res.redirect("/channel/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "blog"){
        res.redirect("/blog/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "playlist"){
        res.redirect("/playlist/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "audio"){
        res.redirect("/audio/"+req.query.custom_url+"?type=plans")
    }else if(req.query.type == "video"){
        res.redirect("/watch/"+req.query.custom_url+"?type=plans")
    }else{
        res.redirect("/"+itemObject.username+"?type=plans")
    }
    res.end()
    
}