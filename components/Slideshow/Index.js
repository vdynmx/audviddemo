import React,{Component,CSSProperties} from "react"
import { connect } from "react-redux";
import Carousel from "react-slick"
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

class Slideshow extends Component{
    constructor(props){
        super(props)
        this.state = {
            //class:" slideshowSlider"
            class:"",
            width:props.isMobile ? props.isMobile : 993,
        }
        this.clickedItem = this.clickedItem.bind(this)
    }
    clickedItem = (link,e) => {
        if(this.state.width < 993 && link){
            window.open(link, '_blank');
        }
    }
    render(){
        if(!this.props.pageInfoData.slideshow){
            return null
        }
        const Right = props => (
            <button className="control-arrow control-next" onClick={props.onClick}>
              <span className='material-icons'>keyboard_arrow_right</span>
            </button>
          )
        const Left = props => (
            <button className="control-arrow control-prev" onClick={props.onClick}>
              <span className='material-icons'>keyboard_arrow_left</span>
            </button>
          )
        var settings = {
            dots: true,
            autoplay:true,
            autoplaySpeed:3000,
            infinite: true,
            speed: 500,
            slidesToShow: 1,
            slidesToScroll: 1,
            className:"carousel-slider",
            initialSlide: 0,
            nextArrow:<Right />,
            prevArrow:<Left />,
          };

        let items = this.props.pageInfoData.slideshow.map(elem => {
            let videoImage = elem.image
            if(this.props.pageInfoData.livestreamingtype == 0 && elem.mediaserver_stream_id &&  !elem.orgImage && elem.is_livestreaming == 1){
                if(this.props.pageInfoData.liveStreamingCDNServerURL){
                    videoImage = `${this.props.pageInfoData.liveStreamingCDNServerURL}/LiveApp/previews/${elem.mediaserver_stream_id}.png`
                }else
                    videoImage = `${this.props.pageInfoData.liveStreamingServerURL}:5443/LiveApp/previews/${elem.mediaserver_stream_id}.png`
            }else  if(elem.mediaserver_stream_id &&  elem.image && elem.image.indexOf('LiveApp/previews') > -1){
                if(this.props.pageInfoData.liveStreamingCDNURL){
                    videoImage = `${this.props.pageInfoData.liveStreamingCDNURL}${elem.image.replace("/LiveApp","")}`
                }else
                    videoImage = `${this.props.pageInfoData.liveStreamingServerURL}:5443${elem.image}`
            }

            let isS3 = true
            if (videoImage) {
                const splitVal = videoImage.split('/')
                if (splitVal[0] == "http:" || splitVal[0] == "https:") {
                    isS3 = false
                }
            }

            return (
                <div className="item" key={elem.slideshow_id} onClick={this.clickedItem.bind(this,elem.link1)}>
                    <div className="snglFullWdth-box">
                        <div className="img">
                            <img src={(isS3 ? this.props.pageInfoData.imageSuffix : "") + videoImage} />
                        </div>
                        <div className="content">
                            <div className="snglFullWdth-content-box">
                                <h3 className="title">{elem.title}</h3>
                                <p className="text d-none d-md-block">{elem.description}</p>
                                <div className="buttons">
                                    {
                                        elem.button_1_enabled && elem.text1 != ""? 
                                        <a className="button hvr-bs animated" href={elem.link1} target="_blank">{elem.text1}</a>
                                        : null
                                    }
                                    {
                                        elem.button_2_enabled && elem.text2 != ""? 
                                        <a className="button hvr-bs animated" href={elem.link2} target="_blank">{elem.text2}</a>
                                        : null
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        })


        return ( 
            <div className={`SlideAdsWrap${this.state.class}`}>
                <div id="snglFullWdth" className="snglFullWdth">
                    <Carousel {...settings} >
                        {items}
                    </Carousel>
                </div>
            </div>
        )
    }

}

const mapStateToProps = state => {
    return {
        pageInfoData:state.general.pageInfoData
    };
  };

export default connect(mapStateToProps)(Slideshow)