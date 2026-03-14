export const fallbackLng = "en";

export const languages = [
    fallbackLng,
    "bn", "hi", "ar", "kn", "fr", "it", "mk",
    "pms", "ps", "ru", "skr-arab", "krc", "de",
    "zh-hans", "zh-hant", "ur", "lt",
];

export const defaultNS = "translation";
export const cookieName = "i18next";

/** Link to the TranslateWiki translation page for CampWiz */
export const translationLink =
    "https://translatewiki.net/wiki/Translating:CampWiz";

export default function getOptions(lng = fallbackLng, ns = defaultNS) {
    return {
        debug: import.meta.env.DEV,
        supportedLngs: languages,
        fallbackLng,
        lng,
        fallbackNS: defaultNS,
        defaultNS,
        ns,
    };
}
