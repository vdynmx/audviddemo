import React from "react"
import Translate from "../../components/Translate/Index"
import playlist from '../../store/actions/general';
import { connect } from "react-redux"

class Chat extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            custom_url:props.custom_url,
            channel:props.channel,
            streamId:props.streamId,
            comments:props.comments ? props.comments : [],
            comment:"",
            showTab:"chat",
            finish:props.finish,
            banusers:props.pageInfoData.video && props.pageInfoData.video.banusers ? props.pageInfoData.video.banusers : [],
            banEnable:props.pageInfoData.banEnable ? props.pageInfoData.banEnable  : 0,
            tipsData:[],
            tipsTip:{}
        }
        this.submitComment = this.submitComment.bind(this)
        this.deleteMessage = this.deleteMessage.bind(this)
        this.banMessage = this.banMessage.bind(this)
        this.changeTab = this.changeTab.bind(this)
        this.changeBan = this.changeBan.bind(this)
        this.checkTipData = this.checkTipData.bind(this)
        this.messagesEnd = React.createRef();
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }
        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        }else if (nextProps.channel != prevState.channel || nextProps.custom_url != prevState.custom_url || nextProps.streamId != prevState.streamId ) {
            return {
                streamId: nextProps.streamId, 
                custom_url: nextProps.custom_url, 
                channel: nextProps.channel, 
                comments: nextProps.comments,
                showTab:"chat",
                finish:nextProps.finish,
                tipsData:[],
                banusers:nextProps.pageInfoData.video && nextProps.pageInfoData.video.banusers ? nextProps.pageInfoData.video.banusers : [],
                banEnable:nextProps.pageInfoData.banEnable ? nextProps.pageInfoData.banEnable  : 0,
                tipsTip:{}
            }
        } else{
            return null
        }
    }
    componentDidUpdate(prevProps, prevState) {
        if(this.props.channel != prevProps.channel || this.props.custom_url != prevProps.custom_url || this.props.streamId != prevProps.streamId ){
            this.props.socket.emit('leaveRoom', {room:prevProps.channel,custom_url:prevProps.custom_url,streamId:prevProps.streamId})
            this.props.socket.emit('roomJoin', {room:this.props.channel,streamId:this.props.streamId})
            this.scrollToBottom()
        }
    }
    shouldComponentUpdate(nextProps,nextState){
        if(nextState.tipsData.length != this.state.tipsData ||  nextState.comments != this.state.comments || this.state.comment != nextState.comment || nextState.showTab != this.state.showTab || nextState.channel != this.state.channel || nextState.streamId != this.state.streamId){
            return true
        }else{
            return false
        }
    }
    componentWillUnmount() {
        //this.props.socket.disconnect();
        //window.removeEventListener("beforeunload", this.onUnloadComponent);
    }
    scrollToBottom = () => {
        var _ = this
        _.messagesEnd.scrollTop = _.messagesEnd.scrollHeight;
    }
    componentDidMount(){
        this.scrollToBottom()
        //roomJoin
        this.props.socket.emit('roomJoin', {streamId:this.state.streamId,room:this.state.channel})
        this.props.socket.on('userMessage', data => {
            if(data.ban){
                let owner_id = 0
                if(this.props.pageInfoData.loggedInUserDetails){
                    owner_id = this.props.pageInfoData.loggedInUserDetails.user_id
                }
                if(data.user_id == owner_id)
                    this.props.openToast(this.props.t("You are banned."), "error");
                return
            }
            let comments = [...this.state.comments]
            comments.push(data)

            let params = data.params ? JSON.parse(data.params) : {}
            let tipsData = [...this.state.tipsData]
            let tips = this.state.tipsTip
            if(params.tip){
                tipsData.push(data)
                tips[data.chat_id] = 0
            }
            this.setState(
            {
                localUpdate:true,
                comments:comments,
                tipsData:tipsData,
                tipsTip:tips
            },() => {
                this.scrollToBottom();
                if(this.props.getHeight){
                    this.props.getHeight()
                }
            })
        });
        this.props.socket.on('deleteMessage', data => {
            let chat_id = data.chat_id
            const itemIndex = this.getCommentIndex(chat_id)
            if(itemIndex > -1){
                const comments = [...this.state.comments]
                comments.splice(itemIndex, 1);
                this.setState({localUpdate:true,comments:comments})
            }
        });
        this.props.socket.on('banUserMessage', data => {
            let owner_id = data.user_id
            let banusers = [...this.state.banusers]
            banusers.push(data)
            this.setState({localUpdate:true,banusers:banusers,comments:[...this.state.comments]})
        });
        this.props.socket.on('unbanUserMessage', data => {
            let owner_id = data.user_id
            const itemIndex = this.getUserIndex(owner_id)
            if(itemIndex > -1){
                const banusers = [...this.state.banusers]
                banusers.splice(itemIndex, 1);
                this.setState({localUpdate:true,banusers:banusers,comments:[...this.state.comments]})
            }
        });
        setInterval(
            () => this.checkTipData(),
            1000
        );
    }
    checkTipData(){
        if(Object.keys(this.state.tipsData).length == 0){
            return;
        }
        let tipsData = [...this.state.tipsData]
        let tipsTip = {...this.state.tipsTip}
        this.state.tipsData.forEach(item => {
            if(tipsTip[item.chat_id] && tipsTip[item.chat_id] == 10 ){
                delete tipsTip[item.chat_id]
                const data = [...this.state.tipsData];
                const itemIndex = data.findIndex(p => p["chat_id"] == item.chat_id);
                if(itemIndex > -1){
                    tipsData.splice(itemIndex,1)
                }
            }else{
                tipsTip[item.chat_id] = tipsTip[item.chat_id] + 1
            }
        })
        this.setState({localUpdate:true,tipsTip:tipsTip,tipsData:tipsData},() => {
            if(this.props.getHeight){
                this.props.getHeight()
            }
        });
    }
    getUserIndex(item_id){
        if(this.state.banusers){
            const banusers = [...this.state.banusers];
            const itemIndex = banusers.findIndex(p => p["user_id"] == item_id);
            return itemIndex;
        }
        return -1;
    }
    submitComment = () => {
        if(this.state.comment){
            this.postComment();
        }
    }
    enterHit = (e) => {
        if (event.keyCode === 13) {
            e.preventDefault()
            this.postComment()
            return false
        }else{
            return true
        }
    }
    postComment = () => {
        if(this.state.comment && this.props.pageInfoData.loggedInUserDetails){
            let bannedUser = this.getUserIndex(this.props.pageInfoData.loggedInUserDetails.user_id);
            if(bannedUser > -1){
                this.props.openToast(this.props.t("You are banned."), "error");
                return
            }
            let data = {}
            data.room = this.state.channel
            data.streamId = this.state.streamId
            data.message = this.state.comment
            data.id = this.state.custom_url
            data.displayname = this.props.pageInfoData.loggedInUserDetails.displayname
            data.user_id = this.props.pageInfoData.loggedInUserDetails.user_id
            data.image = this.props.pageInfoData.loggedInUserDetails.avtar
            this.setState({localUpdate:true,comment:""})
            this.props.socket.emit('userMessage', data)
            
        }
    }
    deleteMessage = (e,chat_id) => {
        e.preventDefault();
        let data = {}
        data.room = this.state.channel
        data.streamId = this.state.streamId
        data.chat_id = chat_id
        this.props.socket.emit('deleteMessage',data)
    }
    banMessage = (e,chat_id,user) => {
        e.preventDefault();
        let data = {}
        data.room = this.state.channel
        data.streamId = this.state.streamId
        data.chat_id = chat_id
        if(user){
            const itemIndex = this.getCommentUserIndex(chat_id)
            if(itemIndex > -1){
                const comments = [...this.state.banusers]
                data.user_id = comments[itemIndex].user_id
                data.displayname = comments[itemIndex].displayname
                data.username = comments[itemIndex].username
                data.image = comments[itemIndex].image
            }
        }else{
            const itemIndex = this.getCommentIndex(chat_id)
            if(itemIndex > -1){
                const comments = [...this.state.comments]
                data.user_id = comments[itemIndex].user_id
                data.displayname = comments[itemIndex].displayname
                data.username = comments[itemIndex].username
                data.image = comments[itemIndex].image
            }
        }
        data.custom_url = this.state.custom_url
        this.props.socket.emit('banUserMessage',data)
    }
    getCommentUserIndex(item_id){
        if(this.state.comments){
            const comments = [...this.state.banusers];
            const itemIndex = comments.findIndex(p => p["user_id"] == item_id);
            return itemIndex;
        }
        return -1;
    }
    getCommentIndex(item_id){
        if(this.state.comments){
            const comments = [...this.state.comments];
            const itemIndex = comments.findIndex(p => p["chat_id"] == item_id);
            return itemIndex;
        }
        return -1;
    }
    changeTab = (e) => {
        e.preventDefault();
        this.setState({showTab:"participants"})
    }
    changeBan = (e) => {
        e.preventDefault();
        this.setState({showTab:"banusers"})
    }
    getParticipantData = (e) => {
        let participants = []
        this.state.comments.forEach(comment => {
            if(!participants[comment.user_id])
                participants[comment.user_id] = comment
        });
        return participants;
    }
    render(){
        let mainPhoto = this.props.pageInfoData.loggedInUserDetails ? this.props.pageInfoData.loggedInUserDetails.avtar : null

        if (mainPhoto) {
            const splitVal = mainPhoto.split('/')
            if (splitVal[0] == "http:" || splitVal[0] == "https:") {
            } else {
                mainPhoto = this.props.pageInfoData.imageSuffix + mainPhoto
            }
        }
        return(
            <React.Fragment>
                <div className="ls_sdTitle">
                    {
                        this.state.showTab == "chat" ?
                        <React.Fragment>
                            <div className="title">{Translate(this.props,'Live Chat')}</div>
                            <div className="dropdown TitleRightDropdown">
                                <a className="lsdot" href="#" data-toggle="dropdown"><i className="fas fa-ellipsis-v"></i></a>
                                <ul className="dropdown-menu dropdown-menu-right edit-options">
                                    <li>
                                        <a href="#" onClick={this.changeTab}>{Translate(this.props,'Participants')}</a>
                                    </li>
                                    {
                                        this.props.deleteAll || this.state.banEnable == 1 ? 
                                            <li>
                                                <a href="#" onClick={this.changeBan}>{Translate(this.props,'Ban Users')}</a>
                                            </li>
                                        : null
                                    }
                                </ul>
                            </div>
                    </React.Fragment>
                    : 
                    this.state.showTab == "banusers" ?
                    <div className="chat_participants_cnt">
                        <a href="#" onClick={(e) => {e.preventDefault();this.setState({showTab:"chat"})}}><span className="material-icons">arrow_back</span></a>
                        <span>{Translate(this.props,'Ban Users')}</span>
                    </div>
                    :
                    <div className="chat_participants_cnt">
                        <a href="#" onClick={(e) => {e.preventDefault();this.setState({showTab:"chat"})}}><span className="material-icons">arrow_back</span></a>
                        <span>{Translate(this.props,'Participants')}</span>
                    </div>
                }
                </div>
                {
                    this.state.tipsData.length > 0 ? 
                        <div className="ls_sdTitle">
                            <div className="tip_cnt">
                            {
                                this.state.tipsData.map(comment => {
                                    let commentImage = comment.image
                                        if (comment.image) {
                                            const splitVal = commentImage.split('/')
                                            if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                                            } else {
                                                commentImage = this.props.pageInfoData.imageSuffix + comment.image
                                            }
                                        }
                                        let params = comment.params ? JSON.parse(comment.params) : {}
                                    return (
                                        <div className="tip" key={comment.chat_id}>
                                            <div className="content animation">
                                                <img className="userImg" src={commentImage} />
                                                <span>{params.amount}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                            </div>
                        </div>
                    : null
                }
                <div className="chatList custScrollBar" ref={(ref) => this.messagesEnd = ref}>
                    {
                        this.state.showTab == "chat" ?
                            <div> 
                                {
                                    this.state.comments.map(comment => {
                                        let commentImage = comment.image
                                        if (comment.image) {
                                            const splitVal = commentImage.split('/')
                                            if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                                            } else {
                                                commentImage = this.props.pageInfoData.imageSuffix + comment.image
                                            }
                                        }
                                        let params = comment.params ? JSON.parse(comment.params) : {}
                                        return (
                                            <div className={`chatListRow${params.tip ? " tip" :""}`} key={comment.chat_id}>
                                                <img className="userImg" src={commentImage} />
                                                <div className="chatMessege">
                                                    <a href={this.props.pageInfoData.siteURL+"/"+comment.username} target="_blank" className="name">{comment.displayname}</a> 
                                                    <span>{comment.message}</span>                                   
                                                </div>
                                                {
                                                    this.props.deleteAll || this.state.banEnable == 1 ?  
                                                        this.getUserIndex(comment.user_id,this.state.banusers) < 0 ? 
                                                        <a className="banbtn" href="#" title={this.props.t("Ban User")} onClick={(e) => this.banMessage(e,comment.chat_id)}><i className="fas fa-ban"></i></a>
                                                        :
                                                        <a className="unbanbtn banbtn" href="#" title={this.props.t("Unban User")} onClick={(e) => this.banMessage(e,comment.chat_id)}><i className="fas fa-ban"></i></a>
                                                   : null
                                                }
                                                {
                                                    this.props.deleteAll || (this.props.pageInfoData.loggedInUserDetails && (this.props.pageInfoData.loggedInUserDetails.user_id == comment.user_id || this.props.pageInfoData.loggedInUserDetails.level_id == 1)) ? 
                                                    <a className="deletebtn" href="#" onClick={(e) => this.deleteMessage(e,comment.chat_id)}><i className="fas fa-times"></i></a>
                                                    : null
                                                }
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        : 
                        this.state.showTab == "banusers" ?
                            this.state.banusers.map(comment => {
                                let commentImage = comment.image
                                if (comment.image) {
                                    const splitVal = commentImage.split('/')
                                    if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                                    } else {
                                        commentImage = this.props.pageInfoData.imageSuffix + comment.image
                                    }
                                }
                                return (
                                    <div className="chatListRow" key={comment.user_id}>
                                        <img className="userImg" src={commentImage} />
                                        <div className="chatMessege">
                                            <a href="#" onClick={(e) => e.preventDefault()} className="name">{comment.displayname}</a> 
                                        </div>
                                        <a className="unbanbtn banbtn" href="#" title={this.props.t("Unban User")} onClick={(e) => this.banMessage(e,comment.user_id,1)}><i className="fas fa-ban"></i></a>
                                    </div>
                                )
                            })
                        :
                            this.getParticipantData().map(comment => {
                                let commentImage = comment.image
                                if (comment.image) {
                                    const splitVal = commentImage.split('/')
                                    if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                                    } else {
                                        commentImage = this.props.pageInfoData.imageSuffix + comment.image
                                    }
                                }
                                return (
                                    <div className="chatListRow" key={comment.chat_id}>
                                        <img className="userImg" src={commentImage} />
                                        <div className="chatMessege">
                                            <a href="#" onClick={(e) => e.preventDefault()} className="name">{comment.displayname}</a> 
                                        </div>
                                    </div>
                                )
                            })
                    }
                   
                
                </div>

                <div className="Chattexttyping">
                    {
                        mainPhoto && this.state.showTab == "chat" && !this.state.finish  ? 
                        <React.Fragment>
                            <div className="userName">
                                <img className="userImg" src={mainPhoto} />
                                <span className="name">{this.props.pageInfoData.loggedInUserDetails.displayname}</span>
                            </div>
                            <div className="chatInput clearfix">
                                <input className="chatbox" type="text" onKeyDown={(e) => this.enterHit(e) } placeholder={this.props.t("Say Something...")} value={this.state.comment} onChange={(e) => this.setState({localUpdate:true,comment:e.target.value})} />
                                <button className="chatsend float-right" onClick={this.submitComment}><i className="fas fa-paper-plane"></i></button>
                            </div>
                        </React.Fragment>
                    : null
                    }
                </div>
            </React.Fragment>
        )
    }
}
const mapDispatchToProps = dispatch => {
    return {    
        openToast: (message, typeMessage) => dispatch(playlist.openToast(message, typeMessage)),
    };
};
const mapStateToProps = state => {
    return {
        pageInfoData: state.general.pageInfoData,
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(Chat);