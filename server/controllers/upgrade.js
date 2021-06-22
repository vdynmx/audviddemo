const commonFunction = require("../functions/commonFunctions")
const packageModel = require("../models/packages")
const recurringPaypal = require("../functions/recurring-paypal")
const oneTimePaypal = require("../functions/one-time-paypal")
const globalModel = require("../models/globalModel")
const dateTime = require("node-datetime")
exports.browse = async (req, res) => {
    let package_id = req.params.package_id
    let packageObj = {}
    if (package_id) { 
        await packageModel.findById(package_id, req, res).then(result => {
            if (result) {
                packageObj = result
            } else {
                package_id = null
            }
        }).catch(err => {
            package_id = null
        })
    }
    req.getPackages = true
    if (package_id) {
        req.session.orderId = null
        //delete all user pending orders
        await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(result => {
           
        })
        let currentDate = dateTime.create().format("Y-m-d H:M:S")
        //create order
        await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: 1, state: "initial", creation_date: currentDate, source_type: "subscription", source_id: 0 }, "orders").then(result => {
            if (result) {
                req.session.orderId = result.insertId
            } else {

            }
        })
        if (!req.session.orderId) {
            res.redirect("/upgrade")
            res.end()
            return
        }
        await commonFunction.getGeneralInfo(req, res, 'upgrade_browse', true)
        const data = {}
        data["amount"] = parseFloat(packageObj.price).toFixed(2)
        data['id'] = packageObj.package_id
        data["description"] = packageObj.description
        data["headingTitle"] = packageObj.title
        data["returnUrl"] = `${process.env.PUBLIC_URL}/upgrade/successulPayment`
        data["cancelUrl"] = `${process.env.PUBLIC_URL}/upgrade/cancelPayment`
        data.frequency = packageObj.type
        data.interval = packageObj.interval
        data.sku = "order_"+req.session.orderId
        data.title = packageObj.title
        if (packageObj.is_recurring == 1) { 
            return recurringPaypal.init(req, res, data,packageObj).then(result => {
                if (result.url) {
                    req.session.package_id = package_id
                    req.session.tokenUserPayment = result.token
                    res.redirect(302, result.url)
                } else {
                    res.redirect("/upgrade")
                }
            }).catch(err => {
                console.log(err, ' ======= Upgrade RECURRING ERR ============')
                return res.redirect("/upgrade")
            })
        } else {
            return oneTimePaypal.init(req, res, data).then(result => {
                if (result.url) {
                    req.session.package_id = package_id
                    req.session.tokenUserPayment = result.token
                    res.redirect(302, result.url)
                    res.end()
                } else {
                    res.redirect("/upgrade")
                    res.end()
                }
            }).catch(err => {
                console.log(err, ' ======= Upgrade ONETIME ERR ============')
                res.redirect("/upgrade")
                res.end()
            })
        }
    } else {
        await commonFunction.getGeneralInfo(req, res, 'upgrade_browse')
    }
    
    if (req.query.data) {
        if(!req.query.packagesExists){
            res.send({data: req.query,pagenotfound:1});
            return
        }
        res.send({ data: req.query })
        res.end()
        return
    }
    if(!req.query.packagesExists){
        req.app.render(req, res, '/page-not-found', req.query);
        return
    }
    req.app.render(req, res, '/upgrade', req.query)
}

exports.successul = async (req, res, next) => {

    let package_id = req.params.id
    let gateway = req.body.gateway
    let currentDate = dateTime.create().format("Y-m-d H:M:S")

    if (!gateway && (!req.session.tokenUserPayment || !req.session.package_id || !req.session.orderId) ) {
        return res.redirect(302, '/upgrade')
    } else {
        package_id = package_id ? package_id : req.session.package_id
        let packageObj = {}
        await packageModel.findById(package_id, req, res).then(result => {
            if (result) {
                packageObj = result
            } else {
                package_id = null
            }
        }).catch(err => {
            package_id = null
        })
        if (!package_id) {
            res.send("/upgrade")
            res.end()
        }
        if(gateway && gateway == "2"){
            req.session.orderId = null
            //delete all user pending orders
            await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(result => {
            
            })
            //create order
            await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: gateway ? gateway : 1, state: "initial", creation_date: currentDate, source_type: "subscription", source_id: 0 }, "orders").then(result => {
                if (result) {
                    req.session.orderId = result.insertId
                } else {

                }
            })
        }
        let responseGateway = {}
        let isValidResult = false;
        if (packageObj.is_recurring == 1) {
            
            if(gateway == "2"){
                const { payment_method} = req.body;
                const email = req.user.email
                const stripe = require('stripe')(req.appSettings['payment_stripe_client_secret']);

                await new Promise(async function(resolve, reject){
                    
                    //create plan
                    let existingPlan = null;
                    await new Promise(async function(resolve, reject){
                        stripe.plans.retrieve(
                            "package_"+packageObj.package_id
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
                            "id":"package_"+packageObj.package_id,
                            "amount_decimal": parseFloat(packageObj.price)*100,
                            "interval": packageObj.type,
                            "interval_count": packageObj.interval,
                            "currency": req.appSettings.payment_default_currency,
                            "product": {
                                "name" : packageObj.title,
                                "type" : "service"
                            },
                            'metadata':{
                                'gateway_id': 2,
                                'package_id': packageObj.package_id
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
                                    "type":"member_subscription"
                                }
                            },function(err, subscription) {
                                if(err){
                                    resolve()
                                    res.send({ error: err.raw.message });
                                }else{                            
                                    const status = subscription['latest_invoice']['payment_intent']['status'] 
                                    const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']
                                    if(status == "requires_action"){
                                        req.session.orderConfirmPackageID = package_id
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
                            responseGateway.id = executeResult.id
                            responseGateway.state = executeResult.state
                            isValidResult = true;
                        } else {
                            res.redirect("/upgrade/fail")
                            res.end()
                        }
                    }).catch(err => {
                        res.redirect("/upgrade")
                        res.end()
                    }) 
            }
            if(isValidResult){
                let changed_expiration_date = await recurringPaypal.getExpirationDate(packageObj)
                //cancel subscription from gateway
                let memberSubscription = require("../functions/ipnsFunctions/memberSubscriptions");
                await memberSubscription.cancelAll(req.user, "User changed subscription plan.",null,req);
                //cancel other active subscription
                await globalModel.update(req,{status:"cancelled"},"subscriptions","owner_id",req.user.user_id)
                //cancel other active orders
                await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
                 
                await globalModel.create(req, {gateway_id:gateway ? gateway : 1,type:"member_subscription",id:req.user.user_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: package_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async result => {
                    globalModel.update(req,{gateway_id:gateway ? gateway : 1,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase(),'source_id':result.insertId},"orders","order_id",req.session.orderId)
                    req.query.type = responseGateway.state.toLowerCase()
                    if(!gateway){
                        res.redirect("/upgrade/success")
                        res.end()
                    }else{
                        res.send({status:true})
                    }
                    
                })
            }
        } else {
            if(gateway == "2"){
                const stripe = require('stripe')(req.appSettings['payment_stripe_client_secret']);
                let stripeToken = req.body.stripeToken
                await new Promise(function(resolve, reject){
                    stripe.customers.create({
                        source: stripeToken,
                        email: req.user.email,
                    },function(err, customer) {
                        if(err){
                            resolve()
                            res.send({ error: err.raw.message });
                        }else{
                            stripe.charges.create({
                                amount: parseFloat(packageObj.price)*100,
                                currency: req.appSettings['payment_default_currency'],
                                description: packageObj.title,
                                customer: customer.id,
                                metadata: {
                                    'gateway_id': 2,
                                    'order_id': req.session.orderId,
                                    "type":"member_subscription"
                                }
                            },function(err, charge) {
                                if(err) {
                                    res.send({ error: err.raw.message });
                                    resolve()
                                }
                                else {
                                    responseGateway.state = "completed";
                                    responseGateway.id = charge.id;
                                    responseGateway.gateway_transaction_id = charge.id
                                    isValidResult = true;
                                    resolve()
                                }
                            })
                        }
                    });
                })
            }else{
                const PayerID = req.query.PayerID
                await oneTimePaypal.execute(req, res, PayerID, packageObj).then(async executeResult => {
                    if (executeResult) {
                        responseGateway.gateway_transaction_id = req.session.paypalData.id
                        responseGateway.state = "completed";
                        responseGateway.id = executeResult.transaction_id;
                        isValidResult = true;

                    } else {
                        res.redirect("/upgrade/fail")
                        res.end()
                    }                
                }).catch(err => {
                    console.log(err)
                    res.redirect("/upgrade")
                    res.end()
                })
            }

            if(isValidResult){
                 //cancel subscription from gateway
                 let memberSubscription = require("../functions/ipnsFunctions/memberSubscriptions");
                 await memberSubscription.cancelAll(req.user, "User changed subscription plan.",null,req);
                //cancel other active subscription
                await globalModel.update(req,{status:"cancelled"},"subscriptions","owner_id",req.user.user_id)
                //cancel other active orders
                await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)
                
                let changed_expiration_date = await recurringPaypal.getExpirationDate(packageObj)
                await globalModel.create(req, {gateway_id:gateway ? gateway : 1, type:"member_subscription",id:req.user.user_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: package_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async result => {
                    await globalModel.create(req, {package_id:package_id,type:"member_subscription",id:req.user.user_id,gateway_id:gateway ? gateway : 1, gateway_transaction_id: responseGateway.id, owner_id: req.user.user_id, order_id: req.session.orderId, state: responseGateway.state.toLowerCase(), price: packageObj.price, currency: req.appSettings.payment_default_currency, creation_date: currentDate, modified_date: currentDate,subscription_id:result.insertId }, "transactions").then(async result => {
                        globalModel.update(req,{gateway_transaction_id:responseGateway.gateway_transaction_id,state:responseGateway.state.toLowerCase(),'source_id':result.insertId},"orders","order_id",req.session.orderId)
                        if(!gateway){
                            req.query.type = responseGateway.state.toLowerCase()
                            res.redirect("/upgrade/success")
                            res.end()
                        }else{
                            res.send({status:true})
                        }
                    })
                })
            }

        }
    }
}
exports.finishPayment = async(req,res) => {
    let package_id = req.session.orderConfirmPackageID
    let responseGateway = {}
    responseGateway.state = req.session.orderConfirmPackagestate;
    responseGateway.id = req.session.orderConfirmPackagesid
    let currentDate = dateTime.create().format("Y-m-d H:M:S")

    let packageObj = {}
    await packageModel.findById(package_id, req, res).then(result => {
        if (result) {
            packageObj = result
        } else {
            package_id = null
        }
    }).catch(err => {
        package_id = null
    })
    if (!package_id) {
       res.send({error: "error" })
       return;
    }
     //cancel subscription from gateway
    let memberSubscription = require("../functions/ipnsFunctions/memberSubscriptions");
    await memberSubscription.cancelAll(req.user, "User changed subscription plan.",null,req);
    //cancel other active subscription
    await globalModel.update(req,{status:"cancelled"},"subscriptions","owner_id",req.user.user_id)
    //cancel other active orders
    await globalModel.update(req,{state:"cancelled"},"orders","owner_id",req.user.user_id)    
    let changed_expiration_date = await recurringPaypal.getExpirationDate(packageObj)
    await globalModel.create(req, {gateway_id:2,type:"member_subscription",id:req.user.user_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: package_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async result => {
        globalModel.update(req,{gateway_id:2,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase(),'source_id':result.insertId},"orders","order_id",req.session.orderId)
        res.send({status:true});
    })
}
exports.paymentSuccessul = async (req, res, next) => {
    await commonFunction.getGeneralInfo(req, res, 'payment_success')
    if(!req.query.type)
        req.query.type = "completed"
    if (req.query.data) {
        res.send({ data: req.query })
        res.end()
        return
    }
    req.app.render(req, res, '/payment-state', req.query)
}
exports.paymentFail = async (req, res, next) => {
    await commonFunction.getGeneralInfo(req, res, 'payment_fail')
    if(!req.query.type)
        req.query.type = "failed"
    if (req.query.data) {
        res.send({ data: req.query })
        res.end()
        return
    }
    req.app.render(req, res, '/payment-state', req.query)
}
exports.cancel = (req, res, next) => {
    if (!req.session.tokenUserPayment) {
        res.redirect("/upgrade")
        if (req.session.paypalData) {
            req.session.paypalData = null
        }
        res.end()
    }
    req.session.tokenUserPayment = null
    if (req.session.paypalData) {
        req.session.paypalData = null
    }
    return res.redirect(302, '/upgrade')
}