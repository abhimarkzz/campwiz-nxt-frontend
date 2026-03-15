export * from "./status";

export interface Round {
    roundId: string;
    campaignId: string;
    name: string;
    status: string;
    createdAt: string;
}
