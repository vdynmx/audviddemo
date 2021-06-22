import React from "react"
import Plans from "./Plans"
import Videos from "../Video/Videos"
import Blog from "../Blog/Blogs"
import Audio from "../Audio/Browse"
import Image from "../Image/Index"
import Link from "../../components/Link/index";
import Timeago from "../Common/Timeago"
import Currency from "../Upgrade/Currency"
import ReactDOMServer from "react-dom/server"
import ProfileTabe from "./ProfileTabs"
import SocialShare from "../SocialShare/Index"
import Translate from "../../components/Translate/Index"

class Patreon extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            styles: {
                visibility: "hidden",
                overflow: "hidden"
            },
            showMore: false,
            showMoreText: "See more",
            userSubscription:props.userSubscription,
            userSubscriptionID:props.userSubscriptionID,
            member:props.member,
            deletePlan:props.deletePlan,
            planChange:props.planChange,
            plans:props.plans,
            homeData:props.homeData
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }
        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        } else if(nextProps.userSubscription != prevState.userSubscription || nextProps.userSubscriptionID != prevState.userSubscriptionID || 
            nextProps.member != prevState.member || nextProps.plans != prevState.plans
            ){
                let updatedState = {
                    userSubscription:nextProps.userSubscription,
                    userSubscriptionID:nextProps.userSubscriptionID,
                    member:nextProps.member,
                    deletePlan:nextProps.deletePlan,
                    planChange:nextProps.planChange,
                    userSubscription:nextProps.userSubscription,
                    plans:nextProps.plans
                }

                if(nextProps.member != prevState.member){
                    updatedState['homeData'] = nextProps.homeData
                    updatedState.styles = {
                        visibility: "hidden",
                        overflow: "hidden"
                    }
                    updatedState.showMore = false
                    updatedState.showMoreText = "See more"
                }

            return updatedState
        } else {
            return null
        }
    }
    componentDidUpdate(prevProps){
        if(this.props.member != prevProps.member){
            this.componentDidMount()
        }
        return true
    }
    componentDidMount(){
        var _ = this
        if (_.state.member) {
            if ($('#memberDescription').height() > 200) {
                _.setState({ showMore: true, styles: { visibility: "visible", overflow: "hidden", height: "200px" }, collapse: true })
            } else {
                _.setState({ showMore: false, styles: { visibility: "visible", height: "auto" } })
            }
        }
    }
    showMore = (e) => {
        e.preventDefault()
        let showMoreText = ""
        let styles = {}
        if (this.state.collapse) {
            showMoreText = Translate(this.props, "Show less")
            styles = { visibility: "visible", overflow: "visible" }
        } else {
            showMoreText = Translate(this.props, "Show more")
            styles = { visibility: "visible", overflow: "hidden", height: "200px" }
        }
        this.setState({localUpdate:true, styles: styles, showMoreText: showMoreText, collapse: !this.state.collapse })
    }
    updateParentItems = (type,subType,items) => {
        let homeData = {...this.state.homeData}
        if(type == "blogs"){
            if(this.state.blogs == "view"){
                homeData["most_latest_blogs"] = items
                homeData["most_latest_blogs"].forEach(item => {
                    const fitems = [...homeData["latest_blogs"]];
                    const itemIndex = fitems.findIndex(p => p["blog_id"] == item.blog_id);
                    if(itemIndex > -1){
                        homeData["latest_blogs"][itemIndex] = item;
                    }
                });
            }else{
                homeData["latest_blogs"] = items
                homeData["latest_blogs"].forEach(item => {
                    const fitems = [...homeData["most_latest_blogs"]];
                    const itemIndex = fitems.findIndex(p => p["blog_id"] == item.blog_id);
                    if(itemIndex > -1){
                        homeData["most_latest_blogs"][itemIndex] = item;
                    }
                });
            }
        }else if(type == "audio"){
            if(this.state.audios == "view"){
                homeData["most_latest_audio"] = items
                homeData["most_latest_audio"].forEach(item => {
                    const fitems = [...homeData["latest_audio"]];
                    const itemIndex = fitems.findIndex(p => p["audio_id"] == item.audio_id);
                    if(itemIndex > -1){
                        homeData["latest_audio"][itemIndex] = item;
                    }
                });
            }else{
                homeData["latest_audio"] = items
                homeData["latest_audio"].forEach(item => {
                    const fitems = [...homeData["most_latest_audio"]];
                    const itemIndex = fitems.findIndex(p => p["audio_id"] == item.audio_id);
                    if(itemIndex > -1){
                        homeData["most_latest_audio"][itemIndex] = item;
                    }
                });
            }

        }else if(type == "videos"){
            if(subType == "paid"){
                if(this.state.sellvideos == "view"){
                    homeData["most_sell_videos"] = items
                    homeData["most_sell_videos"].forEach(item => {
                        const fitems = [...homeData["sell_videos"]];
                        const itemIndex = fitems.findIndex(p => p["video_id"] == item.video_id);
                        if(itemIndex > -1){
                            homeData["sell_videos"][itemIndex] = item;
                        }
                    });
                }else{
                    homeData["sell_videos"] = items
                    homeData["sell_videos"].forEach(item => {
                        const fitems = [...homeData["most_sell_videos"]];
                        const itemIndex = fitems.findIndex(p => p["video_id"] == item.video_id);
                        if(itemIndex > -1){
                            homeData["most_sell_videos"][itemIndex] = item;
                        }
                    });

                }
            }else{
                if(this.state.videos == "view"){
                    homeData["most_latest_videos"] = items
                    homeData["most_latest_videos"].forEach(item => {
                        const fitems = [...homeData["latest_videos"]];
                        const itemIndex = fitems.findIndex(p => p["video_id"] == item.video_id);
                        if(itemIndex > -1){
                            homeData["latest_videos"][itemIndex] = item;
                        }
                    });
                }else{
                    homeData["latest_videos"] = items
                    homeData["latest_videos"].forEach(item => {
                        const fitems = [...homeData["most_latest_videos"]];
                        const itemIndex = fitems.findIndex(p => p["video_id"] == item.video_id);
                        if(itemIndex > -1){
                            homeData["most_latest_videos"][itemIndex] = item;
                        }
                    });
                }
            }
        }
        this.setState({localUpdate:true,homeData:homeData});
    }
    linkify(inputText) {
        inputText = inputText.replace(/&lt;br\/&gt;/g, ' <br/>')
        inputText = inputText.replace(/&lt;br \/&gt;/g, ' <br/>')
        inputText = inputText.replace(/&lt;br&gt;/g, ' <br/>')
        var replacedText, replacePattern1, replacePattern2, replacePattern3;
    
        //URLs starting with http://, https://, or ftp://
        replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank" rel="nofollow">$1</a>');
    
        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank" rel="nofollow">$2</a>');
    
        //Change email addresses to mailto:: links.
        replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
        replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1" rel="nofollow">$1</a>');
    
        return replacedText;
    }
    render(){
        
        return (
            <div className="new_design">
                <div className="container">
                    <div className="row">
                        
                        <div className="col-xl-9">
                            <ProfileTabe {...this.props} newDesign={true} pushTab={this.props.pushTab} member={this.state.member} state={this.props.stateHome} />       

                            <div className="details-tab">
                                <div className="tab-content">
                                    <div className="details-tab-box">
                                        <div className="social-share">
                                            {this.props.t("Share this page and support {{name}}!",{name:this.state.member.displayname})}
                                            <ul className="share">
                                            <SocialShare countItems={30} {...this.props} hideTitle={true} url={`/${this.state.member.username}`} title={this.state.member.displayname} imageSuffix={this.props.pageInfoData.imageSuffix} media={this.state.member.avtar} />
                                            </ul>
                                        </div>
                                        {
                                            this.state.member.about && this.state.member.about != '' ? 
                                                <div className="about">
                                                    {
                                                        <div id="memberDescription" style={{ ...this.state.styles, whiteSpace: "pre-line" }} dangerouslySetInnerHTML={{__html:this.linkify(this.state.member.about)}}>
                                                        </div>
                                                    }
                                                    {
                                                        this.state.showMore ?
                                                            <div className="MemberDetailsDescpBtn text-center">
                                                                <a href="#" onClick={this.showMore.bind(this)} className="btn btn-danger btn-sm">{Translate(this.props, this.state.showMoreText)}</a>
                                                            </div>
                                                            : null
                                                    }
                                                </div>
                                        : null
                                        }
                                        <div className="social-profile">
                                        {
                                                this.state.member.facebook ?                                                            
                                                    <a className="btn btn-danger btn-sm" href={this.state.member.facebook} target="_blank"><span className="material-icons-outlined" data-icon="link"></span>{this.props.t("Facebook")}</a>
                                                    : null
                                            }

                                            {
                                                this.state.member.instagram ?
                                                    <a className="btn btn-danger btn-sm" href={this.state.member.instagram} target="_blank"><span className="material-icons-outlined" data-icon="link"></span>{this.props.t("Instagram")}</a>                                                                   
                                                : null
                                            }
                                            {
                                                this.state.member.pinterest ?
                                                    <a className="btn btn-danger btn-sm" href={this.state.member.pinterest} target="_blank"><span className="material-icons-outlined" data-icon="link"></span>{this.props.t("Pinterest")}</a>                                                                    
                                                : null
                                            }
                                            {
                                                this.state.member.twitter ?
                                                    <a className="btn btn-danger btn-sm" href={this.state.member.twitter} target="_blank"><span className="material-icons-outlined" data-icon="link"></span>{this.props.t("Twitter")}</a>
                                                : null
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        

                            <div className="infinite-scroll-component details-tab-box mt-3">
                                <div className="titleSort mb-3">
                                    <h4 className="title">{this.props.t("Videos")}</h4>
                                    {
                                            this.state.homeData.latest_videos && this.state.homeData.latest_videos.length > 0 ?
                                    <div className="sort">
                                        <div className="form-group">
                                            <select className="form-control form-control-sm form-select" onChange={(e) => {
                                                this.setState({"videos":e.target.value})
                                            }} value={this.state.videos ? this.state.videos : "latest" }>
                                                <option value="latest">{this.props.t("Latest Videos")}</option>
                                                <option value="view">{this.props.t("Most Viewed Videos")}</option>
                                            </select>
                                        </div>
                                    </div>
                                    : null
                                    }
                                </div>
                                    <Videos {...this.props} updateParentItems={this.updateParentItems} from_user_profile={true} videos={!this.state.videos || this.state.videos == "latest" ? this.state.homeData.latest_videos : this.state.homeData.most_latest_videos} pagging={false} />
                                    {
                                        this.state.homeData.latest_videos && this.state.homeData.latest_videos.length > 0 ?
                                        <div className="viewmore-subs-btn align-items-center d-flex justify-content-center">
                                            <a href="#" className="align-items-center d-flex btn" onClick = { (e) => {
                                                e.preventDefault();
                                                this.props.pushTab("videos");
                                            }}>
                                                {this.props.t("All Videos")}
                                                <span className="material-icons-outlined" data-icon="arrow_right">
                                                    
                                                </span>
                                            </a>
                                        </div>
                                        : null
                                    } 
                            </div>
                            {
                                this.state.homeData.latest_audio.length > 0 ? 
                                <div className="infinite-scroll-component details-tab-box mt-3">
                                    <div className="titleSort mb-3">
                                        <h4 className="title">{this.props.t("Audio")}</h4>
                                        <div className="sort">
                                            <div className="form-group">
                                                <select className="form-control form-control-sm form-select" onChange={(e) => {
                                                    this.setState({"audios":e.target.value})
                                                }} value={this.state.audios ? this.state.audios : "latest" }>
                                                    <option value="latest">{this.props.t("Latest Audio")}</option>
                                                    <option value="view">{this.props.t("Most Viewed Audio")}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <Audio {...this.props} updateParentItems={this.updateParentItems} from_user_profile={true} search={true} audios={!this.state.audios || this.state.audios == "latest" ? this.state.homeData.latest_audio : this.state.homeData.most_latest_audio} pagging={false} />
                                    <div className="viewmore-subs-btn align-items-center d-flex justify-content-center">
                                        <a href="#" className="align-items-center d-flex btn" onClick = { (e) => {
                                        e.preventDefault();
                                        this.props.pushTab("audio");
                                        }}>
                                            {this.props.t("All Audio")}
                                            <span className="material-icons-outlined" data-icon="arrow_right">
                                                
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            : null
                            }
                            {
                                this.state.homeData.latest_blogs.length > 0 ? 
                                    <div className="infinite-scroll-component details-tab-box mt-3">
                                        <div className="titleSort mb-3">
                                            <h4 className="title">{this.props.t("Blogs")}</h4>
                                            <div className="sort">
                                                <div className="form-group">
                                                    <select className="form-control form-control-sm form-select" onChange={(e) => {
                                                        this.setState({"blogs":e.target.value})
                                                    }} value={this.state.blogs ? this.state.blogs : "latest" }>
                                                        <option value="latest">{this.props.t("Latest Blogs")}</option>
                                                        <option value="view">{this.props.t("Most Viewed Blogs")}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <Blog {...this.props} updateParentItems={this.updateParentItems} from_user_profile={true} blogs={!this.state.blogs || this.state.blogs == "latest" ? this.state.homeData.latest_blogs : this.state.homeData.most_latest_blogs} pagging={false} />
                                        <div className="viewmore-subs-btn align-items-center d-flex justify-content-center">
                                            <a href="#" className="align-items-center d-flex btn" onClick = { (e) => {
                                                e.preventDefault();
                                                this.props.pushTab("blogs");
                                            }}>
                                                
                                                {this.props.t("All Blogs")}
                                                <span className="material-icons-outlined" data-icon="arrow_right">
                                                    
                                                </span>
                                            </a>
                                        </div>
                                    </div>
                            : null
                            }
                            {
                                this.state.homeData.sell_videos.length > 0 ?
                                    <div className="infinite-scroll-component  details-tab-box mt-3">
                                        <div className="titleSort mb-3">
                                            <h4 className="title">{this.props.t("Paid Videos")}</h4>
                                            <div className="sort">
                                                <div className="form-group">
                                                    <select className="form-control form-control-sm form-select" onChange={(e) => {
                                                        this.setState({"sellvideos":e.target.value})
                                                    }} value={this.state.sellvideos ? this.state.sellvideos : "latest" }>
                                                        <option value="latest">{this.props.t("Latest Videos")}</option>
                                                        <option value="view">{this.props.t("Most Viewed Videos")}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <Videos {...this.props} subTypeVideos="paid" updateParentItems={this.updateParentItems} from_user_profile={true} videos={!this.state.sellvideos || this.state.sellvideos == "latest" ? this.state.homeData.sell_videos : this.state.homeData.most_sell_videos} pagging={false} />
                                            {
                                                this.state.homeData.sell_videos.length > 0 ?
                                                <div className="viewmore-subs-btn align-items-center d-flex justify-content-center">
                                                    <a href="#" className="align-items-center d-flex btn" onClick = { (e) => {
                                                        e.preventDefault();
                                                        this.props.pushTab("paid");
                                                    }}>
                                                        {this.props.t("All Paid Videos")}
                                                        <span className="material-icons-outlined" data-icon="arrow_right">
                                                            
                                                        </span>
                                                    </a>
                                                </div>
                                                : null
                                            } 
                                        
                                    </div>
                            : null
                            }
                        </div>
                        
                        
                        
                        <div className="col-xl-3">
                            <div className="details-tab-box">
                                <h4 className="heading mb-3">{this.props.t("Plans")}</h4>
                                <Plans {...this.props} userPrifile={true} userSubscription={this.state.userSubscription} userSubscriptionID={this.state.userSubscriptionID} member={this.state.member} deletePlan={this.deletePlan} onChangePlan={this.planChange}  user_id={this.state.member.user_id} plans={this.state.plans} />
                            </div>
                            {
                                this.state.homeData.donation_videos && this.state.homeData.donation_videos.length > 0 ? 
                                    <div className="card mx-auto comntcard details-tab-box mt-3">
                                        <h4 className="heading mb-3">{this.props.t("Donations")}</h4>
                                        <div className="card-body plancard">
                                            {
                                                this.state.homeData.donation_videos.map(item => {
                                                    let userBalance = {}
                                                    userBalance['package'] = { price: parseInt(item.donatePrice ? item.donatePrice : 0) } 
                                                    return(
                                                        <div className="sdbrTopComments-row" key={item.user_id}>
                                                            <div className="imgbox">
                                                                <Link href="/member" customParam={`memberId=${item.username}`} as={`/${item.username}`}>
                                                                    <a >
                                                                        <Image className="img" title={item.displayname} image={item.avtar} imageSuffix={this.props.pageInfoData.imageSuffix} />
                                                                    </a>
                                                                </Link>
                                                            </div>
                                                            <div className="content">
                                                                <Link href="/member" customParam={`memberId=${item.username}`} as={`/${item.username}`}>
                                                                    <a className="UserName">
                                                                        <React.Fragment>
                                                                            {item.displayname}
                                                                            {
                                                                                this.props.pageInfoData.appSettings['member_verification'] == 1 && item.verified == 1 ?
                                                                                    <span className="verifiedUser" title={Translate(this.props,"verified")}><span className="material-icons" data-icon="check"></span></span>
                                                                                    : null
                                                                            }
                                                                        </React.Fragment>
                                                                    </a>
                                                                </Link>
                                                                <span><time className="text-muted"><Timeago {...this.props}>{item.tip_date}</Timeago></time></span>
                                                                <div className="commentText">
                                                                {this.props.t("Donated: {{price}}",{price:ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props} {...userBalance} />)})}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                            : null
                            }
                        </div>
                    </div>
                </div>
            </div>
        )
    }

}

export default Patreon