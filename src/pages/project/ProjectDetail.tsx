import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    Container,
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Divider,
    Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Project } from "@/types/project";
import ReturnButton from "@/components/ReturnButton";

const ProjectDetail = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjectDetail = async () => {
            if (!projectId) {
                setError(t("project.not_found"));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchAPI<Project>(`/project/${projectId}`);

                if ("detail" in res) {
                    setError(t(res.detail));
                    setProject(null);
                } else {
                    setProject(res as unknown as Project);
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : t("project.fetch_failed")
                );
                setProject(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectDetail();
    }, [projectId, t]);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error || !project) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ReturnButton />
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error || t("project.not_found")}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
                <ReturnButton />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{project.name}</Typography>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/project/${projectId}/edit`)}>
                        {t("common.edit")}
                    </Button>
                </Box>
            </Box>

            {project.image && (
                <Card sx={{ mb: 3 }}>
                    <Box
                        component="img"
                        src={project.image}
                        alt={project.name}
                        sx={{
                            width: "100%",
                            height: 300,
                            objectFit: "cover",
                        }}
                    />
                </Card>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("project.visibility")}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip
                                icon={project.isPublic ? <PublicIcon /> : <LockIcon />}
                                label={project.isPublic ? t("project.public") : t("project.private")}
                                color={project.isPublic ? "success" : "default"}
                            />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{t("project.campaigns")}</Typography>
                        <Typography variant="h5" sx={{ mt: 1 }}>{project.campaignCount || 0}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {project.description && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{t("project.description")}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="textSecondary">{project.description}</Typography>
                    </CardContent>
                </Card>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("project.details")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("project.created_at")}</Typography>
                            <Typography variant="body1">{new Date(project.createdAt).toLocaleDateString()}</Typography>
                        </Box>
                        <Box>
                            <Typography color="textSecondary" gutterBottom>{t("project.created_by")}</Typography>
                            <Typography variant="body1">{project.createdById}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>{t("project.actions")}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button variant="contained" onClick={() => navigate(`/project/${projectId}/campaigns`)}>
                            {t("project.view_campaigns")}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate("/project")}>
                            {t("project.back_to_projects")}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default ProjectDetail;
