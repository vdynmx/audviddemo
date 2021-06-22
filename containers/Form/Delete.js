import React, { Component } from "react"
import Form from '../../components/DynamicForm/Index'
import { connect } from 'react-redux';
import Validator from '../../validators';
import axios from "../../axios-orders"
import general from '../../store/actions/general';
import Router from "next/router"
import Translate from "../../components/Translate/Index";
import OtpInput from 'react-otp-input';

class General extends Component {
    constructor(props) {
        super(props)
        this.state = {
            title: "Delete Account",
            success: false,
            error: null,
            loading: true,
            member: props.member,
            submitting: false,
            firstLoaded: true,
            otpTimer:0
        }
        this.myRef = React.createRef();
    }

    componentDidMount(){
        this.props.socket.on('userDeleted',data => {
             let id = data.user_id;
             let message = data.message
             if(id == this.state.member.user_id){
                 this.props.openToast(Translate(this.props,message), "success");
                 Router.push(`/index`,`/`)
             }
        });
        this.props.socket.on('otpCode',data => {
            let email = data.email
            let code = data.code
            let phone = data.phone
            let error = data.error
            if(email == this.state.member.email && phone == this.state.member.phone_number && !error){
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
            this.setState({otpTimer:this.state.otpTimer+1},() => {
                
            })
        }
    }
    deleteUser = model => {
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
        let url = '/members/delete';

        this.setState({ submitting: true, error: null });
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    window.scrollTo(0, this.myRef.current.offsetTop);
                    this.setState({ error: response.data.error, submitting: false,otpValidate: false,otpValue:"",otpError:false });
                } else {
                    
                }
            }).catch(err => {
                this.setState({ submitting: false, error: err });
            });
    }
    onSubmit = model => {
        if (this.state.submitting) {
            return
        }

        if(this.state.member.phone_number && this.props.pageInfoData.appSettings['twillio_enable'] == 1){
            //validate phone number
            this.validatePhoneNumber(model)
        }else{
            this.deleteUser(model);
        }

        
    };

    validatePhoneNumber = async (model) => {
        this.resendOTP(model)
        this.setState({otpValidate:true,model:model});
    }
    
    closePopup = (e) => {
        this.setState({ otpValidate: false,otpValue:"",otpError:false})
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

        querystring.append("email",this.state.member.email);
        querystring.append("phone",this.state.member.phone_number);
        querystring.append("type",'delete');

        axios.post("/users/otp", querystring, config)
            .then(response => {
                
            }).catch(err => {
                
            });
    }
    codeValidate = () => {
        if(this.state.otpValue && this.state.orgCode && this.state.otpValue == this.state.orgCode){
            this.deleteUser(this.state.model)
        }
    }
    handleOTPChange = (value) => {
        this.setState({otpValue:value,otpError:false})
    }


    render() {

        let validator = []

        validator.push({
            key: "password",
            validations: [
                {
                    "validator": Validator.required,
                    "message": "Password is required field"
                }
            ]
        })
        let formFields = []

        

        formFields.push(
            { key: "password", label: "Current Password",type:"password",isRequired:true },
            
        )
        
        let initalValues = {}

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
                    submitText={!this.state.submitting ? "Delete" : "Deleting..."}
                    model={formFields}
                    {...this.props}
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