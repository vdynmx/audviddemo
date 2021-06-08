import React, { useState } from 'react'
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

class Index extends React.Component{
    constructor(props){
        super(props)
        this.state = { 
            items:props.children ? props.children : props.items,
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if(typeof window == "undefined" || nextProps.i18n.language != $("html").attr("lang")){
            return null;
        }

        if(prevState.localUpdate){
            return {...prevState,localUpdate:false}
        } else if ((nextProps.children != prevState.children || nextProps.items != prevState.items) || nextProps.i18n.language != prevState.language) {
            return { items: nextProps.children ? nextProps.children : nextProps.items,language:nextProps.i18n.language }
        } else{
            return null
        }

    }
   
    render(){
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
            dots: false,
            infinite: false,
            speed: 500,
            slidesToShow: this.props.defaultItemCount ? this.props.defaultItemCount : this.props.itemAt1024,
            slidesToScroll: 1,
            className:"carousel-slider",
            initialSlide: 0,
            nextArrow:<Right />,
            prevArrow:<Left />,
            responsive: [
              {
                breakpoint: 1024,
                settings: {
                  slidesToShow: this.props.itemAt1024,
                  slidesToScroll: 1,
                  infinite: true,
                  dots: false
                }
              },
              {
                breakpoint: 600,
                settings: {
                  slidesToShow: this.props.itemAt600,
                  slidesToScroll: 1,
                  initialSlide: 0
                }
              },
              {
                breakpoint: 480,
                settings: {
                  slidesToShow: this.props.itemAt480,
                  slidesToScroll: 1
                }
              }
            ]
          };

          if(this.props.itemAt1200){
                settings.responsive.push(
                    {
                        breakpoint: 1200,
                        settings: {
                        slidesToShow: this.props.itemAt1200,
                        slidesToScroll: 1,
                        infinite: true,
                        dots: false
                        }
                    }
                )
            }
            if(this.props.itemAt1500){
                settings.responsive.push(
                    {
                        breakpoint: 1500,
                        settings: {
                        slidesToShow: this.props.itemAt1500,
                        slidesToScroll: 1,
                        infinite: true,
                        dots: false
                        }
                    }
                )
            }
            if(this.props.itemAt900){
                settings.responsive.push(
                    {
                        breakpoint: 900,
                        settings: {
                        slidesToShow: this.props.itemAt900,
                        slidesToScroll: 1,
                        infinite: true,
                        dots: false
                        }
                    }
                )
            }
        return (
            <Slider {...settings}> {this.state.items} </Slider>
        )
    }

}

export default Index