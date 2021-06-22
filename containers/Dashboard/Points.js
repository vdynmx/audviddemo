import React from "react"
import Translate from "../../components/Translate/Index";
import swal from 'sweetalert'
import axios from "../../axios-orders"
import Router from 'next/router'

class Points extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            items:props.pageData.items ? props.pageData.items.results : [],
            points:props.member.points,
            error:null
        }
        this.redeemPoints = this.redeemPoints.bind(this)
        this.reddemFormSubmit = this.reddemFormSubmit.bind(this);
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }
        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        }else if (nextProps.pageData.items != prevState.items) {
            return {error:null,success:null,items:nextProps.pageData.items ? nextProps.pageData.items.results : [],redeem:false,points:nextProps.pageData.member.points,pointsSubmitting:false }
        }else{
            return null
        }
    }
    redeemPoints = () => {
        this.setState({localUpdate:true,redeem:true})
    }
    closePopup = () => {
        this.setState({localUpdate:true,redeem:false})
    }
    reddemFormSubmit = (e) => {
        e.preventDefault()

        if(this.state.points > this.props.member.points || parseFloat(this.state.points) == 0){
            return false;
        }

        this.setState({localUpdate:true,'pointsSubmitting':true});

        const formData = new FormData()
        formData.append('points', this.state.points)
        const url = "/member/redeem-points"
        axios.post(url, formData)
            .then(response => {
                if (response.data.error) {
                    this.setState({localUpdate:true,'pointsSubmitting':false,error:response.data.error});
                } else {
                    this.setState({localUpdate:true,'pointsSubmitting':false,success:response.data.success});
                    let user = this.props.pageData.user ? `user=${this.props.pageData.user}` : "";
                    Router.push(
                        `/dashboard?type=points&${user}`,
                        `/dashboard/points?${user}`,
                    )
                }
            }).catch(err => {
                this.setState({localUpdate:true,'pointsSubmitting':false,error:null});
                swal("Error", Translate(this.props, "Something went wrong, please try again later"), "error");
            });

    }
    pointsValue = (e) => {
        if (isNaN(e.target.value) || e.target.value < 1) {
            this.setState({localUpdate:true, points: parseFloat(e.target.value) })
        } else {
            this.setState({localUpdate:true, points: e.target.value })
        }
    }
    copyText = () => {
        var copyURL = document.getElementById("referralpoints");
        copyURL.select();
        document.execCommand("copy");
    }
    render(){
        let type = "";

        let reedem = null
        if (this.state.redeem) {
            reedem = <div className="popup_wrapper_cnt">
                <div className="popup_cnt">
                    <div className="comments">
                        <div className="VideoDetails-commentWrap">
                            <div className="popup_wrapper_cnt_header">
                                <h2>{Translate(this.props, "Redeem Points")}</h2>
                                <a onClick={this.closePopup} className="_close"><i></i></a>
                            </div>
                            <div className="user_wallet">
                                <div className="row">
                                    <form onSubmit={this.reddemFormSubmit}>
                                        {
                                            this.state.error ? 
                                                <p className="error">{this.state.error}</p>
                                            : null
                                        }
                                        {
                                            this.state.success ? 
                                                <p className="success">{this.state.success}</p>
                                            : null
                                        }
                                        <div className="form-group">
                                            <label htmlFor="name" className="control-label">{Translate(this.props, "Redeem Points")}</label>
                                            <input type="number" min="1" max={this.props.member.points} className="form-control" value={this.state.points ? this.state.points : ""} onChange={this.pointsValue} />
                                            <p className="points-tip">
                                                {this.props.pageData.appSettings["points_value"]+` Points = 1 ${this.props.pageData.appSettings['payment_default_currency']}`}
                                            </p>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="name" className="control-label"></label>
                                            <button type="submit">{Translate(this.props, "Redeem now")}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        } 

        return (
            <React.Fragment>
                {reedem}
                <div className="rewardPoint-wrap">
                    <div className="totalreward">
                        <div className="totalrwrd">
                            <div className="bg-info py-2 px-3 text-bold">
                                {this.props.t("Total points: {{points}}",{points:this.props.member.points})} 
                            </div>
                        </div>
                        {
                            this.props.member.user_id == this.props.pageData.loggedInUserDetails.user_id && parseFloat(this.props.pageData.appSettings["points_value"]) > 0 ?
                                <div className="rewrdRedeem">
                                    <button className="bg-danger py-2 px-3 text-bold" onClick={this.redeemPoints}>{this.props.t("Redeem Points")}</button>
                                </div>
                        : null
                        }
                    </div>
                    {
                        this.props.pageData.appSettings['signup_referrals'] ? 
                    <div className="referral-points">
                        <p>
                            {this.props.t("Referral Link")}
                        </p>
                        <div className="referral-input">
                            <input type="type" value={`${this.props.pageData.siteURL}/signup?affiliate=${this.props.pageData.loggedInUserDetails.user_id}`} readOnly id="referralpoints" />
                            <button onClick={this.copyText}>{this.props.t("Copy")}</button>
                        </div>
                        {
                            parseInt(this.props.pageData.appSettings['referrals_points_value']) > 0 ? 
                        <p>
                            {this.props.t("You will get {{points}} point(s) for every successfull referral signup.",{points:this.props.pageData.appSettings['referrals_points_value']})}
                        </p>
                        : null
                        }
                    </div>
                    : null
                    }
                    <table className="table">
                        <thead>
                            <tr className="points_main_heading">
                                <th>{this.props.t("Point Type")}</th>
                                <th>{this.props.t("First Time")}</th>
                                <th>{this.props.t("Next Time")}</th>
                                <th>{this.props.t("Max Points per Day")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.items.map(item => {
                                    let data = null
                                    if(type != item.resource_type){
                                        type = item.resource_type
                                        data =   <tr className="points_heading" key={item.type+item.first_time+item.next_time+"10"}>
                                                <td colSpan="4">{Translate(this.props,item.resource_type.charAt(0).toUpperCase() + item.resource_type.slice(1))}</td>
                                            </tr>                                    
                                    }
                                    return (
                                        <React.Fragment key={item.type+item.first_time+item.next_time+"11"}>
                                            {data}
                                            <tr className="points_tr" key={item.type+item.first_time+item.next_time+"22"}>
                                                <td className="label">{this.props.t(`${item.type}_points`)}</td>
                                                <td>{item.first_time}</td>
                                                <td>{item.next_time}</td>
                                                <td>{item.max}</td>
                                            </tr>
                                        </React.Fragment>                                    
                                    )
                                }) 
                            }
                        </tbody>
                    </table>
                </div>
            </React.Fragment>
        )

    }
}

export default Points