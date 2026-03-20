import type { WikimediaUsername } from "@/types/_";

export interface Project {
  logoUrl: string;
  name: string;
  projectId: string;
  projectLeads: WikimediaUsername[];
  url: string;
}

// keeping these separate in case we tweak later
export type ProjectCreate = Project;
export type ProjectUpdate = Project & {
  projectLeads: WikimediaUsername[];
};