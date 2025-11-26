/**
 * @jest-environment jsdom
 */
import { compressImage, compressVideo } from './media-upload';

// Mock FFmpeg
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    exec: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

jest.mock('@ffmpeg/util', () => ({
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  toBlobURL: jest.fn().mockResolvedValue('blob:mock-url'),
}));

describe('media-upload', () => {
  describe('compressImage', () => {
    let mockCanvas: any;
    let mockContext: any;
    let mockImage: any;

    beforeEach(() => {
      mockContext = {
        drawImage: jest.fn(),
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(mockContext),
        toBlob: jest.fn(),
      };

      global.document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return {};
      });

      mockImage = {
        onload: null,
        onerror: null,
        src: '',
        width: 3000,
        height: 2000,
      };

      global.Image = jest.fn().mockImplementation(() => mockImage) as any;

      global.FileReader = jest.fn().mockImplementation(() => ({
        readAsDataURL: jest.fn(function(this: any) {
          setTimeout(() => {
            this.result = 'data:image/jpeg;base64,fake';
            if (this.onload) {
              this.onload({ target: { result: this.result } });
            }
          }, 0);
        }),
        onload: null,
        onerror: null,
        result: null,
      })) as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should compress an image and convert to JPEG', async () => {
      const mockFile = new File(['fake-image-data'], 'test.png', {
        type: 'image/png',
      });

      mockCanvas.toBlob.mockImplementation((callback: any) => {
        const blob = new Blob(['compressed-data'], { type: 'image/jpeg' });
        callback(blob);
      });

      const result = await compressImage(mockFile);

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toMatch(/\.jpg$/);
    });

    it('should handle compression errors gracefully', async () => {
      const mockFile = new File(['fake-image-data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      mockCanvas.toBlob.mockImplementation((callback: any) => {
        callback(null);
      });

      await expect(compressImage(mockFile)).rejects.toThrow('Failed to create blob');
    });
  });

  describe('compressVideo', () => {
    it('should compress a video to MP4/H.264', async () => {
      const mockFile = new File(['fake-video-data'], 'test.mov', {
        type: 'video/quicktime',
      });

      const result = await compressVideo(mockFile);

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe('video/mp4');
    });

    it('should call FFmpeg with correct parameters', async () => {
      const { FFmpeg } = require('@ffmpeg/ffmpeg');
      const mockFile = new File(['fake-video-data'], 'test.mp4', {
        type: 'video/mp4',
      });

      const mockFFmpegInstance = new FFmpeg();

      await compressVideo(mockFile, 1920, '2M');

      expect(mockFFmpegInstance.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-b:v', '2M',
        '-vf', expect.stringContaining("scale='min(1920,iw)"),
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        'output.mp4'
      ]);
    });
  });
});
