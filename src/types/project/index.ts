export interface Project {
    projectId: string;
    name: string;
    description: string;
    image?: string;
    createdAt: string;
    createdById: string;
    campaignCount?: number;
    isPublic: boolean;
}
