import { lazy, Suspense } from "react";

const DotLottieReact = lazy(() =>
    import("@lottiefiles/dotlottie-react").then((module) => ({
        default: module.DotLottieReact,
    }))
);

interface LottieWrapperLazyProps {
    src: string;
    loop?: boolean;
    marginTop?: string;
}

const LottieWrapperLazy = ({ src, loop = true, marginTop }: LottieWrapperLazyProps) => (
    <div style={{ maxWidth: "500px", margin: "auto", width: "99%", marginTop }}>
        <Suspense fallback={<div>Loading...</div>}>
            <DotLottieReact src={src} loop={loop} autoplay />
        </Suspense>
    </div>
);

export default LottieWrapperLazy;
