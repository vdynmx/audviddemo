import React from 'react';
import Layout from '../hoc/Layout/Layout';
import * as actions from '../store/actions/general';
import axios from "../axios-site"
if(typeof window != "undefined"){
  window.$ = window.jQuery = require("jquery");
}
import HomeContainer from "../containers/Home/Index"
import i18n from '../i18n';
import { withTranslation } from 'react-i18next';
import Login from "../containers/Login/Index"
import Maintanance from "../containers/Error/Maintenance"

const Home = (props) => (
  <Layout {...props} >
    {
     props.user_login ?
          <Login {...props} />
        : props.maintanance ?
          <Maintanance {...props} />
        :
          <HomeContainer {...props} />
    }
  </Layout>
)

const Extended = withTranslation('common', { i18n, wait: process.browser })(Home);

Extended.getInitialProps = async function(context) {
    const isServer = !!context.req
    if(isServer){
      const req = context.req
      req.i18n.toJSON = () => null
      const initialI18nStore = {}
      req.i18n.languages.forEach((l) => {
        initialI18nStore[l] = req.i18n.services.resourceStore.data[l];
      })      
      await context.store.dispatch(actions.setPageInfoData(context.query))
      return {pageData:context.query,initialI18nStore,i18n: req.i18n,initialLanguage: req.i18n.language}
    }else{
      const pageData = await axios.get("/?data=1");
      return {pageData:pageData.data.data,user_login:pageData.data.user_login,pagenotfound:pageData.data.pagenotfound,permission_error:pageData.data.permission_error,maintanance:pageData.data.maintanance}
   }
}

export default Extended