import React from 'react';

class Index extends React.Component {

  constructor(props){
      super(props)
  }

  shouldComponentUpdate(nextProps,nextState){
    if(this.props.keyCaptcha != nextProps.keyCaptcha){
        return true;
    }
      return false;
  }

  render(){
    const [dynamicAction] = this.props.type

    return (
        <div>
        <this.props.GoogleReCaptcha
            action={dynamicAction}
            onVerify={(token) => {this.props.token(token)}}
        />
        </div>
    );
  }
};

export default Index