const Index = (props) => {
    if(!props.text){
        return null
    }

    let newBadWords = ""
    if(props.pageData && props.pageData.appSettings && props.pageData.appSettings['censored_words']){
        newBadWords = props.pageData.appSettings['censored_words']
    }else if(props.pageInfoData && props.pageInfoData.appSettings['censored_words']){
        newBadWords = props.pageInfoData.appSettings['censored_words']
    }
    
    if(newBadWords){
        let newBadWords1 = newBadWords.split(",")
        var re = new RegExp(newBadWords1.join("|"),"gi");
        var str = props.text
        str = str.replace(re, function(matched){
            return "*";
        });
        return str
    }
    return props.text
}

export default Index