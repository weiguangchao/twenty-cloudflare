import { fileTypeFromBuffer, supportedMimeTypes } from 'file-type/core';
import { lookup } from 'mrmime';
import sanitizeHtml from 'sanitize-html';
import { CORE_PICTURE_MIME_TYPES } from 'twenty-shared/constants';

import { MAX_SVG_BYTES } from '@/files/file.constants';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { apiError } from '@/shared/errors/api-error.util';

const sanitizeSvg = (source: string) => {
  const sanitized = sanitizeHtml(source, {
    allowedTags: [
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'text',
      'tspan',
      'defs',
      'clipPath',
      'mask',
      'linearGradient',
      'radialGradient',
      'stop',
      'use',
      'symbol',
      'pattern',
      'title',
      'desc',
    ],
    allowedAttributes: {
      '*': [
        'id',
        'fill',
        'fill-opacity',
        'fill-rule',
        'stroke',
        'stroke-width',
        'stroke-opacity',
        'stroke-linecap',
        'stroke-linejoin',
        'stroke-dasharray',
        'opacity',
        'transform',
        'clip-path',
        'mask',
      ],
      svg: [
        'xmlns',
        'width',
        'height',
        'viewBox',
        'preserveAspectRatio',
        'role',
        'aria-label',
      ],
      path: ['d', 'pathLength'],
      rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
      circle: ['cx', 'cy', 'r'],
      ellipse: ['cx', 'cy', 'rx', 'ry'],
      line: ['x1', 'x2', 'y1', 'y2'],
      polyline: ['points'],
      polygon: ['points'],
      text: ['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'text-anchor'],
      tspan: ['x', 'y', 'dx', 'dy'],
      use: ['href', 'xlink:href', 'x', 'y', 'width', 'height'],
      linearGradient: [
        'x1',
        'y1',
        'x2',
        'y2',
        'gradientUnits',
        'gradientTransform',
      ],
      radialGradient: [
        'cx',
        'cy',
        'r',
        'fx',
        'fy',
        'gradientUnits',
        'gradientTransform',
      ],
      stop: ['offset', 'stop-color', 'stop-opacity'],
      pattern: [
        'x',
        'y',
        'width',
        'height',
        'patternUnits',
        'patternTransform',
      ],
    },
    parser: {
      xmlMode: true,
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
    transformTags: {
      '*': (tagName, attributes) => {
        for (const [name, value] of Object.entries(attributes)) {
          if (
            (['fill', 'stroke', 'clip-path', 'mask'].includes(name) &&
              /\\|\/\*|[\x00-\x1f]/.test(value)) ||
            (['href', 'xlink:href'].includes(name) &&
              !/^#[a-zA-Z_][\w.-]*$/.test(value)) ||
            (/url\s*\(/i.test(value) &&
              !/^url\(\s*['"]?#[a-zA-Z_][\w.-]*['"]?\s*\)$/.test(value))
          )
            delete attributes[name];
        }
        if (tagName === 'svg') attributes.xmlns = 'http://www.w3.org/2000/svg';
        return { tagName, attribs: attributes };
      },
    },
    nonTextTags: ['script', 'style', 'textarea', 'option', 'foreignObject'],
  }).trim();
  if (!/^<svg[\s>]/.test(sanitized) || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw apiError('Invalid SVG content');
  return new TextEncoder().encode(sanitized);
};

export const validateFileContent = async (
  bucket: R2Bucket,
  file: WorkspaceFile,
) => {
  const metadata = await bucket.head(file.storageKey);
  const alreadySanitized =
    metadata?.customMetadata?.sanitizedFileId === file.id &&
    metadata.customMetadata.declaredSize === String(file.declaredSize);
  if (!metadata || (metadata.size !== file.declaredSize && !alreadySanitized))
    throw apiError('The uploaded file does not match its declared size');
  const prefix = await bucket.get(file.storageKey, {
    range: { offset: 0, length: Math.min(metadata.size, 8192) },
  });
  if (!prefix) throw apiError('File has not been uploaded');
  const bytes = new Uint8Array(await prefix.arrayBuffer());
  const text = new TextDecoder()
    .decode(bytes)
    .replace(/^\uFEFF/, '')
    .trimStart();
  let detected: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    detected = await fileTypeFromBuffer(bytes);
  } catch {
    throw apiError('Invalid file content');
  }
  const extension = file.filename.split('.').at(-1)!.toLowerCase();
  const fallback = ['ts', 'tsx'].includes(extension)
    ? 'application/typescript'
    : lookup(extension);
  const isSvg = /^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
    text,
  );
  if (!detected && !isSvg && fallback && supportedMimeTypes.has(fallback))
    throw apiError('The file extension does not match its content');
  const mimeType =
    detected?.mime ??
    (isSvg ? 'image/svg+xml' : (fallback ?? 'application/octet-stream'));
  if (
    file.folder === 'core-picture' &&
    !CORE_PICTURE_MIME_TYPES.some((allowed) => allowed === mimeType)
  )
    throw apiError('This file type is not allowed for a picture');
  if (mimeType !== 'image/svg+xml') return { size: metadata.size, mimeType };
  if (metadata.size > MAX_SVG_BYTES)
    throw apiError(
      'SVG exceeds the maximum allowed size',
      'BAD_USER_INPUT',
      'FILE_TOO_LARGE',
    );
  const source = await bucket.get(file.storageKey, {
    onlyIf: { etagMatches: metadata.etag },
  });
  if (!source || !('body' in source))
    throw apiError('File changed during completion', 'CONFLICT');
  const sanitized = sanitizeSvg(await source.text());
  if (
    !(await bucket.put(file.storageKey, sanitized, {
      onlyIf: { etagMatches: metadata.etag },
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        sanitizedFileId: file.id,
        declaredSize: String(file.declaredSize),
      },
    }))
  )
    throw apiError('File changed during completion', 'CONFLICT');
  return { size: sanitized.byteLength, mimeType };
};
