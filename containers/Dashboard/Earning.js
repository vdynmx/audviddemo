import React from "react"
import Router from 'next/router'

import Translate from "../../components/Translate/Index"
import Link from "../../components/Link/index";

import LoadMore from "../LoadMore/Index"
import EndContent from "../LoadMore/EndContent"
import Release from "../LoadMore/Release"
import axios from "../../axios-orders"
import InfiniteScroll from "react-infinite-scroll-component";
import ReactDOMServer from "react-dom/server"
import Currency from "../Upgrade/Currency"
import Timeago from "../Common/Timeago"
import StatsData from "./AdsAnalytics"
import CensorWord from "../CensoredWords/Index"

class Earning extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            pagging: props.pageData.items.pagging,
            items: props.pageData.items.results,
            page: 2,
            submitting: false,
            member: props.member,
            statsData:props.statsData
        }
        this.loadMoreContent = this.loadMoreContent.bind(this)
    } 
    
    
    loadMoreContent() {
        this.setState({ loading: true })
        let formData = new FormData();
        if(this.state.member){
            formData.append('owner_id',this.state.member.user_id)
        }
        formData.append('page', this.state.page)
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };

        let url = `/dashboard/earning`;
        
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.items) {
                    let pagging = response.data.pagging
                    this.setState({ page: this.state.page + 1, pagging: pagging, items: [...this.state.items, ...response.data.items], loading: false })
                } else {
                    this.setState({ loading: false })
                }
            }).catch(err => {
                this.setState({ loading: false })
            });
    }

    
    
    render() {
        let results = this.state.items.map(item => {
            let amount = {}
            amount['package'] = { price: item.amount }
            let commission = {}
            commission['package'] = { price: item.admin_commission }
            let netamount = {}
            netamount['package'] = { price: (parseFloat(item.admin_commission ? item.admin_commission : 0) + parseFloat(item.amount)) }

            let type = ""

            if(item.transType != "ads"){
                if(item.transType == "video_tip"){
                    type = Translate(this.props,'Video Tip');
                }else if(item.transType == "channel_subscription"){
                    type = Translate(this.props,'Channel Support');
                }else if(item.transType == "user_subscribe"){
                    type = Translate(this.props,'Plan Subscription');
                }else{
                    type = Translate(this.props,'Video Purchases')
                }
                
             }else{
                type =  Translate(this.props,'From Advertisement')
             }

            return (
                <tr key={item.id+item.type}>
                    <td>
                        {
                            type
                        } 
                    </td>
                    <td>
                        <Link href="/member" customParam={`memberId=${item.username}`} as={`/${item.username}`}>
                            <a>
                                {item.displayname}
                            </a>
                        </Link>
                    </td>
                    <td>
                        {
                            item.type == "video" ? 
                            <Link href="/watch" customParam={`videoId=${item.custom_url}`} as={`/watch/${item.custom_url}`}>
                                <a>
                                    {<CensorWord {...this.props} text={item.title} />}
                                </a>
                            </Link> 
                            :
                            item.type == "channel" ? 
                            <Link href="/channel" customParam={`channelId=${item.custom_url}`} as={`/channel/${item.custom_url}`}>
                                    <a>
                                        {<CensorWord {...this.props} text={item.title} />}
                                    </a>
                                </Link> 
                            : 
                            item.type == "user" ? 
                                <Link href="/member" customParam={`memberId=${item.custom_url}`} as={`/${item.custom_url}`}>
                                    <a>
                                        {item.title}
                                    </a>
                                </Link>
                            : null
                        }
                    </td>
                    <td>{ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } { ...netamount} />)}</td>
                    <td>{item.admin_commission ? ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } {...commission} /> ) : "-"}</td>
                    <td>{ReactDOMServer.renderToStaticMarkup(<Currency { ...this.props } {...amount} />)}</td>
                    <td>{<Timeago {...this.props}>{item.creation_date}</Timeago>}</td>
                    
                </tr>
            )
        })
        
        return (
            <React.Fragment>
                {
                    this.state.statsData ? 
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <StatsData {...this.props} statsData={this.state.statsData} member={this.state.member} />
                                </div>
                            </div>
                        </div>
                : null
                }



               <div className="container">
                    <div className="row">
                        <div className="col-md-12">                                
                            <InfiniteScroll
                                className=""
                                dataLength={this.state.items.length}
                                next={this.loadMoreContent}
                                hasMore={this.state.pagging}
                                loader={<LoadMore {...this.props} page={this.state.page} loading={true} itemCount={this.state.items.length} />}
                                endMessage={
                                    <EndContent {...this.props} text={Translate(this.props,'No data found to display.')} itemCount={this.state.items.length} />
                                }
                                pullDownToRefresh={false}
                                pullDownToRefreshContent={<Release release={false} {...this.props} />}
                                releaseToRefreshContent={<Release release={true} {...this.props} />}
                                refreshFunction={this.refreshContent}
                            >
                                <div className="table-responsive">
                                <table className="table custTble1">
                                    <thead>
                                        <tr>
                                            <th scope="col">{Translate(this.props,"Type")}</th>
                                            <th scope="col">{Translate(this.props,"Payer Name")}</th>
                                            <th scope="col">{Translate(this.props,"Item")}</th>
                                            <th scope="col">{Translate(this.props,"Amount")}</th>
                                            <th scope="col">{Translate(this.props,"Site Commission")}</th>
                                            <th scope="col">{Translate(this.props,"Net Earning")}</th>
                                            <th scope="col">{Translate(this.props,"Creation Date")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results}
                                    </tbody>
                                </table>
                                </div>
                            </InfiniteScroll>
                        </div>
                    </div>
                </div>

            </React.Fragment>
        )
    }
}

export default Earning