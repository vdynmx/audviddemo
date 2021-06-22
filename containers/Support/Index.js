import React from "react"
import { connect } from "react-redux";
import Translate from "../../components/Translate/Index"
import ReactDOMServer from "react-dom/server"
import Currency from "../Upgrade/Currency"
import swal from 'sweetalert'
import Gateways from "../Gateways/Index"
import Router from "next/router"

class Index extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            item: props.item,
            item_type:props.item_type,
            item_id:props.item_id,
            channelPaymentStatus: props.pageData.channelPaymentStatus,
            isSupported:props.pageInfoData.userSupportChannel,
            gateways:null
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }
        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        } else {
            return {item:nextProps.item,item_type:nextProps.item_type,gateways:false}
        } 
    }
    componentDidMount(){
        if (this.state.channelPaymentStatus) {
            if (this.state.channelPaymentStatus == "success") {
                swal("Success", Translate(this.props, "Channel Support subscription done successfully.", "success"));
            } else if (this.state.channelPaymentStatus == "fail") {
                swal("Error", Translate(this.props, "Something went wrong, please try again later", "error"));
            } else if (this.state.channelPaymentStatus == "cancel") {
                swal("Error", Translate(this.props, "You have cancelled the Channel Support subscription.", "error"));
            }
        }
    } 
    submitType = () => {
        //swal("Success", Translate(this.props, "Redirecting you to payment gateway...", "success"));
        this.setState({localUpdate:true,gateways:true,gatewaysURL:"/support/successulPayment/"+this.state.item_id+"/"+this.state.item_type,payPalURL:"/support/"+this.state.item_id+"/"+this.state.item_type});
        //window.location.href = "/support/"+this.state.item_id+"/"+this.state.item_type;
    }
    openSupportForm = (e) => {
        e.preventDefault();
        if (this.props.pageInfoData && !this.props.pageInfoData.loggedInUserDetails) {
            document.getElementById('loginFormPopup').click();
        }else if(this.state.isSupported){
            swal("Success", Translate(this.props, "You are already supporting this channel.", "success"));
        } else {
            if(this.state.item.owner_id == this.props.pageInfoData.loggedInUserDetails.user_id){
                return;
            }
            swal({
                title: Translate(this.props, "Are you sure?"),
                text: Translate(this.props, "Are you sure want to support!"),
                icon: "warning",
                buttons: true,
                dangerMode: true,
            })
            .then((allowed) => {
                if (allowed) {
                    this.submitType();
                } else {

                }
            });
        }
    }
    render() {
        if(parseFloat(this.state.item.channel_subscription_amount) <= 0){
            return null
        }
        let gatewaysHTML = ""

        if(this.state.gateways){
            gatewaysHTML = <Gateways {...this.props} success={() => {
                this.props.openToast(Translate(this.props, "Payment done successfully."), "success");
                setTimeout(() => {
                    Router.push(`/channel?channelId=${this.state.item.custom_url}`, `/channel/${this.state.item.custom_url}`)
                  },1000);
            }} successBank={() => {
                this.props.openToast(Translate(this.props, "Your bank request has been successfully sent, you will get notified once it's approved"), "success");
                this.setState({localUpdate:true,gateways:null})
            }} payPalURL={this.state.payPalURL} finishPayment="/support/finishPayment" bank_price={this.state.item.channel_subscription_amount} subscriptionPayment={true} bank_type="channel_subscription" bank_resource_type="channel" bank_resource_id={this.state.item.custom_url} tokenURL={`${this.state.gatewaysURL}`} closePopup={() => this.setState({localUpdate:true,gateways:false})} gatewaysUrl={this.state.gatewaysURL} />
        }
        let perprice = {}
        perprice['package'] = { price: parseFloat(this.state.item.channel_subscription_amount).toFixed(2) }
        let amount = this.props.t("Support: Pay {{price}} per month",{price:ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } {...perprice} />)})
        return (
            <React.Fragment>
                {gatewaysHTML}
                <a className={"active follow fbold"}  href="#" onClick={this.openSupportForm}>{amount}</a>
            </React.Fragment>
        )
    }
}
const mapStateToProps = state => {
    return {
        pageInfoData: state.general.pageInfoData
    };
};


export default connect(mapStateToProps, null)(Index)
