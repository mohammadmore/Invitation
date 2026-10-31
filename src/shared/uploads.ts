export type UploadKind = 'image' | 'video' | 'audio' | 'font';

/** Accepted extensions and size limits (MB) – enforced by the server, pre-checked by the wizard. */
export const UPLOAD_RULES: Record<UploadKind, { exts: string[]; maxMb: number }> = {
  image: { exts: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'], maxMb: 5 },
  video: { exts: ['mp4', 'webm', 'mov', 'm4v'], maxMb: 40 },
  audio: { exts: ['mp3', 'm4a', 'ogg', 'aac', 'wav'], maxMb: 15 },
  font: { exts: ['woff2', 'woff', 'ttf', 'otf'], maxMb: 5 },
};

/** Video formats that need server-side conversion before browsers (esp. iPhone) can play them. */
export const NEEDS_TRANSCODE = ['mov', 'm4v'];

/** Above this size a background video is too heavy for guests on mobile data. */
export const VIDEO_WARN_MB = 8;

export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
