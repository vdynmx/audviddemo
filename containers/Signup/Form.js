import React, { Component } from "react"
import axios from "../../axios-orders"
import Router from 'next/router'
import SocialLogin from "../SocialLogin/Index"
import { withRouter } from 'next/router';
import { updateObject } from "../../shared/validate"
import Error from "../../containers/Error/Error";
import { connect } from 'react-redux';
import Link from "next/link"
import Translate from "../../components/Translate/Index"
import LinkReact from "../../components/Link/index"
import imageCompression from 'browser-image-compression';
import timezones from '../../utils/timezone';
import PhoneInput,{ isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import OtpInput from 'react-otp-input';
const { BroadcastChannel } = require('broadcast-channel');

import { GoogleReCaptchaProvider,GoogleReCaptcha } from 'react-google-recaptcha-v3';
import GoogleRecaptchaIndex from '../GoogleCaptcha/Index';

class Form extends Component {
    constructor(props) {
        super(props)
        this.state = {
            orgCode:"",
            fields: {
                email: {
                    value: "",
                    error: null
                },
                timezone:{
                    value:props.pageInfoData.appSettings["member_default_timezone"],
                    error:null
                },
                username: {
                    value: "",
                    error: null
                },
                password: {
                    value: "",
                    error: null
                },
                first_name: {
                    value: "",
                    error: null
                },
                last_name: {
                    value: "",
                    error: null
                },
                gender: {
                    value: "male",
                    error: null
                },
                accept:{
                    value:"",
                    error:null,
                },
                subscribe:{
                    value:true,
                    error:null,
                },
                file: {
                    value: "",
                    error: null
                },
                phone_number:{
                    value:"",
                    error:null
                }
            },
            isSubmit: false,
            errors: null,
            otpTimer:0,
            getCaptchaToken:true,
            firstToken:true,
            keyCaptcha:1
        }
    }
    componentWillUnmount(){
        if($('.modal-backdrop').length)
            $(".modal-backdrop").remove()
    }
    componentDidMount(){
        $("body").removeClass("modal-open").removeClass("menu_open")
        $("#loginbtn").click(function(e){
            setTimeout(() => {
                $("body").addClass("modal-open")
            }, 1000);
        })
        $("#forgot-btn-signup").click(function(e){
            $("body").removeClass("modal-open")
        })

        this.props.socket.on('otpCode',data => {
            let email = data.email
            let code = data.code
            let phone = data.phone
            let error = data.error
            if(email == this.state.fields.email.value && phone == this.state.fields.phone_number.value && !error){
                this.setState({orgCode:code,otpTimer:0,disableButtonSubmit:false},() => {
                    if(this.resendInterval){
                        clearInterval(this.resendInterval)
                    }
                    this.resendInterval = setInterval(
                        () => this.updateResendTimer(),
                        1000
                    );
                })
            }else if(error){
                if(this.resendInterval){
                    clearInterval(this.resendInterval)
                }
                let key = "phone_number"
                this.setState({
                    fields: updateObject(this.state.fields, {
                        [key]: updateObject(this.state.fields[key], {
                            value: this.state.fields.phone_number.value,
                            error: Translate(this.props, error)
                        })
                    }),
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
    onChange = (e, key) => {
        if (key == "file") {
            var url = e.target.value;
            var ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
            if (e.target.files && e.target.files[0] && (ext == "png" || ext == "jpeg" || ext == "jpg" || ext == 'PNG' || ext == 'JPEG' || ext == 'JPG' || ext == 'gif' || ext == 'GIF')) {
                this.setState({
                    fields: updateObject(this.state.fields, {
                        [key]: updateObject(this.state.fields[key], {
                            value: e.target.files[0],
                            error: null
                        })
                    })
                });
                return
            } else {
                this.setState({
                    fields: updateObject(this.state.fields, {
                        [key]: updateObject(this.state.fields[key], {
                            value: "",
                            error: Translate(this.props, "Please select png,jpeg or gif file only.")
                        })
                    })
                });

                return;
            }
        }
        this.setState({
            fields: updateObject(this.state.fields, {
                [key]: updateObject(this.state.fields[key], {
                    value: key == "subscribe" ? !this.state.fields.subscribe.value : ( key == "accept" ? !this.state.fields.accept.value : e.target.value),
                    error: null
                })
            })
        });
    };
    phoneNumber = (value) => {
        if(value || !this.state.fields.phone_number.value){
            this.setState({
                fields: updateObject(this.state.fields, {
                    ["phone_number"]: updateObject(this.state.fields["phone_number"], {
                        value: value,
                        error: ""
                    })
                })
            });
        }else if(this.props.pageInfoData.appSettings["signup_phone_number_required"] == 1){
            this.setState({
                fields: updateObject(this.state.fields, {
                    ["phone_number"]: updateObject(this.state.fields["phone_number"], {
                        value: "",
                        error:  Translate(this.props, "Phone Number should not be empty.")
                    })
                })
            });
        }
    }
    onSubmit = async (e) => {

        e.preventDefault()
        let isValid = true
        const currentState = { ...this.state.fields }
        if (!this.state.fields.first_name.value) {
            isValid = false
            currentState["first_name"]['error'] = Translate(this.props, "First Name should not be empty.")
        }
        if (!this.state.fields.accept.value) {
            isValid = false
            currentState["accept"]['error'] = Translate(this.props, "Please agree to the Terms of Service & Privacy Policy.")
        }
        if (!this.state.fields.email.value) {
            //email error
            currentState["email"]['error'] = Translate(this.props, "Email Id should not be empty.")
            isValid = false
        } else if (this.state.fields.email.value) {
            const pattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!pattern.test(this.state.fields.email.value)) {
                //invalid email
                currentState["email"]['error'] = Translate(this.props, "Please enter valid Email ID.")
                isValid = false
            }
        }
        if (!this.state.fields.password.value) {
            isValid = false
            currentState["password"]['error'] = Translate(this.props, "Password should not be empty.")
        }

        if(this.props.pageInfoData.appSettings['twillio_enable'] == 1){
            if (!this.state.fields.phone_number.value && this.props.pageInfoData.appSettings["signup_phone_number_required"] == 1) {
                isValid = false
                currentState["phone_number"]['error'] = Translate(this.props, "Phone Number should not be empty.")
            }else if(this.state.fields.phone_number.value){
                let checkError = isValidPhoneNumber(this.state.fields.phone_number.value) ? undefined : 'Invalid phone number';
                if(checkError)
                currentState["phone_number"]['error'] = Translate(this.props, "Enter valid Phone Number.")
            }
        }

        if (!isValid) {
            this.setState({ fields: currentState })
            return
        }
        if(this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_signup_enable"] == 1){
            let isSubmit = true;
            if(this.state.fields.phone_number.value && this.props.pageInfoData.appSettings['twillio_enable'] == 1){
                //validate phone number
                this.validatePhoneNumber()
                isSubmit = false
            }
            this.setState({getCaptchaToken:true,isSubmit:isSubmit,keyCaptcha: this.state.keyCaptcha + 1});
        }else if(this.state.fields.phone_number.value && this.props.pageInfoData.appSettings['twillio_enable'] == 1){
            //validate phone number
            this.validatePhoneNumber()
        }else{
            this.createUser();
        }

        return false
    }

    validatePhoneNumber = async () => {
        this.resendOTP()
        this.setState({otpValidate:true});
    }

    createUser = async () => {
        const currentState = { ...this.state.fields }
        this.setState({ isSubmit: true, otpValidate: false,otpError:false })

        //SEND FORM REQUEST
        const querystring = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };

        for (let controlName in currentState) {
            let value = currentState[controlName].value
            if (value) {
                if (controlName == "username") {
                    value = this.changedUsername(value)
                }
                if(controlName == "file"){
                    const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true 
                    }
                    var ext = value.name.substring(value.name.lastIndexOf('.') + 1).toLowerCase();
                    let compressedFile = value
                    if(ext != 'gif' && ext != 'GIF'){
                        try {
                        compressedFile = await imageCompression(value, options);
                        } catch (error) {
                        
                        }
                    }
                    querystring.append(controlName, compressedFile,value.name)
                }else{
                    querystring.append(controlName, value);
                }
            }
        }
        if(this.props.pageInfoData.code){
            querystring.append("code",this.props.pageInfoData.code);
        }
        if(this.state.captchaToken){
            querystring.append("captchaToken",this.state.captchaToken);
        }
        if(this.state.otpValue)
            querystring.append("otpValue",this.state.otpValue);
        axios.post("/signup", querystring, config)
            .then(response => {
                this.setState({ isSubmit: false })
                if (response.data.error) {
                    //error
                    this.setState({ errors: response.data.error,otpValue:"" })
                } else {
                    if(response.data.emailVerification){
                        Router.push(`/verify-account`,`/verify-account`)
                    }else{
                        const userChannel = new BroadcastChannel('user');
                        userChannel.postMessage({
                            payload: {
                                type: "LOGIN"
                            }
                        });
                        const currentPath = Router.pathname;
                        //success
                        $("body").removeClass("modal-open");
                        $("body").removeAttr("style");
                        $('#registerpop').find('.loginRgtrBoxPopup').find('button').eq(0).trigger('click')
                        if (currentPath == "/" || currentPath == "/signup")
                            Router.push('/')
                        else {
                            Router.push(Router.pathname)
                        }
                    }
                }
            }).catch(err => {
                this.setState({ errors: err,otpValue:"" })
                //error
            });
    }

    changedUsername(value) {
        value = value.replace(/[^a-z0-9]/gi, '')
        if (!value)
            value = "username"
        return value;
    }
    removeImage = (e, key) => {
        this.setState({
            fields: updateObject(this.state.fields, {
                ['file']: updateObject(this.state.fields["file"], {
                    value: "",
                    error: null
                })
            })
        });
        $("#signup_file").val("")
    }
    handleOTPChange = (value) => {
        this.setState({otpValue:value,otpError:false})
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

        querystring.append("email",this.state.fields.email.value);
        querystring.append("phone",this.state.fields.phone_number.value);

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.createUser()
        }
    }
    setToken = (token) => {
        if(this.state.firstToken){
            this.setState({captchaToken:token,getCaptchaToken:false,firstToken:false});
        }else{
            this.setState({captchaToken:token,getCaptchaToken:false},() => {
                if(this.state.fields.phone_number.value && this.props.pageInfoData.appSettings['twillio_enable'] == 1){}else{
                    this.createUser();
                }
            });
        }
    }
    render() {
        let errorMessage = null;
        let errorDiv = null;
        if (this.state.errors) {
            errorMessage = this.state.errors.map((value, index, array) => {
                return <Error {...this.props} message={value.message} key={index}></Error>
            });
            errorDiv =
                <div className="form-error">
                    {errorMessage}
                </div>
        }

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

        var createObjectURL = (URL || webkitURL || {}).createObjectURL || function () { };
        return (
            <React.Fragment>
                {
                    otpHMTL
                }
                {
                    this.props.pageInfoData.appSettings['member_registeration'] == 1 ?
                <SocialLogin {...this.props} />
                : null
                }   
                <div className="form loginBox signup-form">
                    <form onSubmit={e => { this.onSubmit(e); }}>
                        {
                            errorDiv
                        }
                        <div className="row">
                            <div className={`col-sm-${this.props.pageInfoData.appSettings['signup_form_lastname'] == 1 ? "6" : "12"}`}>
                                <div className="form-group">
                                    <input value={this.state.fields.first_name.value} onChange={e => { this.onChange(e, "first_name"); }} className="form-control" type="text" placeholder={Translate(this.props, "First Name")} name="first_name" />
                                    {
                                        this.state.fields.first_name.error ?
                                            <p className="form_error">{this.state.fields.first_name.error}</p>
                                            : null
                                    }
                                </div>
                            </div>
                            {
                                this.props.pageInfoData.appSettings['signup_form_lastname'] == 1 ? 
                                    <div className="col-sm-6">
                                        <div className="form-group">
                                            <input value={this.state.fields.last_name.value} onChange={e => { this.onChange(e, "last_name"); }} className="form-control" type="text" placeholder={Translate(this.props, "Last Name")} name="last_name" />
                                            {
                                                this.state.fields.last_name.error ?
                                                    <p className="form_error">{this.state.fields.last_name.error}</p>
                                                    : null
                                            }
                                        </div>
                                    </div>
                            : null
                            }
                        </div>
                        <div className="row"> 
                            <div className="col-sm-12">
                                <div className="form-group">
                                    <input className="form-control" value={this.state.fields.email.value} type="text" onChange={e => { this.onChange(e, "email"); }} placeholder={Translate(this.props, "Email")} name="email" />
                                    {
                                        this.state.fields.email.error ?
                                            <p className="form_error">{this.state.fields.email.error}</p>
                                            : null
                                    }
                                </div>
                            </div>
                        </div>
                        {
                            this.props.pageInfoData.appSettings['signup_phone_number'] == 1 && this.props.pageInfoData.appSettings['twillio_enable'] == 1 ?
                        <div className="row">
                            <div className="col-sm-12">
                                <div className="form-group">
                                <PhoneInput
                                    countryCallingCodeEditable={false}
                                    countrySelectProps={{ unicodeFlags: true }}
                                    placeholder={Translate(this.props,"Phone Number")}
                                    value={this.state.fields.phone_number.value}
                                    onChange={e => { this.phoneNumber(e); }}
                                />
                                    {
                                        this.state.fields.phone_number.error ?
                                            <p className="form_error">{this.state.fields.phone_number.error}</p>
                                            : null
                                    }
                                </div>
                            </div>
                        </div>
                        : null
                        }
                        {
                            this.props.pageInfoData.appSettings['signup_form_username'] == 1 ?  
                        <div className="row">
                            <div className="col-sm-12">
                                <div className="form-group">
                                    <input className="form-control" value={this.state.fields.username.value} type="text" onChange={e => { this.onChange(e, "username"); }} placeholder={Translate(this.props, "Username")} name="username" />
                                    <p className="website_signup_link">{Translate(this.props, "This will be the end of your profile link, for example:")} {`${process.env.PUBLIC_URL ? process.env.PUBLIC_URL : (window.location.protocol + "//" + window.location.host)}` + "/" + this.changedUsername(this.state.fields.username.value)}</p>
                                    {
                                        this.state.fields.username.error ?
                                            <p className="form_error">{this.state.fields.username.error}</p>
                                            : null
                                    }
                                </div>
                            </div>
                        </div>
                        : null
                        }
                        
                        {
                            this.props.pageInfoData.appSettings['signup_form_timezone'] == 1 ?  
                        <div className="row">
                            <div className="col-sm-6">
                                <div className="form-group">
                                    <input className="form-control" value={this.state.fields.password.value} autoComplete="off" onChange={e => { this.onChange(e, "password"); }} type="password" placeholder={Translate(this.props, "Password")} name="password" />
                                        {
                                            this.state.fields.password.error ?
                                                <p className="form_error">{Translate(this.props, this.state.fields.password.error)}</p>
                                                : null
                                        }
                                </div>
                            </div>
                            <div className="col-sm-6">
                                <div className="form-group">
                                    <select name="timezone" className="form-control form-select" value={this.state.fields.timezone.value} onChange={e => { this.onChange(e, "timezone"); }}>
                                        {
                                            timezones.timezones.map(item => {
                                                return (
                                                    <option value={item.value} key={item.value}>{item.label}</option>
                                                )
                                            })
                                        }
                                    </select>
                                    {
                                        this.state.fields.password.error ?
                                            <p className="form_error">{Translate(this.props, this.state.fields.password.error)}</p>
                                            : null
                                    }
                                </div>
                            </div>
                        </div>
                        : 
                            <div className="row">
                                <div className="col-sm-12">
                                    <div className="form-group">
                                        <input className="form-control" value={this.state.fields.password.value} autoComplete="off" onChange={e => { this.onChange(e, "password"); }} type="password" placeholder={Translate(this.props, "Password")} name="password" />
                                        {
                                            this.state.fields.password.error ?
                                                <p className="form_error">{Translate(this.props, this.state.fields.password.error)}</p>
                                                : null
                                        }
                                    </div>
                                </div>
                            </div>
                        }
                        {
                            this.props.pageInfoData.appSettings['signup_form_gender'] == 1 ?  
                        <div className="row gy-2 mt-2">
                            <div className="col-sm-12">
                                <label htmlFor="file">{Translate(this.props, "Gender")}</label>
                            </div>
                                <div className="col-sm-12">
                                    <input className="genter_signup" type="radio" checked={this.state.fields.gender.value == "male"} onChange={e => { this.onChange(e, "gender"); }} id="male" value="male" /><label htmlFor="male">{Translate(this.props,'Male')}</label>
                                    <input className="genter_signup" type="radio" checked={this.state.fields.gender.value == "female"}  onChange={e => { this.onChange(e, "gender"); }} id="female" value="female" /><label htmlFor="female">{Translate(this.props,'Female')}</label>

                                </div>
                        </div>
                        : null
                        }
                        {
                            this.props.pageInfoData.appSettings['signup_form_image'] == 1 ?  
                        <div className="row">
                            <div className="col-sm-12">
                                <label htmlFor="file">{Translate(this.props, "")}</label>
                            </div>
                            {
                                !this.state.fields.file.value ?
                                <div className="col-sm-12">
                                    <input className="form-control" type="file" id="signup_file" onChange={e => { this.onChange(e, "file"); }} />

                                    {
                                        this.state.fields.file.error ?
                                            <p className="form_error">{Translate(this.props, this.state.fields.file.error)}</p>
                                            : null
                                    }
                                </div>
                                : null
                            }
                            {
                                this.state.fields.file.value ?
                                    <div className="col-sm-12">
                                        <div className="previewRgisterImg">
                                            <img src={createObjectURL(this.state.fields.file.value)} />
                                            <span className="close closePreviewImage" onClick={this.removeImage}>x</span>
                                        </div>
                                    </div>
                                    : null
                            }
                        </div>
                        : null
                        }
                        {
                            this.props.pageInfoData.appSettings['enable_newsletter'] != 2 ?
                        <div className="row">
                            <div className="col-sm-12">
                                <div className="form-group">
                                    <input id="subscribe" value={this.state.fields.subscribe.value} onChange={e => { this.onChange(e, "subscribe"); }} type="checkbox" name="subscribe" />
                                    <label htmlFor="subscribe">&nbsp;{Translate(this.props,"Subscribe to newsletter")}</label>
                                </div>
                            </div>
                        </div>
                        : null
                        }

                        <div className="row">
                            <div className="col-sm-12">
                                <div className="form-group">
                                    <input id="accept" value={this.state.fields.accept.value} onChange={e => { this.onChange(e, "accept"); }} type="checkbox" name="accept" />
                                    <label className="signup_accept" htmlFor="accept">
		                            {Translate(this.props,'By creating your account, you agree to our ')}
                                        <LinkReact href="/terms">
                                        <a>{Translate(this.props,'Terms of Service')}</a> 
                                        </LinkReact>
                                        {" & "} <LinkReact href="/privacy"><a>{Translate(this.props,'Privacy Policy')}</a></LinkReact>
                                    </label>
                                    {
                                        this.state.fields.accept.error ?
                                            <p className="form_error">{Translate(this.props, this.state.fields.accept.error)}</p>
                                            : null
                                    }
                                </div>
                            </div>
                        </div>
                        {
                            this.props.pageData.appSettings["recaptcha_enable"] == 1 && this.props.pageData.appSettings["recaptcha_signup_enable"] == 1 ? 
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
                        <div className="row mt-4">
                            <div className="col-sm-12">
                                <button className="btn btn-default btn-login" type="submit"
                                >
                                    {
                                        this.state.isSubmit ?
                                            Translate(this.props, "Registering ...") :
                                            Translate(this.props, "Register")
                                    }
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="forgot">
                    {
                        this.props.router.pathname == "/login" || this.props.router.pathname == "/signup"  ?
                            <Link href="/login">
                                <a >{Translate(this.props, "Already have an account login?")}</a>
                            </Link>
                            :
                            <a href="/login" id="loginbtn" data-dismiss="modal" data-bs-target="#loginpop" data-bs-toggle="modal">{Translate(this.props, "Already have an account login?")}</a>
                    }
                    <Link href="/forgot">
                        <a className="forgot-btn-signup">{Translate(this.props, "forgot password?")}</a>
                    </Link>
                </div>
            </React.Fragment>
        )
    }
}

const mapStateToProps = state => {
    return {
        pageInfoData: state.general.pageInfoData
    };
};



export default connect(mapStateToProps, null)(withRouter(Form));