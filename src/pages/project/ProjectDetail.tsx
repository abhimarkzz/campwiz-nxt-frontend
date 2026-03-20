import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import useSWR from "swr";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import { ArrowForward, Add, Settings } from "@mui/icons-material";
import ArchiveIcon from "@mui/icons-material/Archive";

import type { Project } from "@/types/project";
import type { Campaign } from "@/types/campaign/campaign";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
import sessionContext from "@/contexts/SessionContext";

const PERMISSION_OTHER_PROJECT_ACCESS = 1 << 9;

interface CampaignListResponse {
  data: Campaign[];
  total: number;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useContext(sessionContext);

  const { data: projectData, error: projectError, isLoading: projectLoading } =
    useSWR<Project>(
      projectId ? `/project/${projectId}?includeProjectLeads=true` : null,
      async (url: string) => {
        const res =
          await fetchAPIFromBackendSingleWithErrorHandling<Project>(url);

        if ("detail" in res) throw new Error(res.detail);

        return res.data;
      }
    );

  const {
    data: campaignData,
    error: campaignError,
    isLoading: campaignLoading,
  } = useSWR<Campaign[]>(
    projectId ? `/campaign/?projectId=${projectId}` : null,
    async (url: string) => {
      const res =
        await fetchAPIFromBackendSingleWithErrorHandling<CampaignListResponse>(url);

      if ("detail" in res) throw new Error(res.detail);

      // API returns paginated { data: Campaign[], total: number }
      return (res as unknown as CampaignListResponse).data;
    }
  );

  if (!session) {
    return <Alert severity="warning">{t("error.nonAuthenticated")}</Alert>;
  }

  if (projectLoading || campaignLoading) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (projectError) {
    return <Alert severity="error">{t("error.failedToFetchProject")}</Alert>;
  }

  if (campaignError) {
    return <Alert severity="error">{t("error.failedToFetchCampaign")}</Alert>;
  }

  const project = projectData;
  if (!project) {
    return <Alert severity="error">{t("error.loadingProject")}</Alert>;
  }

  const campaigns = (campaignData || []).sort((a, b) =>
    b.campaignId.localeCompare(a.campaignId)
  );

  const canAccessOtherProject =
    (session.permission & PERMISSION_OTHER_PROJECT_ACCESS) ===
    PERMISSION_OTHER_PROJECT_ACCESS;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Container
          sx={{
            my: 1,
            textAlign: "center",
            p: 2,
            borderRadius: 2,
            boxShadow: 2,
          }}
        >
          <img
            src={project.logoUrl}
            alt={project.name}
            width={100}
            height={100}
            loading="lazy"
            style={{
              display: "block",
              margin: "auto",
              objectFit: "contain",
            }}
          />

          <Typography variant="h4" fontWeight="bold">
            {t("project.welcomeToProject", { project: project.name })}
          </Typography>

          {canAccessOtherProject && (
            <Link to={`/project/${projectId}/edit`}>
              <Button
                variant="outlined"
                sx={{ mt: 1, borderRadius: 6 }}
                endIcon={<Settings />}
              >
                {t("project.editProject")}
              </Button>
            </Link>
          )}

          <Box sx={{ mt: 2 }}>
            {project.projectLeads.map(lead => (
              <Chip key={lead} label={lead} sx={{ m: 0.5 }} />
            ))}
          </Box>
        </Container>

        <Container>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {t("campaign.activeCampaigns")}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<ArchiveIcon />}
              sx={{ borderRadius: 6 }}
              onClick={() =>
                navigate(`/campaign/?isClosed=true&projectId=${projectId}`)
              }
            >
              {t("campaign.archivedCampaigns")}
            </Button>

            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{ borderRadius: 6 }}
              onClick={() => navigate(`/project/${projectId}/new`)}
            >
              {t("campaign.createCampaign")}
            </Button>
          </Box>

          {campaigns.length === 0 && (
            <Typography variant="body1">
              {t("error.noRunningCampaigns")}
            </Typography>
          )}

          <Grid container spacing={3}>
            {campaigns.map(c => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.campaignId}>
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 2,
                    "&:hover": { boxShadow: 4 },
                  }}
                >
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h6" fontWeight="bold">
                      {c.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {new Date(c.startDate).toUTCString()} —{" "}
                      {new Date(c.endDate).toUTCString()}
                    </Typography>

                    <Link to={`/campaign/${c.campaignId}`}>
                      <Button
                        variant="outlined"
                        sx={{ mt: 1 }}
                        endIcon={<ArrowForward />}
                      >
                        {t("campaign.goToCampaign")}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default ProjectDetail;