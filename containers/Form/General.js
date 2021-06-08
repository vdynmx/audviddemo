import React, { Component } from "react"

import Form from '../../components/DynamicForm/Index'

import { connect } from 'react-redux';

import Validator from '../../validators';
import axios from "../../axios-orders"

import general from '../../store/actions/general';
import Translate from "../../components/Translate/Index";
import timezones  from "../../utils/timezone";
import OtpInput from 'react-otp-input';


class General extends Component {
    constructor(props) {
        super(props)
        this.state = {
            title: "General Settings",
            success: false,
            error: null,
            loading: true,
            member: props.member,
            submitting: false,
            firstLoaded: true,
            disableButtonSubmit:false,
            otpTimer:0
        }
        this.myRef = React.createRef();
    }
    componentDidMount() {
        this.props.socket.on('otpCode',data => {
            let email = data.email
            let code = data.code
            let phone = data.phone
            let error = data.error
            if(email == this.state.newEmail && phone == this.state.newPhone && !error){
                this.setState({orgCode:code,otpTimer:0,disableButtonSubmit:false},() => {
                    if(this.resendInterval){
                        clearInterval(this.resendInterval)
                    }
                    this.resendInterval = setInterval(
                        () => this.updateResendTimer(),
                        1000
                    );
                })
                //set timer to resend code
            }else if(error){
                if(this.resendInterval){
                    clearInterval(this.resendInterval)
                }
                this.setState({
                    error: Translate(this.props, error),
                    otpValidate: false,
                    otpValue:"",
                    otpError:false
                });
            }
       });
    }
    updateResendTimer() {
        if(this.state.otpTimer >= 60){
            this.setState({disableButtonSubmit:true,otpTimer:0})
            clearInterval(this.resendInterval)
        }else{
            this.setState({otpTimer:this.state.otpTimer+1})
        }
    }
    updateUser = model => {
        if(this.resendInterval){
            clearInterval(this.resendInterval)
        }
        let formData = new FormData();
        for (var key in model) {
            if (model[key])
                formData.append(key, model[key]);
        }

        formData.append("user_id", this.state.member.user_id)

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = '/members/edit';

        this.setState({ submitting: true, error: null,otpValidate: false,
            otpValue:"",
            otpError:false });
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    window.scrollTo(0, this.myRef.current.offsetTop);
                    this.setState({ error: response.data.error, submitting: false });
                } else {
                    this.setState({ submitting: false });
                    this.props.openToast(Translate(this.props,response.data.message), "success");
                }
            }).catch(err => {
                this.setState({ submitting: false, error: err });
            });
    }
    onSubmit = model => {
        if (this.state.submitting) {
            return
        }

        if(model["phone_number"] && model['phone_number'] != this.state.member.phone_number && this.props.pageInfoData.appSettings['twillio_enable'] == 1){
            //validate phone number
            this.validatePhoneNumber(model)
        }else{
            this.updateUser(model);
        }
    };

    validatePhoneNumber = async (model) => {
        this.resendOTP(model)
        this.setState({otpValidate:true,newEmail:model.email,newPhone:model.phone_number,model:model});
    }
    
    closePopup = (e) => {
        this.setState({ otpValidate: false,otpValue:"",otpError:false,otpTimer:0})
    }
    resendOTP = model => {
        if(this.state.otpTimer != 0){
            return;
        }
        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };

        querystring.append("email",model.email);
        querystring.append("phone",model.phone_number);

        querystring.append("user_id",this.state.member.user_id)

        if(!this.state.member.phone_number){
            querystring.append("type",'add');
        }else if(model['phone_number'] != this.state.member.phone_number){
            querystring.append("type",'edit');
        }

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.updateUser(this.state.model)
        }
    }
    handleOTPChange = (value) => {
        this.setState({otpValue:value,otpError:false})
    }
    render() {

        let validator = []

        validator.push(
        {
            key: "email",
            validations: [
                {
                    "validator": Validator.required,
                    "message": "Email is required field"
                }
            ]
        })
        let formFields = []

        let ages = []
        ages.push({ key: 0, value: 0, label: "Select Age" })
        for (let j = 1; j < 100; j++) {
            ages.push({ key: j, label: j, value: j })
        }

        let timezone = []

        timezones.timezones.forEach(item => {
            timezone.push({ key: item.value, label: item.label, value: item.value })
        })

        if (this.props.pageInfoData.levelPermissions['member.username'] == 1) {
            validator.push({
                key: "username",
                validations: [
                    {
                        "validator": Validator.required,
                        "message": "Username is required field"
                    }
                ]
            })
            formFields.push({ key: "username", label: "Username", value: this.state.member.username,isRequired:true })
        }



        formFields.push(
            
            { key: "email", label: "Email", value: this.state.member.email,isRequired:true },
            {
                key: "gender", label: "Gender", type: "select", options: [
                    {
                        value: "male", label: "Male", key: "gender_1"
                    },
                    {
                        value: "female", label: "Female", key: "gender_2"
                    }
                ],
                value: this.state.member.gender
            },
            {
                key: "age", label: "Age", type: "select", options: ages,
                value: this.state.member.age ? this.state.member.age : 0
            }
        )
        if(this.props.pageInfoData.appSettings['twillio_enable'] == 1){
            if(this.props.pageInfoData.appSettings["signup_phone_number_required"] == 1){
                validator.push({
                    key: "phone_number",
                    validations: [
                        {
                            "validator": Validator.required,
                            "message": "Phone Number should not be empty."
                        }
                    ]
                })
            }
            formFields.push({ key: "phone_number",type: "phone_number", label: "Phone Number", value: this.state.member.phone_number,isRequired: this.props.pageInfoData.appSettings["signup_phone_number_required"] == 1 ? true : false })
        }
        formFields.push(
            {
                key: "timezone", label: "Timezone", type: "select", options: timezone,
                value: this.state.member.timezone ? this.state.member.timezone : this.props.pageInfoData.appSettings["member_default_timezone"]
            }
        )
        
        

        if(this.props.pageInfoData.appSettings['video_donation'] == 1 && this.props.pageInfoData.levelPermissions['video.donation'] == 1){
            formFields.push({ key: "paypal_email", label: "Donation PayPal Email", value: this.state.member.paypal_email })
        }
        if (this.props.pageInfoData.levels && this.props.pageInfoData.loggedInUserDetails.level_id == 1 && this.state.member.level_id != 1) {
            let levels = []

            this.props.pageInfoData.levels.forEach(level => {
                levels.push({
                    value: level.level_id, label: level.title, key: "level_" + level.level_id
                })
            })

            formFields.push({
                key: "level_id", label: "Level", type: "select", options: levels,
                value: this.state.member.level_id
            })
        }
        if (this.props.pageInfoData.loggedInUserDetails.level_id == 1 && this.state.member.verificationFunctionality) {
            formFields.push({
                key: "verified", label: "Verification", type: "select", options: [
                    {
                        value: "1", label: "Verified", key: "verify_1"
                    },
                    {
                        value: "0", label: "Not Verified", key: "verify_2"
                    }
                ],
                value: this.state.member.verified
            })
        }
        if (this.props.pageInfoData.appSettings['whitelist_domain'] == 1) {
            formFields.push({ key: "whitelist_domain", type:"textarea", label: "Whitelist Domain for Privacy(enter comman seprated domain name only eg:www.xyz.com)", value: this.state.member.whitelist_domain })
        }
        formFields.push({
            key: "search",
            label: "",
            type: "checkbox",
            subtype:"single",
            options: [
                {
                    value: "1", label: "Do not display me in searches.", key: "search_1"
                }
            ],
            value: [this.state.member.search.toString()]
        })
        if(this.props.pageInfoData.appSettings['enable_comment_approve'] == 1){
            let comments = []
            comments.push({ value: "1", key: "comment_1", label: "Display automatically" })
            comments.push({ value: "0", key: "comment_0", label: "Don't display until approved" })
            formFields.push({
                key: "comments",
                label: "Comments Setting",
                type: "select",
                value:  this.state.member.autoapprove_comments.toString(),
                options: comments
            })
        }

        let initalValues = {}

        //get current values of fields

        formFields.forEach(item => {
            initalValues[item.key] = item.value
        })


        let otpHMTL = null

        if(this.state.otpValidate){
            otpHMTL = <div className="popup_wrapper_cnt">
                            <div className="popup_cnt otp-cnt">
                                <div className="comments">
                                    <div className="VideoDetails-commentWrap phone-otp">
                                        <div className="popup_wrapper_cnt_header">
                                            <h2>{Translate(this.props,"Enter Verification Code")}</h2>
                                            <a onClick={this.closePopup} className="_close"><i></i></a>
                                        </div>
                                        <p>{this.props.t("Verification code is valid for {{expiration_time}}.",{expiration_time:`${60 - this.state.otpTimer} seconds`})}</p>
                                        <OtpInput
                                            value={this.state.otpValue}
                                            onChange={this.handleOTPChange}
                                            numInputs={4}
                                            placeholder="0000"
                                            inputStyle="form-control"
                                            hasErrored={this.state.otpError ? true : false}
                                            isInputNum={true}
                                            separator={<span>-</span>}
                                        />
                                        <div className="form-group">
                                            <label htmlFor="name" className="control-label"></label>
                                            <button type="submit" onClick={this.codeValidate}>{Translate(this.props,"Validate Code")}</button>
                                            <button type="submit" onClick={this.resendOTP} disabled={!this.state.disableButtonSubmit} >{Translate(this.props,"Resend Code")}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>            
        }


        return (
            <React.Fragment>
                {
                    otpHMTL
                }
                <div ref={this.myRef}>
                <Form
                    //key={this.state.current.id}
                    className="form"
                    title={this.state.title}
                    initalValues={initalValues}
                    validators={validator}
                    {...this.props}
                    submitText={!this.state.submitting ? "Save Changes" : "Saving Changes..."}
                    model={formFields}
                    generalError={this.state.error}
                    onSubmit={model => {
                        this.onSubmit(model);
                    }}
                />
                </div>
            </React.Fragment>
        )
    }
}




const mapDispatchToProps = dispatch => {
    return {
        openToast: (message, typeMessage) => dispatch(general.openToast(message, typeMessage)),
    };
};

export default connect(null, mapDispatchToProps)(General);