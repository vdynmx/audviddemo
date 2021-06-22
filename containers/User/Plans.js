import React from "react"
import ReactDOMServer from "react-dom/server"
import Currency from "../Upgrade/Currency"
import Plan from "../Form/Plan"
import swal from 'sweetalert'
import Translate from "../../components/Translate/Index"
import axios from "../../axios-orders"
import Gateways from "../Gateways/Index"
import Router  from "next/router"

class Plans extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            plans:props.plans,
            user_id:props.user_id,
            createPlan:false,
            plan:null,
            member:props.member,
            userSubscriptionID:props.userSubscriptionID,
            userSubscription:props.userSubscription,
            gateways:null,
            memberSubscriptionPaymentStatus: props.pageData.memberSubscriptionPaymentStatus,
            itemObj: props.itemObj,
            userPrifile:props.userPrifile
        }
        this.editPlan = this.editPlan.bind(this)
    }
    componentDidMount(){
        if (this.state.memberSubscriptionPaymentStatus && !this.state.userPrifile) {
            if (this.state.memberSubscriptionPaymentStatus == "success") {
                swal("Success", Translate(this.props, "Subscription payment done successfully.", "success"));
            } else if (this.state.memberSubscriptionPaymentStatus == "successFree") {
                swal("Success", Translate(this.props, "Subscription done successfully.", "success"));
            } else if (this.state.memberSubscriptionPaymentStatus == "fail") {
                swal("Error", Translate(this.props, "Something went wrong, please try again later", "error"));
            } else if (this.state.memberSubscriptionPaymentStatus == "cancel") {
                swal("Error", Translate(this.props, "You have cancelled the subscription payment.", "error"));
            }
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }

        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        } else if (nextProps.plans != prevState.plans) {
            return {
                plans:nextProps.plans,
                itemObj:nextProps.itemObj,
                user_id:nextProps.user_id,
                createPlan:false,plan:null,
                member:nextProps.member,
                userSubscriptionID:nextProps.userSubscriptionID,
                userSubscription:nextProps.userSubscription,
                gateways:null,
                memberSubscriptionPaymentStatus: nextProps.pageInfoData.memberSubscriptionPaymentStatus,
                userPrifile:nextProps.userPrifile
            }
        } else{
            return null
        }

    }
    create = () => {
        this.setState({createPlan:true});
    }
    editPlan = (id,e) => {
        this.setState({createPlan:true,plan:this.state.plans[this.getItemIndex(id)]});
    }
    getItemIndex(item_id) {
        const plans = [...this.state.plans];
        const itemIndex = plans.findIndex(p => p["member_plan_id"] == item_id);
        return itemIndex;
    }
    closePopup = (data,type) => {
        if(type){
            let plans = [...this.state.plans]
            if(type == "create"){
                plans.unshift(data);
            }else{
                let index = this.getItemIndex(this.state.plan.member_plan_id)
                if(index > -1){
                    plans[index] = data
                }
            }
            this.props.onChangePlan(plans);
        }else{
            this.setState({createPlan:false,plan:null})
        }
    }
    deletePlan = (id,e) => {
        e.preventDefault()
        swal({
            title: Translate(this.props, "Are you sure?"),
            text: Translate(this.props, "Once deleted, you will not be able to recover this plan and all existing user in this plan will be switch in free plan and content created with this plan switched to everyone privacy!"),
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
        .then((willDelete) => {
            if (willDelete) {
                const formData = new FormData()
                formData.append('plan_id', id)
                const url = "/members/plan-delete"
                axios.post(url, formData)
                    .then(response => {
                        if (response.data.error) {
                            swal("Error", Translate(this.props, "Something went wrong, please try again later"), "error");
                        } else {
                            let plans = [...this.state.plans]
                            const itemIndex = this.getItemIndex(response.data.member_plan_id)
                            if (itemIndex > -1) {
                                plans.splice(itemIndex, 1);
                            }
                            this.props.deletePlan(Translate(this.props, response.data.message),plans);
                        }
                    }).catch(err => {
                        swal("Error", Translate(this.props, "Something went wrong, please try again later"), "error");
                    });
                //delete
            } else {

            }
        });
    }
    freePlan = () => {
        swal({
            title: Translate(this.props, "Are you sure?"),
            text: Translate(this.props, "Sure want to choose free plan, if you choose yes then your current plan will be cancelled."),
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
        .then((willDelete) => {
            if (willDelete) {
                this.freePlanRedirect();
            } else {

            }
        });
    }
    freePlanRedirect = () => {
        let id = this.state.choosenPlanID
        let url = "/subscription/successulPayment/"+id+"?gateway=10"
        if(this.state.itemObj && this.state.itemObj.channel_id){
            url = url+"&type=channel&custom_url="+this.state.itemObj.custom_url
        }else if(this.state.itemObj && this.state.itemObj.blog_id){
            url = url+"&type=blog&custom_url="+this.state.itemObj.custom_url
        }else if(this.state.itemObj && this.state.itemObj.playlist_id){
            url = url+"&type=playlist&custom_url="+this.state.itemObj.custom_url
        }else if(this.state.itemObj && this.state.itemObj.audio_id){
            url = url+"&type=audio&custom_url="+this.state.itemObj.custom_url
        }else if(this.state.itemObj && this.state.itemObj.video_id){
            url = url+"&type=video&custom_url="+this.state.itemObj.custom_url
        }
        window.location.href = url
        return;
    }
    subscribeNow = (id,planPrice,e) => {

        if (this.props.pageInfoData && !this.props.pageInfoData.loggedInUserDetails) {
            document.getElementById('loginFormPopup').click();
            return
        }

        if(parseFloat(planPrice) == 0){
            this.setState({choosenPlanID:id},() => {
                if(this.state.userSubscriptionID)
                    this.freePlan();
                else{
                    this.freePlanRedirect();
                }
            })
            
            return
        }
        this.setState({bankpackage_id:id,planPrice:planPrice,localUpdate:true,gateways:true,gatewaysURL:"/subscription/successulPayment/"+id,payPalURL:"/subscription/"+id});
    }
    cancelSubscription = (id) => {
        swal({
            title: Translate(this.props, "Are you sure?"),
            text: Translate(this.props, "Sure want to cancel your subscription plan, if you choose yes then your current plan will be cancelled."),
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
        .then((willDelete) => {
            if (willDelete) {
                let url = "/subscription/cancelPlan/"+id
                if(this.state.itemObj && this.state.itemObj.channel_id){
                    url = url+"?type=channel&custom_url="+this.state.itemObj.custom_url
                }else if(this.state.itemObj && this.state.itemObj.blog_id){
                    url = url+"?type=blog&custom_url="+this.state.itemObj.custom_url
                }else if(this.state.itemObj && this.state.itemObj.playlist_id){
                    url = url+"?type=playlist&custom_url="+this.state.itemObj.custom_url
                }else if(this.state.itemObj && this.state.itemObj.audio_id){
                    url = url+"?type=audio&custom_url="+this.state.itemObj.custom_url
                }else if(this.state.itemObj && this.state.itemObj.video_id){
                    url = url+"?type=video&custom_url="+this.state.itemObj.custom_url
                }
                console.log(url);
                window.location.href = url
            } else {

            }
        });
    }
    render () {
        if(!this.state.plans || this.state.plans.length == 0){
            return null
        }
        let planHTML = null
        if(this.state.createPlan){
            planHTML = <div className="popup_wrapper_cnt">
                            <div className="popup_cnt">
                                <div className="comments">
                                    <div className="popup_wrapper_cnt_header">
                                        <h2>{this.props.t(!this.state.plan ? "Create New Plan" : "Edit Plan")}</h2>
                                        <a onClick={this.closePopup}  className="_close"><i></i></a>
                                    </div>
                                    <Plan {...this.props} closePopup={this.closePopup} plan={this.state.plan} />
                                </div>
                            </div>
                        </div>
        }
        let gatewaysHTML = ""

        if(this.state.gateways){
            gatewaysHTML = <Gateways {...this.props} success={() => {
                this.props.openToast(Translate(this.props, "Payment done successfully."), "success");
                if(this.state.itemObj && this.state.itemObj.channel_id){
                    setTimeout(() => {
                        Router.push(`/channel?channelId=${this.state.itemObj.custom_url}`, `/channel/${this.state.itemObj.custom_url}`)
                    },1000);
                }else if(this.state.itemObj && this.state.itemObj.blog_id){
                    setTimeout(() => {
                        Router.push(`/blog?blogId=${this.state.itemObj.custom_url}`, `/blog/${this.state.itemObj.custom_url}`)
                    },1000);
                }else if(this.state.itemObj && this.state.itemObj.playlist_id){
                    setTimeout(() => {
                        Router.push(`/playlist?playlistId=${this.state.itemObj.custom_url}`, `/playlist/${this.state.itemObj.custom_url}`)
                    },1000);
                }else if(this.state.itemObj && this.state.itemObj.audio_id){
                    setTimeout(() => {
                        Router.push(`/audio?audioId=${this.state.itemObj.custom_url}`, `/audio/${this.state.itemObj.custom_url}`)
                    },1000);
                }else if(this.state.itemObj && this.state.itemObj.video_id){
                    setTimeout(() => {
                        Router.push(`/watch?videoId=${this.state.itemObj.custom_url}`, `/watch/${this.state.itemObj.custom_url}`)
                    },1000);
                }else{
                    setTimeout(() => {
                        Router.push(`/member?memberId=${this.state.member.username}`, `/${this.state.member.username}`)
                    },1000);
                }
            }} successBank={() => {
                this.props.openToast(Translate(this.props, "Your bank request has been successfully sent, you will get notified once it's approved"), "success");
                this.setState({localUpdate:true,gateways:null})
            }} bankpackage_id={this.state.bankpackage_id} payPalURL={this.state.payPalURL} finishPayment="/subscription/finishPayment" bank_price={this.state.planPrice} subscriptionPayment={true} bank_type="user_subscribe" bank_resource_type="user" bank_resource_id={this.state.member.username} tokenURL={`${this.state.gatewaysURL}`} closePopup={() => this.setState({localUpdate:true,gateways:false})} gatewaysUrl={this.state.gatewaysURL} />
        }

        let plans = this.state.plans.map(plan => {
            let image = plan.image
            const splitVal = plan.image.split('/')
            if (splitVal[0] == "http:" || splitVal[0] == "https:") {
            } else {
                image = this.props.pageInfoData.imageSuffix + image
            }
            let perprice = {}
            perprice['package'] = { price: plan.price }
            return (
                <div className={`${this.state.userPrifile ? "details-plans-cnt" : "col-md-6"}`} key={plan.member_plan_id}>
                    <div className="card mx-auto plancard">
                        <div className="card-body">
                            <div className="pname-img">
                                <div className="img">
                                    <img className="pimg" src={image} />
                                </div>
                                <p className="m-0 pname">{plan.title}<br />
                                    {this.props.t("{{price}} / month",{price:ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } {...perprice} />)})}
                                </p> 
                            </div>
                            <h6 className="card-subtitle mb-2 text-muted">{plan.description}
                            </h6>
                            <div className="row">
                                {
                                    this.props.pageInfoData.loggedInUserDetails && this.state.user_id == this.props.pageInfoData.loggedInUserDetails.user_id ?
                                    <div className="col-md-12 mt-3">
                                        {
                                            plan.is_default == 0 ? 
                                                <button type="submit" className="btn-block" onClick={this.deletePlan.bind(this,plan.member_plan_id)}><span>{this.props.t("Delete Plan")}</span></button>
                                        : <button style={{backgroundColor:"transparent",border:"none",minHeight:"39px"}} type="submit" className="btn-block"></button>
                                        }
                                        <button type="submit" className="btn-block" onClick={this.editPlan.bind(this,plan.member_plan_id)}><span>{this.props.t("Edit Plan")}</span></button>
                                    </div>
                                    :
                                <div className="col-md-12 mt-3">
                                    {
                                        this.state.userSubscription && this.state.userSubscriptionID == plan.member_plan_id ? 
                                            this.props.pageInfoData.appSettings['member_cancel_user_subscription'] == 1 ? 
                                                <button type="submit" className="active-subscription btn-block m-0" onClick={this.cancelSubscription.bind(this,plan.member_plan_id)}><span>{this.props.t("Cancel Subscription")}</span></button>
                                            :
                                                <button type="submit" className="active-subscription btn-block m-0"><span>{this.props.t("Active Subscription")}</span></button>
                                        :
                                            <button type="submit" className="btn-block m-0" onClick={this.subscribeNow.bind(this,plan.member_plan_id,plan.price)}><span>{this.props.t("Subscibe now")}</span></button>
                                    }
                                </div>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )
        })

        return (
            <React.Fragment>
                {
                    gatewaysHTML
                }
                {
                    planHTML
                }
                {
                    this.props.pageInfoData.loggedInUserDetails && this.state.user_id == this.props.pageInfoData.loggedInUserDetails.user_id ?
                        <button type="submit" className="plan-create-btn" onClick={this.create}><span>{this.props.t("Create New Plan")}</span></button>
                : null
                }
                {
                    !this.state.userPrifile ? 
                        <div className="row mob2 col gx-2">
                            {
                                plans
                            }
                        </div>
                : 
                    <React.Fragment>
                        {plans}
                    </React.Fragment>
                }
            </React.Fragment>
        )
    }
}

export default Plans