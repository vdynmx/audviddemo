import React from "react";
import Translate from "../../components/Translate/Index";
import axios from "../../axios-orders";

class Bank extends React.Component{

    constructor(props) {
        super(props)    
        this.state = {
            submitting:false
        }
    }

    selectFile = (e) => {
        var url =  e.target.value;
        var file = e.target.files[0]
        var ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
        if (file && (ext == "png" || ext == "jpeg" || ext == "jpg" || ext == 'PNG' || ext == 'JPEG' || ext == 'JPG')) {
            this.setState({file:file,submitting:false})
        }else{
            this.setState({errorMessage:"Please select png and jpeg file only.",submitting:true})
        }
    }
    handleSubmit = (e) => {
        e.preventDefault();
        if(this.state.submitting){
            return
        }
        this.setState({submitting:true})       
        let formData = new FormData();
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = "/member/bankdetails";
        formData.append("resource_id",this.props.bank_resource_id);
        formData.append("resource_type",this.props.bank_resource_type);
        formData.append("type",this.props.bank_type);
        formData.append("price",this.props.bank_price);
        if(this.props.bankpackage_id){
            formData.append("package_id",this.props.bankpackage_id);
        }
        formData.append("file",this.state.file);
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    this.setState({errorMessage:response.data.error,submitting:false})
                } else {
                    this.props.successBank()
                }
            }).catch(err => {
                
            });
    }
    render(){
        
        return (
            <div className="popup_wrapper_cnt">
                <div className="popup_cnt">
                    <div className="comments">
                        <div className="VideoDetails-commentWrap">
                            <div className="popup_wrapper_cnt_header">
                                <h2>{Translate(this.props, "Account Details")}</h2>
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
                            <form className="bank-form" onSubmit={this.handleSubmit}>
                                <p className="heading">
                                    {
                                         this.props.pageInfoData.appSettings['payment_bank_method_description']
                                    }
                                </p>
                                <p className="note">
                                    {
                                        this.props.pageInfoData.appSettings['payment_bank_method_note']
                                    }
                                </p>
                                <input type="file" name="file" onChange={this.selectFile} />
                                <button disabled={this.state.submitting} className="btn-pay">
                                    {Translate(this.props,'Upload')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Bank;