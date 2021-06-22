import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./StripeCheckoutForm";
import React from "react";

class Stripe extends React.Component{

    constructor(props) {
        super(props)    
        this.state = {
            promise:null
        }
    }

    componentDidMount(){
        this.setState(
            {
                promise:loadStripe(this.props.stripekey)
            }
        )
    }

    render(){
        if(!this.state.promise){
            return null
        }
        return (
            <Elements stripe={this.state.promise}>
                <CheckoutForm {...this.props} />
            </Elements>
        );
    }
}

export default Stripe;