export interface Submission {
    submissionId: string;
    roundId: string;
    campaignId: string;
    submitterName: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    score?: number;
    evaluatedAt?: string;
}
