import React from "react";
import { ElementsConsumer, CardElement } from "@stripe/react-stripe-js";

import CardSection from "./CardSection";
import Translate from "../../components/Translate/Index";
import axios from "../../axios-site";

class CheckoutForm extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            submitting:false
        }
    }
  handleSubmit = async event => {
    event.preventDefault();

    if(this.props.subscriptionPayment){
      this.handleSubmitSubscription(event);
      return;
    }

    const { stripe, elements } = this.props;
    if (!stripe || !elements) {
      return;
    }
    this.setState({submitting:true})
    const card = elements.getElement(CardElement);
    const result = await stripe.createToken(card);
    if (result.error) {
      this.setState({errorMessage:result.error.message,submitting:false});
    } else {
      //result.token
        let formData = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = this.props.tokenURL;
        formData.append("gateway",'2');
        formData.append("stripeToken",result.token.id);
        if(this.props.bank_price)
          formData.append("price",this.props.bank_price);
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    this.setState({errorMessage:response.data.error,submitting:false})
                } else {
                    this.props.success()
                }
            }).catch(err => {
                
            });
    }
  };
  handleSubmitSubscription = async (e) => {
    e.preventDefault();
    const { stripe, elements } = this.props;
    if (!stripe || !elements) {
      return;
    }
    const result = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: {
        email: this.props.pageInfoData.loggedInUserDetails.email,
      },
    });

    if (result.error) {
      this.setState({errorMessage:result.error.message,submitting:false})
    } else {
      this.setState({errorMessage:null,submitting:true})
      const res = await axios.post(this.props.tokenURL, {'payment_method': result.paymentMethod.id,gateway:"2"});
      // eslint-disable-next-line camelcase
      const {client_secret, status, error} = res.data;
      var _ = this;
      if(error){
        _.setState({errorMessage:error,submitting:false})
      }else if (status === 'requires_action') { 
        stripe.confirmCardPayment(client_secret).then(async function(result) {
          if (result.error) {
            _.setState({errorMessage:result.error.message,submitting:false})
          } else {
            const res = await axios.post(this.props.finishPayment);
            _.props.success();
          }
        });
      } else {
        this.props.success();
      }
    }
  };
  render() {
    return (
        <div className="popup_wrapper_cnt">
            <div className="popup_cnt">
                <div className="comments">
                    <div className="VideoDetails-commentWrap">
                        <div className="popup_wrapper_cnt_header">
                            <h2>{Translate(this.props, "Card Details")}</h2>
                            {
                                !this.state.submitting ? 
                                <a onClick={this.props.closePopup} className="_close"><i></i></a>
                            : null
                            }
                        </div>
                        {
                            this.state.errorMessage ?
                            <p className="error">
                                {Translate(this.props,this.state.errorMessage)}
                            </p>
                        : null
                        }
                        <form className="stripe-form" onSubmit={this.handleSubmit}>
                            <CardSection {...this.props} />
                            <button disabled={this.state.submitting} className="btn-pay">
                                {Translate(this.props,'Pay Now')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
  }
}

export default function InjectedCheckoutForm(props) {
  return (
    <ElementsConsumer>
      {({ stripe, elements }) => (
        <CheckoutForm {...props} stripe={stripe} elements={elements} />
      )}
    </ElementsConsumer>
  );
}