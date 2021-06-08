import React, { Component } from "react"

import axios from "../../axios-orders"
import Router from 'next/router'
import SocialLogin from "../SocialLogin/Index"
import {withRouter} from 'next/router';
import Link from "next/link"
import Translate from "../../components/Translate/Index"
const { BroadcastChannel } = require('broadcast-channel');
import PhoneInput,{ isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import OtpInput from 'react-otp-input';

import { GoogleReCaptchaProvider,GoogleReCaptcha } from 'react-google-recaptcha-v3';
import GoogleRecaptchaIndex from '../GoogleCaptcha/Index';



class Form extends Component{
    constructor(props){
        super(props)
        this.state = {
            email:"",
            password:"",
            passwordError:null,
            emailError:null,
            isSubmit:false,
            previousUrl:typeof window != "undefined" ? Router.asPath : "",
            verifyAgain:false,
            verifyEmail:"",
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
    componentWillUnmount(){
        if($('.modal-backdrop').length)
            $(".modal-backdrop").remove()


        if(this.state.orgCode){
            //remove code
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };

        querystring.append("phone",this.state.phone_number);
        querystring.append("type",'login');
        querystring.append("code",this.state.orgCode);

        axios.post("/auth/remove-otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
        }
    }
    onChange = (type,e) => {
         (type == "email" ? this.setState({"email":e.target.value}) : this.setState({"password":e.target.value}))
    }
    componentDidMount(){
        $("#signupbtn").click(function(e){
            setTimeout(() => {
                $("body").addClass("modal-open")
            }, 1000);
        })
        $("#forgot-btn").click(function(e){
            $("body").removeClass("modal-open")
        })
        $(document).on('click','.verificationLink',function(e){
            e.preventDefault();
            Router.push(`/verify-account`,`/verify-account`)
        })

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
    onSubmit = (e) => {
        e.preventDefault();
        if(this.state.isSubmit){
            return false;
        }
        let valid = true
        let emailError = null
        if(!this.state.otpEnable){
            if(!this.state.email){
                //email error
                emailError = Translate(this.props,"Please enter valid Email ID or Username/Password.")
                valid  = false
            }else if(this.state.email){
                // const pattern =  /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                // if(!pattern.test( this.state.email )){
                //     //invalid email
                //     emailError = Translate(this.props,"Please enter valid Email ID or Username/Password.")
                //     valid  = false
                // }
            }
            if(!this.state.password){
                //email error
                emailError = Translate(this.props,"Please enter valid Email ID or Username/Password.")
                valid  = false
            }
        }else{
            if(this.state.type == "email"){
                if(!this.state.email){
                    //email error
                    emailError = Translate(this.props,"Please enter valid Email ID or Username/Password.")
                    valid  = false
                }
                if(!this.state.password){
                    //email error
                    emailError = Translate(this.props,"Please enter valid Email ID or Username/Password.")
                    valid  = false
                }
            }else{
                if(!this.state.phone_number){
                    //email error
                    emailError = Translate(this.props,"Enter valid Phone Number.")
                    valid  = false
                }else{
                    let checkError = isValidPhoneNumber(this.state.phone_number) ? undefined : 'Invalid phone number';
                    if(checkError){
                        valid = false
                        emailError = Translate(this.props, "Enter valid Phone Number.")
                    }
                }
            }
        }
        
        
        this.setState({emailError:emailError,verifyEmail:this.state.email,verifyAgain:false})

        if(valid){
            
            if(this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_login_enable"] == 1){
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
                this.loginUser();
            }
        }

        return false
    }
    loginUser = () => {
        if(this.resendInterval){
            clearInterval(this.resendInterval)
        }
        this.setState({isSubmit:true,otpValidate: false,otpValue:"",otpError:false})

        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        if(this.state.type == "email"){
            querystring.append("email",this.state.email);
            querystring.append("password",this.state.password);
        } else {
            querystring.append("phone_number",this.state.phone_number)
            querystring.append("code",this.state.orgCode)
        }

        if(this.state.captchaToken){
            querystring.append("captchaToken",this.state.captchaToken);
        }

        axios.post("/login", querystring,config)
            .then(response => {
                this.setState({isSubmit:false})
                if(response.data.error){
                    //error
                    try{
                        this.setState({emailError:Translate(this.props,response.data.error[0].message),verifyAgain:response.data.verifyAgain})
                    }catch(err){
                        this.setState({emailError:Translate(this.props,"Please enter valid Email ID or Username/Password.")})
                    }
                }else{
                    const currentPath = Router.pathname;
                    const userChannel = new BroadcastChannel('user');
                    userChannel.postMessage({
                        payload: {
                            type: "LOGIN"
                        }
                    });
                    //success   
                    $('.loginRgtrBoxPopup').find('button').eq(0).trigger('click')
                    if(currentPath == "/" || currentPath == "/login")
                        Router.push('/')
                    else{
                        Router.push( this.state.previousUrl ? this.state.previousUrl : Router.pathname)
                    }
                }
            })
            .catch(err => {
                this.setState({emailError:Translate(this.props,"Please enter valid Email ID or Username/Password.")})
                //error
            });
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
        querystring.append("type",'login');

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.loginUser()
        }
    }
    handleOTPChange = (value) => {
        this.setState({otpValue:value,otpError:false})
    }

    verification = (e) => {
        e.preventDefault();
        if(this.state.type != "email"){
            this.verificationPhoneNumber();
        }else{
            this.sendVerification();
        }
    }
    sendVerification = () => {
        if(this.state.verificationResend){
            return
        }
        this.setState({verificationResend:true})
        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        if(this.state.type == "email")
            querystring.append("email",this.state.verifyEmail);
        else
         querystring.append("phone",this.state.phone_number);

        axios.post("/resendVerification", querystring,config)
            .then(response => {
                this.setState({verificationResend:false})
                if(response.data.success){
                    //error
                    try{
                        this.setState({verifyAgain:false,emailError:null})
                        if(response.data.code){
                            Router.push(`/verify-account?code=${response.data.code}`, `/verify-account/${response.data.code}`)
                        }
                    }catch(err){
                        
                    }
                }else{
                    
                }
            })
            .catch(err => {
                
                //error
            });
    }

    verificationPhoneNumber = async () => {
        this.resendVerificationOTP()
        this.setState({otpVerificationValidate:true});
    }
    
    closeVerificationPopup = (e) => {
        this.setState({ otpVerificationValidate: false,otpValue:"",otpError:false,otpTimer:0})
    }
    resendVerificationOTP = () => {
        
        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };

        querystring.append("phone",this.state.phone_number);
        querystring.append("type",'verification');

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeVerificationValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.sendVerification()
        }
    }
    setToken = (token) => {
        if(this.state.firstToken){
            this.setState({captchaToken:token,getCaptchaToken:false,firstToken:false});
        }else{
            this.setState({captchaToken:token,getCaptchaToken:false},() => {
                if(this.state.type == "email"){
                    this.loginUser();
                }
            });
        }
    }
    render(){


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

        let otpHVerificationMTL = null

        if(this.state.otpVerificationValidate){
            otpHVerificationMTL = <div className="popup_wrapper_cnt">
                            <div className="popup_cnt otp-cnt">
                                <div className="comments">
                                    <div className="VideoDetails-commentWrap phone-otp">
                                        <div className="popup_wrapper_cnt_header">
                                            <h2>{Translate(this.props,"Enter Verification Code")}</h2>
                                            <a onClick={this.closeVerificationPopup} className="_close"><i></i></a>
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
                                            <button type="submit" onClick={this.codeVerificationValidate}>{Translate(this.props,"Validate Code")}</button>
                                            <button type="submit" onClick={this.resendVerificationOTP} disabled={!this.state.disableButtonSubmit} >{Translate(this.props,"Resend Code")}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>            
        }
        return (
            <React.Fragment>
                {
                    otpHVerificationMTL
                }
                {
                    otpHMTL
                }
                {
                        this.props.pageData.appSettings['member_registeration'] == 1 ? 
                <SocialLogin {...this.props} />
                : null
                }
                <div className="form loginBox">
                     {
                        this.state.successVerification ? 
                            <p className="form_error" style={{color: "green",margin: "0px",fontSize: "16px"}}>{this.state.successVerification}</p>
                        : null
                    }
                    {
                        this.state.emailError ? 
                        <p className="form_error" style={{color: "red",margin: "0px",fontSize: "16px"}}>{this.state.emailError}</p>
                    : null
                    }
                    {
                        this.state.verifyAgain ? 
                            <p className="form_error" style={{color: "green",margin: "0px",fontSize: "16px"}}>
                                {
                                    <a href="#" onClick={this.verification}>
                                        {
                                            this.props.t("Click here")
                                        }
                                    </a>
                                    
                                }
                                {
                                    this.props.t(" to resend verification email.")
                                }
                            </p>
                        : null
                    }
                    <form onSubmit={this.onSubmit.bind(this)}>
                        {
                            !this.state.otpEnable ? 
                                <React.Fragment>
                                    <div className="input-group">
                                        <input className="form-control" type="text" onChange={this.onChange.bind(this,'email')} value={this.state.email} placeholder={Translate(this.props,"Email / Username")} name="email" />
                                    </div>
                                    <div className="input-group">
                                        <input className="form-control" autoComplete="off" type="password" onChange={this.onChange.bind(this,'password')} value={this.state.password} placeholder={Translate(this.props,"Password")}
                                            name="password" />
                                            
                                    </div>
                                    {
                                        this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_login_enable"] == 1 ? 
                                        <GoogleReCaptchaProvider
                                            useRecaptchaNet={false}
                                            language={this.props.i18n.language}
                                            useEnterprise={this.props.pageData.appSettings["recaptcha_enterprise"] == 1 ? true : false}
                                            reCaptchaKey={this.props.pageData.appSettings["recaptcha_key"]}
                                            scriptProps={{ async: true, defer: true, appendTo: 'body' }}
                                        >
                                            <GoogleRecaptchaIndex keyCaptcha={this.state.keyCaptcha} GoogleReCaptcha={GoogleReCaptcha} token={this.setToken} type="login" />
                                        </GoogleReCaptchaProvider>
                                    : null
                                    }
                                    <div className="input-group">
                                        <button className="btn btn-default btn-login" type="submit">
                                            {
                                                this.state.isSubmit ? 
                                                Translate(this.props,"Login ...")
                                                    : Translate(this.props,"Login")
                                            }
                                        </button>
                                    </div>
                                </React.Fragment>
                        : 
                        <React.Fragment>
                            {
                                !this.state.passwordEnable ? 
                                    this.state.type == "email" ?
                                        <div className="input-group">
                                            <input className="form-control" type="text" onChange={this.onChange.bind(this,'email')} value={this.state.email} placeholder={Translate(this.props,"Email / Username")} name="email" />
                                        </div>
                                        :
                                        <div className="input-group">                                            
                                            <PhoneInput
                                                countryCallingCodeEditable={false}
                                                countrySelectProps={{ unicodeFlags: true }}
                                                placeholder={Translate(this.props,"Phone Number")}
                                                value={this.state.phone_number}
                                                onChange={ (value) => this.setState({"phone_number":value})}
                                            />
                                        </div>
                                : null
                            }
                            {
                                this.state.type == "email" ? 
                                    <div className="input-group">
                                        <input className="form-control" autoComplete="off" type="password" onChange={this.onChange.bind(this,'password')} value={this.state.password} placeholder={Translate(this.props,"Password")}
                                            name="password" />
                                            
                                    </div>
                                : null
                            }
                            {
                                this.state.type == "email" ? 
                                <div className="input-group" onClick={() => this.setState({email:"",type:"phone",emailError:null,verifyAgain:false })}><p className="choose-option">{Translate(this.props,'Use Phone Number')}</p></div>
                                :
                                <div className="input-group" onClick={() => this.setState({phone_number:"",type:"email",emailError:null,verifyAgain:false})}><p className="choose-option">{Translate(this.props,'Use Email Address')}</p></div>
                            }
                            {
                                this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_login_enable"] == 1 ? 
                                <GoogleReCaptchaProvider
                                    useRecaptchaNet={false}
                                    language={this.props.i18n.language}
                                    useEnterprise={this.props.pageData.appSettings["recaptcha_enterprise"] == 1 ? true : false}
                                    reCaptchaKey={this.props.pageData.appSettings["recaptcha_key"]}
                                    scriptProps={{ async: true, defer: true, appendTo: 'body' }}
                                >
                                    <GoogleRecaptchaIndex keyCaptcha={this.state.keyCaptcha} GoogleReCaptcha={GoogleReCaptcha} token={this.setToken} type="login" />
                                </GoogleReCaptchaProvider>
                               : null
                            }
                            <div className="input-group">
                                <button className="btn btn-default btn-login" type="submit">
                                    {
                                        this.state.type == "email" ?
                                        this.state.isSubmit ? 
                                        Translate(this.props,"Login ...")
                                            : Translate(this.props,"Login")
                                        : 
                                        Translate(this.props,"Continue")
                                    }
                                </button>
                            </div>
                        </React.Fragment>
                        }
                    </form>
                </div>
                <div className="forgot">
                    {
                        this.props.pageData.appSettings['member_registeration'] == 1 ? 
                        this.props.router.pathname == "/login" || this.props.router.pathname == "/signup" ? 
                            <Link href="/signup">
                                <a>{Translate(this.props,"create an account?")}</a>
                            </Link>
                        : 
                        <a href="/signup" data-dismiss="modal" data-target="#registerpop" data-toggle="modal" id="signupbtn">{Translate(this.props,"create an account?")}</a>
                        : null
                    }
                    <Link href="/forgot">
                        <a className="forgot-btn">{Translate(this.props,"forgot password?")}</a>
                    </Link>
                </div>
            </React.Fragment>
        )
    }
}
export default withRouter(Form)