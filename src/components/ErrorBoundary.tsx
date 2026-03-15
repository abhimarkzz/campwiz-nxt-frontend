import React, { type ReactNode } from "react";
import { Container, Box, Typography, Button, Alert } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
                    <Alert severity="error" sx={{ mb: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            Oops! Something went wrong
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {this.state.error?.message ||
                                "An unexpected error occurred. Please try again."}
                        </Typography>
                    </Alert>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={this.handleReset}
                        >
                            Return to Home
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => window.history.back()}
                        >
                            Go Back
                        </Button>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
