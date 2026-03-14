export const CampaignType = {
    Categorization: "categorization",
    COMMONS: "commons",
    WIKIPEDIA: "wikipedia",
    WIKIDATA: "wikidata",
    OTHER: "other",
} as const;

export type CampaignType = typeof CampaignType[keyof typeof CampaignType];
