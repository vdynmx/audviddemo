import React from "react"
import ReactDOMServer from "react-dom/server"
import Currency from "../Upgrade/Currency"
import Link from "../../components/Link/index";
import InfiniteScroll from "react-infinite-scroll-component";
import LoadMore from "../LoadMore/Index"
import EndContent from "../LoadMore/EndContent"
import Release from "../LoadMore/Release"
import Translate from "../../components/Translate/Index";
import axios from "../../axios-orders"

class Subscribers extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            members:props.members,
            user_id:props.user_id,
            pagging:props.pagging,
            page:2,
            plans:props.plans
        }
        this.refreshContent = this.refreshContent.bind(this)
        this.loadMoreContent = this.loadMoreContent.bind(this)
    }
    
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }

        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        } else if (nextProps.plans != prevState.plans) {
            return {
                members:nextProps.members,
                user_id:nextProps.user_id,
                pagging:nextProps.pagging,
                page:2,
                plans:nextProps.plans
            }
        } else{
            return null
        }

    }
    
    getItemIndex(item_id) {
        const plans = [...this.state.plans];
        const itemIndex = plans.findIndex(p => p["member_plan_id"] == item_id);
        return itemIndex;
    }
    refreshContent(){
        this.setState({localUpdate:true,page:1,members:[]})
        this.loadMoreContent()
    }
    
    loadMoreContent(){
        this.setState({localUpdate:true,loading:true})
        let formData = new FormData();         
        formData.append('page',this.state.page)
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = ""
        formData.append('owner_id',this.props.user_id)
        url = `/members/subscribers`;
        
        axios.post(url, formData ,config)
        .then(response => {
            if(response.data.members){
                let pagging = response.data.pagging
                this.setState({localUpdate:true,page:this.state.page+1,pagging:pagging,members:[...this.state.members,...response.data.members],loading:false})
            }else{
                this.setState({localUpdate:true,loading:false})
            }
        }).catch(err => {
            this.setState({localUpdate:true,loading:false})
        });

    }
    filterPlan = (e) => {
        let id = e.target.value
        this.setState({loading:true,members:[],localUpdate:true,page:2})
        let formData = new FormData();         
        formData.append('page',1)
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = ""
        formData.append('owner_id',this.props.user_id)
        formData.append('plan_id',id)
        url = `/members/subscribers`;
        
        axios.post(url, formData ,config)
        .then(response => {
            if(response.data.members){
                let pagging = response.data.pagging
                this.setState({localUpdate:true,page:this.state.page+1,pagging:pagging,members:[...this.state.members,...response.data.members],loading:false})
            }else{
                this.setState({localUpdate:true,loading:false})
            }
        }).catch(err => {
            this.setState({localUpdate:true,loading:false})
        });
    }
    render () {        

        let plans = this.state.plans.map(item => {
            return (
                <option value={item.member_plan_id} key={item.member_plan_id} >{item.title}</option>
            )
        }) 

        return (
            <React.Fragment> 
                <div className="plan-subscribers">
                    <InfiniteScroll
                            dataLength={this.state.members.length}
                            next={this.loadMoreContent}
                            hasMore={this.state.pagging}
                            loader={<LoadMore {...this.props} loading={true} page={this.state.page} itemCount={this.state.members.length} />}
                            endMessage={
                                <EndContent {...this.props} text={ Translate(this.props,'No user subscribed yet.')} itemCount={this.state.members.length} />
                            }
                            pullDownToRefresh={false}
                            pullDownToRefreshContent={<Release release={false} {...this.props} />}
                            releaseToRefreshContent={<Release release={true} {...this.props} />}
                            refreshFunction={this.refreshContent}
                        >
                            <div className="sort">
                                <select className="form-control form-control-sm form-select" onChange={this.filterPlan}>
                                    {
                                        <React.Fragment>
                                            <option key={"default1"}></option>
                                            {plans}
                                        </React.Fragment>
                                    }
                                </select>
                            </div>
                            <div className="row mob2 col gx-2">
                        {
                            this.state.members.map(plan => {
                                let image = plan.avtar
                                const splitVal = plan.avtar.split('/')
                                if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                                } else {
                                    image = this.props.pageInfoData.imageSuffix + image
                                }
                                let perprice = {}
                                perprice['package'] = { price: plan.plan_price }
                                return (
                                    <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6" key={plan.user_id}>
                                        <div className="card mx-auto plancard">
                                            <div className="card-body">
                                                <div className="pname-img">
                                                    <div className="img">
                                                        <Link href="/member" customParam={`memberId=${plan.username}`} as={`/${plan.username}`}>
                                                            <a>
                                                                <img className="pimg" src={image} />
                                                            </a>
                                                        </Link>
                                                    </div>
                                                    <p className="m-0 pname">
                                                        <Link href="/member" customParam={`memberId=${plan.username}`} as={`/${plan.username}`}>
                                                            {plan.displayname}
                                                        </Link>
                                                        <br />
                                                        {this.props.t("{{price}} / month",{price:ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } {...perprice} />)})}
                                                    </p>
                                                </div>
                                                <h6 className="card-subtitle mb-2 text-muted">{this.props.t("Plan Title: {{plan_title}}",{plan_title:plan.plan_title})}</h6>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                        </div>
                    </InfiniteScroll>
                </div>
            </React.Fragment>
        )
    }
}

export default Subscribers