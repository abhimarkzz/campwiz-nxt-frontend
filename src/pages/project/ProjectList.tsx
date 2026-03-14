import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Pagination,
    Card,
    CardContent,
    CardActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import { fetchAPIFromBackendSingleWithErrorHandling as fetchAPI } from "@/api";
import type { Project } from "@/types/project";
import ReturnButton from "@/components/ReturnButton";

interface ProjectListResponse {
    projects: Project[];
    total: number;
    page: number;
    pageSize: number;
}

const ProjectList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || ""
    );
    const [currentPage, setCurrentPage] = useState(
        parseInt(searchParams.get("page") || "1")
    );
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const query = searchQuery
                    ? `?search=${encodeURIComponent(searchQuery)}&page=${currentPage}`
                    : `?page=${currentPage}`;
                const res = await fetchAPI<ProjectListResponse>(
                    `/project${query}`
                );

                if ("detail" in res) {
                    setError(t(res.detail));
                    setProjects([]);
                } else {
                    const data = res as unknown as ProjectListResponse;
                    setProjects(data.projects || []);
                    setTotalPages(Math.ceil(data.total / data.pageSize));
                    setError(null);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : t("project.fetch_failed")
                );
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [searchQuery, currentPage, t]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        setSearchParams({ search: query, page: "1" });
    };

    const handlePageChange = (
        _event: React.ChangeEvent<unknown>,
        page: number
    ) => {
        setCurrentPage(page);
        setSearchParams({ search: searchQuery, page: page.toString() });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <ReturnButton />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="h4" component="h1">{t("project.projects")}</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/project/new")}>
                        {t("project.create_new")}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder={t("project.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ maxWidth: 400 }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
            ) : projects.length === 0 ? (
                <Alert severity="info">{t("project.no_projects")}</Alert>
            ) : (
                <>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 4 }}>
                        {projects.map((project) => (
                            <Card key={project.projectId} sx={{ display: "flex", flexDirection: "column" }}>
                                {project.image && (
                                    <Box component="img" src={project.image} alt={project.name} sx={{ width: "100%", height: 200, objectFit: "cover" }} />
                                )}
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" gutterBottom>{project.name}</Typography>
                                    <Typography variant="body2" color="textSecondary">{project.description}</Typography>
                                    {project.campaignCount !== undefined && (
                                        <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                                            {project.campaignCount} {t("project.campaigns")}
                                        </Typography>
                                    )}
                                </CardContent>
                                <CardActions>
                                    <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/project/${project.projectId}`)}>
                                        {t("common.view")}
                                    </Button>
                                </CardActions>
                            </Card>
                        ))}
                    </Box>

                    {totalPages > 1 && (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                            <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
};

export default ProjectList;
