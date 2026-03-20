/**
 * Campaign type definition matching the backend API response.
 */
export interface Campaign {
  campaignId: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  isHidden: boolean;
}
