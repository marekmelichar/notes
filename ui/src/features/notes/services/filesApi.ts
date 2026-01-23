import { apiManager } from '@/lib';

const API_BASE = '/api/v1';

export interface FileUploadResponse {
  id: string;
  url: string;
  originalFilename: string;
  contentType: string;
  size: number;
}

export const filesApi = {
  async upload(file: File, noteId?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) {
      formData.append('noteId', noteId);
    }
    const response = await apiManager.post<FileUploadResponse>(
      `${API_BASE}/files`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  getDownloadUrl(fileId: string): string {
    return `${API_BASE}/files/${fileId}`;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/files/${id}`);
  },
};
