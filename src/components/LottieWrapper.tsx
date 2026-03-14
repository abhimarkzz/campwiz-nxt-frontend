import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieWrapperProps {
    src: string;
    loop?: boolean;
    marginTop?: string;
}

const LottieWrapper = ({ src, loop = true, marginTop }: LottieWrapperProps) => (
    <div style={{ maxWidth: "500px", margin: "auto", width: "99%", marginTop }}>
        <DotLottieReact src={src} loop={loop} autoplay />
    </div>
);

export default LottieWrapper;
