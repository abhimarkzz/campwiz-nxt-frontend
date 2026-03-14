import { MenuItem, TextField } from "@mui/material";
import useSWR from "swr";

interface ProjectInputProps {
    value: string;
    onChange: (projectId: string) => void;
    disabled?: boolean;
    sx?: Record<string, unknown>;
    loading?: boolean;
}

const ProjectInput = (props: ProjectInputProps) => {
    const fetcher = async (url: string) => {
        const response = await fetch(url);
        const data = await response.json();
        return data?.projects ?? [];
    };
    
    const { isLoading, data: options } = useSWR(
        `/api/v2/projects`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return (
        <TextField
            select
            disabled={props.disabled || isLoading || props.loading}
            label="Project"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            sx={{ mb: 1, ...(props.sx || {}) }}
        >
            {(options || []).map((project: { id: string; name: string }) => (
                <MenuItem key={project.id} value={project.id}>
                    {project.name}
                </MenuItem>
            ))}
        </TextField>
    );
};

export default ProjectInput;
