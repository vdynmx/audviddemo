import React from "react"
import Link from "../../components/Link"
import SiteModeChange from "../../containers/Sitemode/Index"

const index = (props) => {
    return (
        <React.Fragment>
           <li>
                <Link href="/member" customParam={`memberId=${props.pageInfoData.loggedInUserDetails.username}`} as={`/${props.pageInfoData.loggedInUserDetails.username}`}>
                    <a className="dropdown-item iconmenu"   style={{cursor:"pointer"}}>
                    <span className="material-icons" data-icon="person"></span>
                        {props.t("View Profile")}
                    </a>
                </Link>
            </li>
            {
                props.pageInfoData.appSettings["enable_ponts"] == 1 ?
            <li>
                <Link href="/dashboard" customParam={`type=points`} as={`/dashboard/points`}>
                    <a className="dropdown-item iconmenu" style={{cursor:"pointer"}}>
                    <span className="material-icons" data-icon="credit_score"></span>
                       {props.pageInfoData.loggedInUserDetails.points} {" "} {props.t("Points")}
                    </a>
                </Link>
            </li>
            : null
            }
            <li>
                <Link href="/dashboard">
                    <a className="dropdown-item iconmenu"  style={{cursor:"pointer"}} href="/dashboard">
                        <span className="material-icons" data-icon="edit"></span>
                        {props.t("Dashboard")}
                </a>
                </Link>
            </li>
            <li>
                <Link href="/dashboard" customParam={`type=videos&filter=watchlater`} as={`/dashboard/videos/watchlater`}>
                    <a className="dropdown-item iconmenu"  style={{cursor:"pointer"}}>
                        <span className="material-icons" data-icon="videocam"></span>
                        {props.t("Watch Later Videos")}
                </a>
                </Link>
            </li>
            {
                props.pageInfoData.packagesExists && (!props.pageInfoData.admin_url || (props.pageInfoData.loggedInUserDetails && props.pageInfoData.loggedInUserDetails.level_id != 1)) ?
                    <li>
                        <Link href="/upgrade" >
                            <a className="dropdown-item iconmenu"  style={{cursor:"pointer"}} href="/upgrade">
                            <span className="material-icons" data-icon="subscriptions"></span>
                                {props.t("Upgrade pro")}
                            </a>
                        </Link>
                    </li>
                    : null
            }
            {
                props.pageInfoData && (props.pageInfoData.admin_url || props.pageInfoData.ALLOWALLUSERINADMIN) ?
                    <li>
                            <a className="dropdown-item iconmenu"  style={{cursor:"pointer"}} rel="nofollow" href={props.pageInfoData.admin_url}>
                            <span className="material-icons" data-icon="account_circle"></span> {props.t("Admin Panel")}
                            </a>
                    </li>
                    : null
            }
            <li>
                <Link href="/logout" >
                    <a className="dropdown-item iconmenu"  style={{cursor:"pointer"}} href="/logout">
                    <span className="material-icons" data-icon="exit_to_app"></span>
                        {props.t("Logout")}
                </a>
                </Link>
            </li>
            {
                <SiteModeChange {...props} />
            }
        </React.Fragment>
    )
}
 export default  index