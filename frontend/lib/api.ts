import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UploadResponse {
  uuid: string;
  dimensions: {
    width: number;
    height: number;
  };
  url: string;
}

export const api = axios.create({
  baseURL: API_URL,
});

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadResponse>("/api/upload", formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
}

export function getImageUrl(uuid: string): string {
  return `${API_URL}/api/uploads/${uuid}`;
}
