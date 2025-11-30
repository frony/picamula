/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaUpload } from './use-media-upload';
import * as mediaUpload from '../lib/media-upload';

jest.mock('../lib/media-upload', () => ({
  compressImage: jest.fn(),
  compressVideo: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('./use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useMediaUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMediaUpload());

    expect(result.current.mediaFiles).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('should add and compress image files', async () => {
    const mockCompressedFile = new File(['compressed'], 'compressed.jpg', {
      type: 'image/jpeg',
    });

    (mediaUpload.compressImage as jest.Mock).mockResolvedValue(mockCompressedFile);

    const { result } = renderHook(() => useMediaUpload());
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    await waitFor(() => {
      expect(result.current.mediaFiles).toHaveLength(1);
      expect(result.current.mediaFiles[0].status).toBe('completed');
    });
  });

  it('should reject invalid file types', async () => {
    const { result } = renderHook(() => useMediaUpload());
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    await waitFor(() => {
      expect(result.current.mediaFiles[0].status).toBe('error');
    });
  });

  it('should remove a file by id', async () => {
    const mockCompressedFile = new File(['compressed'], 'compressed.jpg', {
      type: 'image/jpeg',
    });

    (mediaUpload.compressImage as jest.Mock).mockResolvedValue(mockCompressedFile);

    const { result } = renderHook(() => useMediaUpload());
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.addFiles([mockFile]);
    });

    let fileId: string;
    await waitFor(() => {
      fileId = result.current.mediaFiles[0].id;
    });

    act(() => {
      result.current.removeFile(fileId!);
    });

    expect(result.current.mediaFiles).toHaveLength(0);
  });
});
