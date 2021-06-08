const express = require('express');
const router = express.Router();
const controller = require("../controllers/ipn")
router.use('/payment/IPN',(req,res,next) => {
    req.paypalIPN = true;
    next();
},controller.index);
router.use('/payment/stripeIPN',express.raw({type: 'application/json'}),(req,res,next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = req.appSettings['payment_stripe_webhook_key']
    let stripe = require('stripe')(req.appSettings['payment_stripe_client_secret']);
    try {
         req.Stripeevent = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
      } catch (err) {
        // On error, log and return the error message
        console.log(`❌ Error message: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    req.stripeIPN = true;
    next();
},controller.index);

module.exports = router;