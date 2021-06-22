import React, { Component } from "react"
import Form from '../../components/DynamicForm/Index'
import { connect } from 'react-redux';
import Validator from '../../validators';
import axios from "../../axios-orders"
import general from '../../store/actions/general';
import Translate from "../../components/Translate/Index";
import imageCompression from 'browser-image-compression';

class Password extends Component {
    constructor(props) {
        super(props)
        this.state = {
            title: props.plan ? "Edit Plan" : "Create Plan",
            success: false,
            error: null,
            loading: true,
            plan: props.plan,
            submitting: false,
            firstLoaded: true
        }
        this.myRef = React.createRef();
    }

    onSubmit = async model => {
        if (this.state.submitting) {
            return
        }
        let formData = new FormData();
        

        if(this.state.plan)
            formData.append("plan_id", this.state.plan.member_plan_id)

        for (var key in model) {
            if(key == "image" && model[key] && typeof model[key] != "string"){
                var ext = model[key].name.substring(model[key].name.lastIndexOf('.') + 1).toLowerCase();
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true
                }
                let compressedFile = model[key]
                if(ext != 'gif' && ext != 'GIF'){
                    try {
                    compressedFile = await imageCompression(model[key], options);
                    } catch (error) { }
                }
                formData.append(key, compressedFile,model[key].name);
                }else if(model[key] != null && typeof model[key] != "undefined")
                    formData.append(key, model[key]);
        }
        //image
        if(model['image']){
            let image =   typeof model['image'] == "string" ? model['image'] : false
            if(image){
                formData.append('planImage',image)
            }
        }

        if(this.state.plan){
            delete model["price"]
        }

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = '/members/create-plan';

        this.setState({ submitting: true, error: null });
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    window.scrollTo(0, this.myRef.current.offsetTop);
                    this.setState({ error: response.data.error, submitting: false });
                } else {
                    setTimeout(() => {
                        this.props.closePopup(response.data.item,response.data.type);
                    },2000);
                    this.props.openToast(Translate(this.props,response.data.message), "success");
                }
            }).catch(err => {
                this.setState({ submitting: false, error: err });
            });
    };



    render() {

        let validator = []

        validator.push({
            key: "title",
            validations: [
                {
                    "validator": Validator.required,
                    "message": "Title is required field"
                }
            ]
        },
            {
                key: "description",
                validations: [
                    {
                        "validator": Validator.required,
                        "message": "Description is required field"
                    }
                ]
            },
            )

            if(!this.state.plan){
                validator.push(
                    {
                        key: "price",
                        validations: [
                            {
                                "validator": Validator.required,
                                "message": "Price is required field"
                            },
                            {
                                "validator": Validator.price,
                                "message": "Please provide valid price"
                            }
                        ]
                    }
                )
            }

        let formFields = []

        
        formFields.push(
            { key: "title", label: "Title", type:"title",isRequired:true,value:this.state.plan ? this.state.plan.title : "" },
            { key: "description", label: "Description",type:"textarea" ,isRequired:true,value:this.state.plan ? this.state.plan.description : "" },
            { key: "price", props: { readOnly: this.state.plan ? true : false }, label: `Price Monthly (${this.props.pageInfoData.appSettings.payment_default_currency})`,type:"text" ,isRequired:true,value:this.state.plan ? this.state.plan.price.toString() : ""},
            {
                key: "res_type_1",
                type: "content",
                content: '<h6 class="custom-control minimum_amount_cnt">'+this.props.t("The subscription fee cannot be changed after it is created.")+'</h6>'
            },
            { key: "image", label: "Upload Image", type: "file", value: this.state.plan && this.state.plan.orgImage ? this.props.pageInfoData.imageSuffix+this.state.plan.orgImage : "" },
        )
       
        if(this.props.pageInfoData.categoriesVideo){
            let categories = this.props.pageInfoData.categoriesVideo
            let selected = []

            if(this.state.plan && this.state.plan.video_categories){
                selected = this.state.plan.video_categories.split(",")
            }
            let value = []
            let options = []
            categories.forEach(cat => {
                options.push({
                    label: cat.title, value: cat.category_id
                })
                if(selected && selected.indexOf(String(cat.category_id)) > -1){
                    value.push({label:cat.title,value:cat.category_id})
                }
            })
            formFields.push(
                { key: "video_categories", label: "Allowed Video Categories",type:"multiSelect" ,isRequired:false,value:value,options:options,defaultValues:value }
            )
        }
        let initalValues = {}
        //get current values of fields
        formFields.forEach(item => {
            initalValues[item.key] = item.value
        })

        return (
            <React.Fragment>
                <div className="mainContentWrap plan-form" ref={this.myRef}>
                    <Form
                        className="form"
                        multiSelectKey="video_categories"
                        initalValues={initalValues}
                        validators={validator}
                        submitText={!this.state.submitting ? "Submit" : "Submitting..."}
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

export default connect(null, mapDispatchToProps)(Password);