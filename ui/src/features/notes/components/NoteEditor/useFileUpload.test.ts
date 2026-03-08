import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { isImageFile } from './useFileUpload';

// Mock dependencies before importing the hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

vi.mock('@/lib', () => ({
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

const mockUpload = vi.fn();
vi.mock('../../services/filesApi', () => ({
  filesApi: {
    upload: (...args: unknown[]) => mockUpload(...args),
  },
}));

// Import after mocks are set up
import { useFileUpload } from './useFileUpload';
import { enqueueSnackbar } from 'notistack';

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('isImageFile', () => {
  it('should return true for image MIME types', () => {
    expect(isImageFile(createFile('photo.jpg', 100, 'image/jpeg'))).toBe(true);
    expect(isImageFile(createFile('icon.png', 100, 'image/png'))).toBe(true);
    expect(isImageFile(createFile('anim.gif', 100, 'image/gif'))).toBe(true);
    expect(isImageFile(createFile('pic.webp', 100, 'image/webp'))).toBe(true);
  });

  it('should return false for non-image MIME types', () => {
    expect(isImageFile(createFile('doc.pdf', 100, 'application/pdf'))).toBe(false);
    expect(isImageFile(createFile('file.txt', 100, 'text/plain'))).toBe(false);
    expect(isImageFile(createFile('data.zip', 100, 'application/zip'))).toBe(false);
  });

  it('should return false for empty type', () => {
    expect(isImageFile(createFile('unknown', 100, ''))).toBe(false);
  });
});

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: browser is online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const response = { id: '1', url: '/files/1', originalFilename: 'test.pdf', contentType: 'application/pdf', size: 500 };
      mockUpload.mockResolvedValue(response);

      const { result } = renderHook(() => useFileUpload('note-1'));
      const file = createFile('test.pdf', 500, 'application/pdf');

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile(file);
      });

      expect(uploadResult).toEqual(response);
      expect(mockUpload).toHaveBeenCalledWith(file, 'note-1');
    });

    it('should return null and show error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useFileUpload('note-1'));
      const file = createFile('test.pdf', 500, 'application/pdf');

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile(file);
      });

      expect(uploadResult).toBeNull();
      expect(enqueueSnackbar).toHaveBeenCalledWith('Files.OfflineError', { variant: 'error' });
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should return null and show error when file exceeds 100 MB', async () => {
      const { result } = renderHook(() => useFileUpload('note-1'));
      const file = createFile('huge.zip', 104_857_601, 'application/zip'); // 100 MB + 1 byte

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile(file);
      });

      expect(uploadResult).toBeNull();
      expect(enqueueSnackbar).toHaveBeenCalledWith('Files.TooLarge', { variant: 'error' });
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should accept files at exactly 100 MB', async () => {
      mockUpload.mockResolvedValue({ id: '1', url: '/files/1', originalFilename: 'big.zip', contentType: 'application/zip', size: 104_857_600 });

      const { result } = renderHook(() => useFileUpload('note-1'));
      const file = createFile('big.zip', 104_857_600, 'application/zip'); // exactly 100 MB

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile(file);
      });

      expect(uploadResult).not.toBeNull();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should return null and show error on API failure', async () => {
      mockUpload.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFileUpload('note-1'));
      const file = createFile('test.pdf', 500, 'application/pdf');

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile(file);
      });

      expect(uploadResult).toBeNull();
      expect(enqueueSnackbar).toHaveBeenCalledWith('Files.UploadError', { variant: 'error' });
    });

    it('should pass noteId to API', async () => {
      mockUpload.mockResolvedValue({ id: '1', url: '/files/1', originalFilename: 'test.pdf', contentType: 'application/pdf', size: 500 });

      const { result } = renderHook(() => useFileUpload('my-note-42'));
      const file = createFile('test.pdf', 500, 'application/pdf');

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(mockUpload).toHaveBeenCalledWith(file, 'my-note-42');
    });

    it('should pass undefined noteId when not provided', async () => {
      mockUpload.mockResolvedValue({ id: '1', url: '/files/1', originalFilename: 'test.pdf', contentType: 'application/pdf', size: 500 });

      const { result } = renderHook(() => useFileUpload());
      const file = createFile('test.pdf', 500, 'application/pdf');

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(mockUpload).toHaveBeenCalledWith(file, undefined);
    });
  });
});
