import { Link } from "react-router-dom";
import LogoSvg from "@/assets/logo.svg";

const Logo = () => (
    <Link to="/" style={{ cursor: "pointer" }}>
        <img src={LogoSvg} alt="Logo of CampWiz" height={80} style={{ margin: "auto", display: "block" }} />
    </Link>
);

export default Logo;
