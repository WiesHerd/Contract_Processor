/**
 * Test setup file for Vitest
 */

import { vi } from 'vitest';

// Mock window.showSaveFilePicker for file system access tests
Object.defineProperty(window, 'showSaveFilePicker', {
  value: vi.fn(),
  writable: true,
});

// Mock window.showDirectoryPicker for file system access tests
Object.defineProperty(window, 'showDirectoryPicker', {
  value: vi.fn(),
  writable: true,
});

// Mock FileSystemFileHandle
global.FileSystemFileHandle = {
  kind: 'file',
  name: 'test-file.docx',
  getFile: vi.fn(),
  createWritable: vi.fn(),
} as any;

// Mock FileSystemWritableFileStream
global.FileSystemWritableFileStream = {
  write: vi.fn(),
  seek: vi.fn(),
  truncate: vi.fn(),
} as any; 