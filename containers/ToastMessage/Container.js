import React from "react"
import { ToastContainer,toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class Container extends React.Component {
    constructor(props){
        super(props)
    }
    shouldComponentUpdate(){
        return false
    }
    render(){
        return (
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable
                pauseOnHover={false}
            
            />
        )
    }
}

export default Container