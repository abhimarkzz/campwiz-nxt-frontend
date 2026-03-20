import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Chip,
  Typography
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import RightArrowIcon from "@mui/icons-material/KeyboardArrowRight";
import type { Project } from "@/types/project";
import { useTranslation } from "react-i18next";

interface SingleProjectChipProps {
  project: Project;
}

// small hover effect
const StyledCard = styled(Card)(({ theme }) => ({
  cursor: "pointer",
  transition: theme.transitions.create(["transform"], {
    duration: theme.transitions.duration.standard,
  }),
  "&:hover": {
    transform: "scale(1.05)",
  },
}));

const SingleProjectChip = ({ project }: SingleProjectChipProps) => {
  const { t } = useTranslation();

  return (
    <StyledCard
      sx={{
        boxShadow: 1,
        m: 1,
        p: 2,
        display: "inline-block",
        borderRadius: 2,
        "&:hover": { boxShadow: 3 },
        width: {
          xs: "calc(95% - 4px)",
          sm: "calc(50% - 4px)",
          md: "calc(33.33% - 4px)",
          lg: "calc(30% - 4px)",
          xl: "calc(28% - 4px)",
        },
        mx: 2,
      }}
    >
      <CardMedia
        component="img"
        image={project.logoUrl}
        alt={project.name}
        sx={{
          objectFit: "cover",
          borderRadius: 2,
          height: 100,
          maxWidth: "100%",
        }}
      />

      <CardHeader
        title={
          <>
            <Typography
              variant="h5"
              color="primary"
              sx={{ display: "inline", mr: 1 }}
            >
              {project.name}
            </Typography>

            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ display: "inline" }}
            >
              ({project.projectId})
            </Typography>
          </>
        }
        sx={{ mb: -1 }}
      />

      <CardContent>
        {t("project.leads")} :
        {project.projectLeads.map((lead) => (
          <Chip key={lead} label={lead} sx={{ m: 0.5 }} />
        ))}
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between" }}>
        <Link to={`/project/${project.projectId}`}>
          <Button
            variant="outlined"
            color="primary"
            endIcon={<RightArrowIcon />}
            sx={{ borderRadius: 2, px: 2 }}
          >
            {t("project.goToProject")}
          </Button>
        </Link>
      </CardActions>
    </StyledCard>
  );
};

export default SingleProjectChip;
