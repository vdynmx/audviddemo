module.exports = {
    findAll: function(req,data){
        return new Promise(function(resolve, reject) {
            req.getConnection(function(err,connection){
                
                let condition = []
                condition.push(parseInt(data.user_id))
                condition.push(parseInt(data.user_id))
                condition.push(parseInt(data.user_id))
                condition.push(parseInt(data.user_id))

                let sql = "SELECT id,username,displayname,type,amount,admin_commission,creation_date,title,custom_url, transType FROM (SELECT video_monetizations.monetization_id as id,userdetails.username,userdetails.displayname,'advertisement' as type,amount,NULL as admin_commission,video_monetizations.creation_date,null as title,null as custom_url,'ads' as transType FROM `video_monetizations` INNER JOIN userdetails on userdetails.user_id = video_monetizations.resource_id WHERE video_monetizations.owner_id = ? "
                sql += "UNION ALL "
                sql += 'SELECT transactions.transaction_id as id,userdetails.username,userdetails.displayname,"video" as type,transactions.price as amount,admin_commission,transactions.creation_date,videos.title,videos.custom_url,transactions.type as transType FROM `transactions` INNER JOIN userdetails on userdetails.user_id = transactions.sender_id INNER JOIN videos ON videos.video_id = transactions.id WHERE (transactions.type = "video_purchase" || transactions.type = "video_tip") && (state = "approved" || state = "completed") AND transactions.owner_id = ?  ' 
                sql += "UNION ALL "
                sql += 'SELECT transactions.transaction_id as id,userdetails.username,userdetails.displayname,"channel" as type,transactions.price as amount,admin_commission,transactions.creation_date,channels.title,channels.custom_url,transactions.type as transType FROM `transactions` INNER JOIN userdetails on userdetails.user_id = transactions.owner_id INNER JOIN channels ON channels.channel_id = transactions.id WHERE (transactions.type = "channel_subscription") && (state = "approved" || state = "completed") AND channels.owner_id = ?  ' 
                sql += "UNION ALL "
                sql += 'SELECT transactions.transaction_id as id,userdetails.username,userdetails.displayname,"user" as type,transactions.price as amount,admin_commission,transactions.creation_date,u.username as custom_url,u.displayname as title,transactions.type as transType FROM `transactions` INNER JOIN userdetails on userdetails.user_id = transactions.owner_id INNER JOIN userdetails u ON u.user_id = transactions.id WHERE (transactions.type = "user_subscribe") && (state = "approved" || state = "completed") AND transactions.id = ? AND transactions.price > 0 ) as t order by creation_date DESC  ' 


                if(data.limit)
                sql += "limit "+data.limit 
                
                if(data.offset)
                    sql += " offset "+data.offset

                connection.query(sql ,condition,function(err,results,fields)
                {
                    if(err)
                        resolve(false)
                    if(results){
                        const earnings = JSON.parse(JSON.stringify(results));
                        resolve(earnings);
                    }else{
                        resolve(false);
                    }
                })
            })
        });
    }
}
