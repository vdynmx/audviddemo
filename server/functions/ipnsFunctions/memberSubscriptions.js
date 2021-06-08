const globalModel = require("../../models/globalModel")
const nodeDate = require("node-datetime")
const emailFunction = require("../../functions/emails")
const recurringFunctions = require("../../functions/recurring-paypal")


exports.onSubscriptionTransactionIpn = async (req,params, order,subscription,transaction ) => {

    return new Promise(async function (resolve, reject) {
    let user = null
      let packageObj = null
  
      await globalModel.custom(req, "SELECT * FROM users LEFT JOIN userdetails ON userdetails.user_id = users.user_id WHERE users.user_id = ?", [order.owner_id]).then(result => {
        if (result) {
          const res = JSON.parse(JSON.stringify(result));
          user = res[0]
        } else {
          resolve(false)
        }
      })
      if (!Object.keys(user).length) {
        resolve(false)
      }
    await globalModel.custom(req, "SELECT * FROM packages WHERE package_id = ?", [subscription ? subscription.package_id : transaction.package_id]).then(result => {
      if (result) {
        const res = JSON.parse(JSON.stringify(result));
        packageObj = res[0]
      } else {
        resolve(false)
      }
    })
    switch(params.event_type) {
      case 'charge.refunded':
        exports.onRefund(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_refunded", owner: user })
          }
        });
      break;
      case 'customer.subscription.deleted':
        exports.onCancel(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_cancelled", owner: user })
          }
        });
        break
      case 'invoice.payment_failed':
        exports.onPaymentFailure(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_overdue", owner: user })
          }
        });
        break;
      //One-time donation
    case 'charge.succeeded':
    //Successful recurring payment
    case 'invoice.payment_succeeded':
      exports.onPaymentSuccess(req,order, subscription, transaction, packageObj, user).then(result => {
        if (result) {
          exports.sendEmail(req, { type: "payment_subscription_active", owner: user })
        }
      });
    break;
      case "PAYMENT.AUTHORIZATION.CREATED":
        // A payment authorization is created, approved, executed, or a future payment authorization is created.
        //silence
        break
      case "PAYMENT.AUTHORIZATION.VOIDED":
        // A payment authorization is voided.
        //silence
        break
      case "PAYMENT.CAPTURE.COMPLETED":
        // params['transaction_id'] = resource.id
        // params['state'] = resource.state == "approved" ? "completed" : resource.state.toLowerCase()
        
        switch (params['state'].toLowerCase()) {
          case 'created': // Not sure about this one
          case 'pending':
            // @todo this might be redundant
            exports.onPaymentSuccess(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_active", owner: user })
              }
            });
            break;
          case 'completed':
          case 'processed':
          case 'approved':
            exports.onPaymentSuccess(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_active", owner: user })
              }
            });
            // send notification
            break;
          case 'denied':
          case 'failed':
          case 'voided':
          case 'reversed':
            exports.onPaymentFailure(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_overdue", owner: user })
              }
            });
            break;
          case 'refunded':
            exports.onRefund(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_refunded", owner: user })
              }
            });
            break;
          case 'expired': // Not sure about this one
            exports.onExpiration(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_expired", owner: user })
              }
            });
            // send notification
            break;
          default:
            console.log('Unknown IPN payment status ' + rawData['payment_status']);
            resolve(false)
            break;
        }
        break
        case "PAYMENT.CAPTURE.REFUNDED":
          exports.onRefund(req,order, subscription, transaction, packageObj, user).then(result => {
            if (result) {
              exports.sendEmail(req, { type: "payment_subscription_refunded", owner: user })
            }
          });
        break;
      case "PAYMENT.CAPTURE.REVERSED":
      case "PAYMENT.CAPTURE.DENIED":
        exports.onPaymentFailure(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_overdue", owner: user })
          }
        });
      case "PAYMENT.CAPTURE.PENDING":
        exports.onPaymentPending(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_pending", owner: user })
          }
        });
      case "BILLING.SUBSCRIPTION.CANCELLED":
        //A billing agreement is canceled.
        // params['billing_agreement_id'] = resource.id
        // params['state'] = resource.state.toLowerCase()
        exports.onCancel(req,order, subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_cancelled", owner: user })
          }
        });
        break
      case "BILLING.SUBSCRIPTION.CREATED":
        //A billing agreement is created.	
        // params['billing_agreement_id'] = resource.id
        // params['state'] = resource.state.toLowerCase()
        //not sure @todo
        break
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
        //A billing agreement is re-activated.	
        // params['billing_agreement_id'] = resource.id
        // params['state'] = resource.state.toLowerCase()
        //not sure @todo
        
        break
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        //A billing agreement is suspended.	
        // params['billing_agreement_id'] = resource.id
        // params['state'] = resource.state.toLowerCase()
        exports.onPaymentSuspend(req, order,subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_suspend", owner: user })
          }
        });
        break
      case "BILLING.SUBSCRIPTION.UPDATED":
        //A billing agreement is updated.	
        // params['billing_agreement_id'] = resource.id
        // params['state'] = resource.state.toLowerCase()
        //not sure @todo
        break
      case "CUSTOMER.DISPUTE.CREATED":
        //A dispute is created.	
        // params['type'] = "dispute_created"
        // params['billing_agreement_id'] = resource.id
        // params['state']  = resource.status
        // params['transaction_id'] = resource.disputed_transactions.seller_transaction_id
        // params['disputed_message_buyer'] = resource.messages[resource.messages.length - 1].content
        //send email of dispute
        exports.onPaymentDispute(req, order,subscription, transaction, packageObj, user,params['disputed_message_buyer']).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_disputecreate", owner: user })
          }
        });
        break
      case "CUSTOMER.DISPUTE.RESOLVED":
        //A dispute is resolved.	
        // params['type'] = "dispute_resolved"
        // params['billing_agreement_id'] = resource.id
        // params['state']  = resource.status
        // params['transaction_id'] = resource.disputed_transactions.seller_transaction_id
        // params['disputed_message_buyer'] = resource.messages[resource.messages.length - 1].content
        //send email of dispute resolved
        exports.onPaymentSuccess(req, order,subscription, transaction, packageObj, user,true).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_disputeclear", owner: user })
          }
        });
        break
      case "CUSTOMER.DISPUTE.UPDATED":
        //A dispute is updated.	
        // params['type'] = "dispute_updated"
        // params['billing_agreement_id'] = resource.id
        // params['state']  = resource.status
        // params['transaction_id'] = resource.disputed_transactions.seller_transaction_id
        // params['disputed_message_buyer'] = resource.messages[resource.messages.length - 1].content
        if(transaction)
            globalModel.update(req, {state:"dispute",note:"concat(ifnull(note,''), "+params['disputed_message_buyer']+")"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
        //send email of dispute updated
        break
      case "PAYMENT.SALE.PENDING":
        // The state of a sale changes to pending.
        // params['billing_agreement_id'] = resource.billing_agreement_id
        // params['state'] = resource.state
        exports.onPaymentPending(req, order,subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_pending", owner: user })
          }
        });
        break
      case "PAYMENT.SALE.DENIED":
      case "PAYMENT.SALE.REFUNDED":
      case "PAYMENT.SALE.REVERSED":
        // A merchant refunds a sale
        // or PayPal reverses a sale.
        // params['billing_agreement_id'] = resource.billing_agreement_id
        // params['state'] = resource.state
        exports.onPaymentFailure(req, order,subscription, transaction, packageObj, user).then(result => {
          if (result) {
            exports.sendEmail(req, { type: "payment_subscription_overdue", owner: user })
          }
        });
        break
      case "PAYMENT.SALE.COMPLETED":
        // A sale completes.
        // params['billing_agreement_id'] = resource.billing_agreement_id
        // params['state'] = resource.state
        
        // if(resource.state !== "completed") {
        //   //'Forbidden: Payment is not completed yet.'
        // }
        
        switch (params['state'].toLowerCase()) {
          case 'created': // Not sure about this one
          case 'pending':
            // @todo this might be redundant
            exports.onPaymentSuccess(req,order, subscription, transaction, packageObj, user);
            break;
          case 'completed':
          case 'processed':
          case 'approved':
            exports.onPaymentSuccess(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_recurrence", owner: user })
              }
            });
            // send notification
            break;
          case 'denied':
          case 'failed':
          case 'voided':
          case 'reversed':
            exports.onPaymentFailure(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_overdue", owner: user })
              }
            });
            break;
          case 'refunded':
            exports.onRefund(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_refunded", owner: user })
              }
            });
            break;
          case 'expired': // Not sure about this one
            exports.onExpiration(req,order, subscription, transaction, packageObj, user).then(result => {
              if (result) {
                exports.sendEmail(req, { type: "payment_subscription_expired", owner: user })
              }
            });
            // send notification
            break;
          default:
            console.log('Unknown IPN payment status ' + rawData['payment_status']);
            resolve(false)
            break;
        }
      break;
      default:
        //silence
      break   
    }
    resolve(true)
  });
  
  }
  
  exports.paymentState = async (req,data) => {
    return new Promise(async function (resolve, reject) {
      let state = "pending"
      switch (rawData['state'].toLowerCase()) {
        case 'completed':
        case 'created':
        case 'processed':
        case 'approbed':
          state = 'completed';
          break;
        case 'denied':
        case 'expired':
        case 'failed':
        case 'voided':
          state = 'failed';
          break;
  
        case 'pending':
          state = 'pending';
          break;
  
        case 'refunded':
          state = 'redund';
          break;
        case 'reversed':
          state = 'reversed';
          break;
  
        default:
          state = 'unknown';
          break;
      }
      resolve(state)
    })
  }
  
  
  exports.sendEmail = async (req, data) => {
    globalModel.custom(req, "SELECT vars,type FROM emailtemplates WHERE type = ?", [data.type]).then(resultsType => {
      if (resultsType) {
        const typeData = JSON.parse(JSON.stringify(resultsType))[0];
        let result = {}
        result.vars = typeData.vars
        result.type = typeData["type"]
        result.ownerEmail = data.owner
        result.toName = data.owner.displayname
        result.toEmail = data.owner.email
        emailFunction.sendMessage(req, result)
      }
    });
  }
  exports.getSubscription = async (req, order) => {
    // Check that gateways match
    return new Promise(async function (resolve, reject) {
      if (order.source_type == "member_subscription") {
        globalModel.custom(req, "SELECT * FROM subscriptions WHERE subscription_id = ?", [order.source_id]).then(result => {
          if (result) {
            const res = JSON.parse(JSON.stringify(result));
            resolve(res[0])
          } else {
            resolve(false)
          }
        })
      } else {
        resolve(false)
      }
    })
  }
  
  exports.cancelAll = async (user, note = null, subscription = null,req) => {
    return new Promise(async function (resolve, reject) {
      let condition= []
      let sql = "SELECT subscription_id,gateway_profile_id,gateway_id FROM subscriptions WHERE owner_id = ? AND (status = 'active' || status = 'completed') ";
      condition.push(user['user_id']);
      if (subscription) {
        condition.push(subscription.subscription_id)
        sql += " AND subscription_id = ?"
      }
      condition.push("member_subscription")
      sql += " AND subscriptions.type = ?"
      globalModel.custom(req, sql, condition).then(results => {
        const res = JSON.parse(JSON.stringify(results));
        if (res && res.length) {
          res.forEach(data => {
            if(data.gateway_id == 2){
              recurringFunctions.cancelStripe(req, data['gateway_profile_id'], note).then(res => {}).catch(err => {})
            }else if(data.gateway_id == 1){
              recurringFunctions.cancel(req, data['gateway_profile_id'], note).then(res => {}).catch(err => {})
            }
          });
        }
      })
      resolve();
    })
  }
  exports.downgradeUser = (req, user, packageObj) => {
    if (!user ||
      !user.level_id) {
      return user;
    }
    if (user.level_id != packageObj.downgrade_level_id) {
      globalModel.update(req, { level_id: packageObj.downgrade_level_id }, "users", "user_id", user['user_id']).then(res => {}).catch(err => {})
    }
  }
  exports.upgradeUser = (req, user, packageObj) => {
    if (!user ||
      !user.level_id) {
      return user;
    }
    if (user.level_id != packageObj.level_id) {
      globalModel.update(req, { level_id: packageObj.level_id }, "users", "user_id", user['user_id']).then(res => {}).catch(err => {})
    }
  }
  exports.onPaymentSuccess = async (req,order, subscription, transaction, packageObj, user,dispute = false) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed") || (transaction || (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed")))) {
        // cancel any other active subscriptions
        if (subscription && (subscription['status'] == "initial" ||  subscription['status'] == "pending")) {
          if (packageObj.is_recurring && subscription && !dispute)
            exports.cancelAll(user, "User cancelled the subscription.", subscription,req)
        }
        let updatedData = {}
        // Update expiration to expiration + recurrence or to now + recurrence?
        let expiration = null
        if (packageObj.is_recurring) {
           expiration = await recurringFunctions.getExpirationDate(packageObj)
           if(subscription && subscription.gateway_id == 1){
            let planExpirationDate = await recurringFunctions.planExpirationDate(packageObj,subscription.creation_date)
            //check plan exires
            if(planExpirationDate){
              let planExpireDate = new Date(planExpirationDate);
              let currentDate = new Date();
              if(planExpireDate.getTime() <= currentDate.getTime()){
                //expire plan
                await exports.cancelAll(user, req.i18n.t("Package plan completed."),null,req);
              }
            }
          }
        }
        if (expiration && !dispute) {
          updatedData['expiration_date'] = nodeDate.create(expiration).format("Y-m-d H:M:S")
        }
        // Change status
        if (subscription['status'] != 'completed') {
          updatedData['status'] = 'completed';
          changedData = true;
          if(transaction)
          globalModel.update(req, {state:"completed"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"completed"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})
        }
        // Update user if active
        exports.upgradeUser(req, user, packageObj);
        
      }
      resolve(changedData)
    });
  }
  
  
  exports.onPaymentPending = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed") || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed")))) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "pending") || (transaction && transaction['state'] != "pending")) {
          
          updatedData['status'] = "pending"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"pending"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"pending"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})
          
          exports.downgradeUser(req,user,packageObj)
        }
        
      }
      resolve(changedData)
    });
  }
  
  exports.onPaymentFailure = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "overdue") || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "overdue")))) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "overdue") || (transaction && transaction['state'] != "overdue")) {
          
          updatedData['status'] = "overdue"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"overdue"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"overdue"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})        
          
            exports.downgradeUser(req,user,packageObj)
       }
        
      }
      resolve(changedData)
    });
  }
  
  exports.onCancel = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "overdue" || subscription['status'] == "cancelled")) || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "overdue" || transaction['state'] == "cancelled"))) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "cancelled") || (transaction && transaction['state'] != "cancelled")) {
          
          updatedData['status'] = "cancelled"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"cancelled"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"cancelled"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})   
           
          exports.downgradeUser(req,user,packageObj)
  
        }
        
      }
      resolve(changedData)
    });
  }
  
  exports.onExpiration = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "overdue" || subscription['status'] == "expired")) || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "overdue" || transaction['state'] == "expired"))) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "expired") || (transaction && transaction['state'] != "expired")) {
          
          updatedData['status'] = "expired"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"expired"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"expired"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})   
          exports.downgradeUser(req,user,packageObj)   
        }
        
      }
      resolve(changedData)
    });
  }
  exports.onRefund = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" || subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "refunded")) || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" || transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "refunded")) ) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "refunded") || (transaction && transaction['state'] != "refunded")) {
          
          updatedData['status'] = "refunded"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"refunded"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"refunded"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})   
          exports.downgradeUser(req,user,packageObj)   
        }
        
      }
      resolve(changedData)
    });
  }
  
  exports.onPaymentSuspend = async (req,order, subscription, transaction, packageObj, user) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" ||  subscription['status'] == "dispute" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "refunded")) || (transaction && (transaction['state'] == "initial" ||  transaction['state'] == "dispute" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "refunded")) ) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "suspend") || (transaction && transaction['state'] != "suspend")) {
          
          updatedData['status'] = "suspend"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"suspend"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"suspend"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})   
          exports.downgradeUser(req,user,packageObj)   
        }
        
      }
      resolve(changedData)
    });
  }
  
  exports.onPaymentDispute = async(req, order,subscription, transaction, packageObj, user,message) => {
    return new Promise(async function (resolve, reject) {
      let changedData = false;
      if ((subscription && (subscription['status'] == "initial" || subscription['status'] == "suspend" ||  subscription['status'] == "trial" || subscription['status'] == "pending" || subscription['status'] == "completed" || subscription['status'] == "refunded")) || (transaction && (transaction['state'] == "initial" || transaction['state'] == "suspend" ||  transaction['state'] == "trial" || transaction['state'] == "pending" || transaction['state'] == "completed" || transaction['state'] == "refunded")) ) {
        
        let updatedData = {}
        if ((subscription && subscription['status'] != "dispute") || (transaction && transaction['state'] != "dispute")) {
          
          updatedData['status'] = "dispute"
          changedData = true
          if(transaction)
            globalModel.update(req, {state:"dispute",note:"concat(ifnull(note,''), "+message+")"}, "transactions", 'transaction_id', transaction.transaction_id).then(result => {}).catch(err => {})
          globalModel.update(req, {state:"dispute"}, "orders", 'order_id', order.order_id).then(result => {}).catch(err => {})
          if(subscription)
            globalModel.update(req, updatedData, "subscriptions", 'subscription_id', subscription.subscription_id).then(result => {}).catch(err => {})   
          exports.downgradeUser(req,user,packageObj)   
        }
        
      }
      resolve(changedData)
    });
  }