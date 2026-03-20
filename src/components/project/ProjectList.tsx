import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { Box, Button, CircularProgress, Alert, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SingleProjectChip from "@/components/project/SingleProjectChip";
import type { Project } from "@/types/project";
import { fetchAPIFromBackendSingleWithErrorHandling } from "@/api";
import { useContext } from "react";
import sessionContext from "@/contexts/SessionContext";

const PERMISSION_OTHER_PROJECT_ACCESS = 1 << 9;

interface ProjectListResponse {
    data: Project[];
    total: number;
}

const ProjectList = () => {
    const { t } = useTranslation();
    const session = useContext(sessionContext);

    const { data, error, isLoading } = useSWR<ProjectListResponse>(
        "/project?includeRoles=true",
        async (url: string) => {
            const res = await fetchAPIFromBackendSingleWithErrorHandling<ProjectListResponse>(url);
            if ("detail" in res) throw new Error((res as { detail: string }).detail);
            return res.data as unknown as ProjectListResponse;
        }
    );

    if (!session) {
        return <Alert severity="warning">{t("error.nonAuthenticated")}</Alert>;
    }

    if (isLoading) {
        return <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{t("error.loadingProjects")}</Alert>;
    }

    const projects = data?.data ?? [];
    const canAccessOtherProject =
        (session.permission & PERMISSION_OTHER_PROJECT_ACCESS) === PERMISSION_OTHER_PROJECT_ACCESS;

    const myProject = projects.find((p) => p.projectId === session.projectId);
    const otherProjects = projects.filter((p) => p.projectId !== session.projectId);

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h4" fontWeight="bold">
                    {t("project.dashboard")}
                </Typography>
                {canAccessOtherProject && (
                    <Link to="/project/new">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ bgcolor: "#006699", color: "#fff", borderRadius: 30, px: 2 }}
                        >
                            {t("project.createProject")}
                        </Button>
                    </Link>
                )}
            </Box>

            {myProject && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                        {t("project.myProject")}
                    </Typography>
                    <SingleProjectChip project={myProject} />
                </Box>
            )}

            {otherProjects.length > 0 && (
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, textAlign: "center" }}>
                        {t("project.otherProjects")}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                        {otherProjects.map((project) => (
                            <SingleProjectChip key={project.projectId} project={project} />
                        ))}
                    </Box>
                </Box>
            )}

            {projects.length === 0 && (
                <Alert severity="info">{t("error.noProjects")}</Alert>
            )}
        </Box>
    );
};

export default ProjectList;