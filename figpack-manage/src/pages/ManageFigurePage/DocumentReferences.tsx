import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  type DocumentReference,
  getDocumentsReferencingFigure,
} from "./documentReferencesApi";

interface DocumentReferencesProps {
  figureUrl: string;
  formatDate: (timestamp: number) => string;
}

const DocumentReferences: React.FC<DocumentReferencesProps> = ({
  figureUrl,
  formatDate,
}) => {
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!figureUrl) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const docs = await getDocumentsReferencingFigure(figureUrl);
        setDocuments(docs);
      } catch (err) {
        console.error("Error fetching document references:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load document references",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [figureUrl]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Document References
          </Typography>
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={30} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Document References
          </Typography>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Document References
        </Typography>
        {documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No documents reference this figure
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Owner</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.documentId}>
                    <TableCell>
                      <Link
                        href={`https://documents.figpack.org/view/${doc.documentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textDecoration: "none",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        {doc.title}
                      </Link>
                    </TableCell>
                    <TableCell>{doc.ownerEmail}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentReferences;
