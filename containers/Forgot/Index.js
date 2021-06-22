import React, { Component } from "react"
import axios from "../../axios-orders"
import Router from 'next/router'
import { withRouter } from 'next/router';
import Link from "next/link"
import Translate from "../../components/Translate/Index"
import PhoneInput,{ isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import OtpInput from 'react-otp-input';
import { GoogleReCaptchaProvider,GoogleReCaptcha } from 'react-google-recaptcha-v3';
import GoogleRecaptchaIndex from '../GoogleCaptcha/Index';

class Form extends Component {
    constructor(props) {
        super(props)
        this.state = {
            email: "",
            emailError: null,
            isSubmit: false,
            previousUrl: typeof window != "undefined" ? Router.asPath : "",
            successMessage: null,

            otpEnable:props.pageData.appSettings['twillio_enable'] == 1,
            type:"email",
            phone_number:"",
            disableButtonSubmit:false,
            otpTimer:0,
            getCaptchaToken:true,
            firstToken:true,
            keyCaptcha:1
        }
    }
    componentDidMount(){
        this.props.socket.on('otpCode',data => {
            let email = data.email
            let code = data.code
            let phone = data.phone
            let error = data.error
            if(phone == this.state.phone_number && !error){
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
                    emailError: Translate(this.props, error),
                    otpValidate: false,
                    otpVerificationValidate:false,
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

    validatePhoneNumber = async () => {
        this.resendOTP()
        this.setState({otpValidate:true});
    }
    
    closePopup = (e) => {
        this.setState({ otpValidate: false,otpValue:"",otpError:false,otpTimer:0})
    }
    resendOTP = () => {
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

        querystring.append("phone",this.state.phone_number);
        querystring.append("type",'forgot');

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.forgotPassword()
        }
    }
    handleOTPChange = (value) => {
        this.setState({otpValue:value,otpError:false})
    }

    onChange = (e) => {
        this.setState({ "email": e.target.value })
    }

    onSubmit = (e) => {
        e.preventDefault();
        if (this.state.isSubmit) {
            return false;
        }
        let valid = true
        let emailError = null
        if(this.state.type == "email"){
            if (!this.state.email) {
                //email error
                emailError = Translate(this.props, "Please enter valid Email Address.")
                valid = false
            } else if (this.state.email) {
                const pattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (!pattern.test(this.state.email)) {
                    //invalid email
                    emailError = Translate(this.props, "Please enter valid Email Address.")
                    valid = false
                }
            }
        }else{
            if(!this.state.phone_number){
                //email error
                emailError = Translate(this.props,"Enter valid Phone Number.")
                valid  = false
            }else{
                let checkError = isValidPhoneNumber(this.state.phone_number) ? undefined : 'Invalid phone number';
                if(checkError){
                    valid = false;
                    emailError = Translate(this.props, "Enter valid Phone Number.")
                }
            }
        }
        this.setState({ emailError: emailError })
        if (valid) {
            if(this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_forgotpassword_enable"] == 1){
                let isSubmit = true;
                if(this.state.type != "email"){
                    //validate phone number
                    this.validatePhoneNumber()
                    isSubmit = false;
                }
                this.setState({getCaptchaToken:true,isSubmit:isSubmit,keyCaptcha:this.state.keyCaptcha + 1});
            }else if(this.state.type != "email"){
                //validate phone number
                this.validatePhoneNumber()
            }else{
                this.forgotPassword();
            }
        }
        return false
    }
    forgotPassword = () => {
        this.setState({ isSubmit: true })
        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        
        if(this.state.type == "phone"){
            querystring.append("phone",this.state.phone_number)
        }else{
            querystring.append("email", this.state.email);
        }
        if(this.state.captchaToken){
            querystring.append("captchaToken",this.state.captchaToken);
        }
        axios.post("/forgot", querystring, config)
            .then(response => {
                this.setState({ isSubmit: false })
                if (response.data.error) {
                    //error
                    if(this.state.type == "email")
                        this.setState({ emailError: Translate(this.props, "A user account with that email was not found.") })
                    else
                     this.setState({ emailError: Translate(this.props, "A user account with that phone number was not found.") })
                } else {
                    if(this.state.type == "email")
                        this.setState({ emailError: null, successMessage: Translate(this.props, "You have been sent an email with instructions how to reset your password. If the email does not arrive within several minutes, be sure to check your spam or junk mail folders.") })
                    else{
                        this.setState({ emailError: null, successMessage: Translate(this.props, "You have been sent an email with instructions how to reset your password. If the email does not arrive within several minutes, be sure to check your spam or junk mail folders.") })
                        Router.push(`/forgot-verify?code=${response.data.code}`, `/reset/${response.data.code}`)
                    }
                }
            })
            .catch(err => {
                if(this.state.type == "email")
                    this.setState({ emailError: Translate(this.props, "A user account with that email was not found.") })
                else
                    this.setState({ emailError: Translate(this.props, "A user account with that phone number was not found.") })
                //error
            });
    }
    setToken = (token) => {
        if(this.state.firstToken){
            this.setState({captchaToken:token,getCaptchaToken:false,firstToken:false});
        }else{
            this.setState({captchaToken:token,getCaptchaToken:false},() => {
                if(this.state.type == "email"){
                    this.forgotPassword();
                }
            });
        }
    }
    render() {

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
                    <div className="titleBarTop">
                        <div className="titleBarTopBg">
                            <img src={this.props.pageData['pageInfo']['banner'] ? this.props.pageData['pageInfo']['banner'] : "/static/images/breadcumb-bg.jpg"} alt={this.props.t("Forgot Password")} />
                        </div>
                        <div className="overlay">
                            <div className="container">
                                <div className="row">
                                    <div className="col-md-8 offset-md-2">
                                        <div className="titleHeadng">
                                            <h1>{this.props.t("Forgot Password")} <i className="fas fa-sign-in-alt"></i></h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mainContentWrap">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-8 offset-md-2 position-relative">
                                    <div className="formBoxtop loginp">
                                    <div className="loginformwd">
                                        {
                                            this.state.successMessage ?
                                                <p className="form_error" style={{ color: "green", margin: "0px", fontSize: "16px" }}>{this.state.successMessage}</p>
                                                :
                                                <React.Fragment>
                                                    {
                                                        !this.state.otpEnable ? 
                                                    <div className="form loginBox">
                                                        <p>{Translate(this.props, "If you cannot login because you have forgotten your password, please enter your email address in the field below.")}</p>
                                                        {
                                                            this.state.emailError ?
                                                                <p className="form_error" style={{ color: "red", margin: "0px", fontSize: "16px" }}>{Translate(this.props,this.state.emailError)}</p>
                                                                : null
                                                        }
                                                        <form onSubmit={this.onSubmit.bind(this)}>
                                                            <div className="input-group">
                                                                <input className="form-control" type="text" onChange={this.onChange.bind('email')} value={this.state.email} placeholder={Translate(this.props, "Email Address")} name="email" />
                                                            </div>
                                                            {
                                                                this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_forgotpassword_enable"] == 1 ?
                                                                    <GoogleReCaptchaProvider
                                                                        useRecaptchaNet={false}
                                                                        language={this.props.i18n.language}
                                                                        useEnterprise={this.props.pageData.appSettings["recaptcha_enterprise"] == 1 ? true : false}
                                                                        reCaptchaKey={this.props.pageData.appSettings["recaptcha_key"]}
                                                                        scriptProps={{ async: true, defer: true, appendTo: 'body' }}
                                                                    >
                                                                        <GoogleRecaptchaIndex keyCaptcha={this.state.keyCaptcha} GoogleReCaptcha={GoogleReCaptcha} token={this.setToken} type="signup" />
                                                                    </GoogleReCaptchaProvider>
                                                                : null
                                                            }
                                                            <div className="input-group forgotBtnBlock">
                                                                <button className="btn btn-default btn-login" type="submit">
                                                                    {
                                                                        this.state.isSubmit ?
                                                                            Translate(this.props, "Sending Email ...")
                                                                            : Translate(this.props, "Send Email")
                                                                    }
                                                                </button> {this.props.t("or")} <Link href="/" ><a href="/">{Translate(this.props, "cancel")}</a></Link>
                                                            </div>
                                                        </form>
                                                    </div>
                                                    :
                                                    <div className="form loginBox">
                                                        <p>{Translate(this.props, "If you cannot login because you have forgotten your password, please enter your email address / phone number in the field below.")}</p>
                                                        {
                                                            this.state.emailError ?
                                                                <p className="form_error" style={{ color: "red", margin: "0px", fontSize: "16px" }}>{Translate(this.props,this.state.emailError)}</p>
                                                                : null
                                                        }
                                                        <form onSubmit={this.onSubmit.bind(this)}>
                                                        {
                                                            this.state.type == "email" ? 
                                                            <div className="input-group">
                                                                <input className="form-control" type="text" onChange={this.onChange.bind('email')} value={this.state.email} placeholder={Translate(this.props, "Email Address")} name="email" />
                                                            </div>
                                                        :
                                                            <PhoneInput
                                                                countryCallingCodeEditable={false}
                                                                countrySelectProps={{ unicodeFlags: true }}
                                                                placeholder={Translate(this.props,"Phone Number")}
                                                                value={this.state.phone_number}
                                                                onChange={ (value) => this.setState({"phone_number":value})}
                                                            />
                                                        }
                                                        {
                                                            this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_forgotpassword_enable"] == 1 ?
                                                                <GoogleReCaptchaProvider
                                                                    useRecaptchaNet={false}
                                                                    language={this.props.i18n.language}
                                                                    useEnterprise={this.props.pageData.appSettings["recaptcha_enterprise"] == 1 ? true : false}
                                                                    reCaptchaKey={this.props.pageData.appSettings["recaptcha_key"]}
                                                                    scriptProps={{ async: true, defer: true, appendTo: 'body' }}
                                                                >
                                                                    <GoogleRecaptchaIndex keyCaptcha={this.state.keyCaptcha} GoogleReCaptcha={GoogleReCaptcha} token={this.setToken} type="signup" />
                                                                </GoogleReCaptchaProvider>
                                                            : null
                                                        }
                                                            {
                                                                this.state.type == "email" ? 
                                                                <div className="input-group" onClick={() => this.setState({email:"",type:"phone",emailError:null})}><p className="choose-option">{Translate(this.props,'Use Phone Number')}</p></div>
                                                                :
                                                                <div className="input-group" onClick={() => this.setState({phone_number:"",type:"email",emailError:null})}><p className="choose-option">{Translate(this.props,'Use Email Address')}</p></div>
                                                            }
                                                            <div className="input-group forgotBtnBlock">
                                                                <button className="btn btn-default btn-login" type="submit">
                                                                {
                                                                    this.state.type == "email" ?
                                                                        this.state.isSubmit ?
                                                                            Translate(this.props, "Sending Email ...")
                                                                            : Translate(this.props, "Send Email")
                                                                    :
                                                                    Translate(this.props,"Continue")
                                                                }
                                                                </button> {this.props.t("or")} <Link href="/" ><a href="/">{Translate(this.props, "cancel")}</a></Link>
                                                            </div>
                                                        </form>
                                                    </div>
                                                    }
                                                </React.Fragment>
                                        }
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
            </React.Fragment>
        )
    }
}
export default withRouter(Form)