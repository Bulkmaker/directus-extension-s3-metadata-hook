/**
 * S3 Metadata Hook
 *
 * Sets Content-Disposition header on S3 uploads so files can be downloaded
 * with original filenames when accessed directly via S3/CDN URL.
 *
 * Example:
 *   files.site.ru/abc123.jpg → Downloads as "original-name.jpg"
 */

import { defineHook } from '@directus/extensions-sdk';
import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export default defineHook(({ action }, { env, logger }) => {
	// Check if S3 storage is configured
	if (env['STORAGE_S3_DRIVER'] !== 's3') {
		logger.info('[s3-metadata] S3 storage not configured, hook disabled');
		return;
	}

	// Initialize S3 client
	const s3Client = new S3Client({
		region: env['STORAGE_S3_REGION'] || 'us-east-1',
		endpoint: env['STORAGE_S3_ENDPOINT'],
		credentials: {
			accessKeyId: env['STORAGE_S3_KEY'],
			secretAccessKey: env['STORAGE_S3_SECRET'],
		},
		forcePathStyle: true, // Required for most S3-compatible services
	});

	const bucket = env['STORAGE_S3_BUCKET'];
	const root = env['STORAGE_S3_ROOT'] || '';

	action('files.upload', async ({ payload, key }) => {
		try {
			const filenameDisk = payload.filename_disk;
			const filenameDownload = payload.filename_download;
			const contentType = payload.type;

			if (!filenameDisk || !filenameDownload) {
				logger.warn('[s3-metadata] Missing filename data, skipping');
				return;
			}

			// Build S3 key (with root prefix if configured)
			const s3Key = root ? `${root}/${filenameDisk}` : filenameDisk;
			const copySource = `${bucket}/${s3Key}`;

			// Sanitize filename for Content-Disposition header
			// RFC 5987: filename*=UTF-8''encoded-filename
			const encodedFilename = encodeURIComponent(filenameDownload)
				.replace(/'/g, '%27')
				.replace(/\(/g, '%28')
				.replace(/\)/g, '%29');

			// Get current object metadata to preserve it
			let existingMetadata: Record<string, string> = {};
			try {
				const headResponse = await s3Client.send(new HeadObjectCommand({
					Bucket: bucket,
					Key: s3Key,
				}));
				existingMetadata = headResponse.Metadata || {};
			} catch (err) {
				// Object might not have metadata, continue anyway
			}

			// Copy object to itself with updated metadata
			await s3Client.send(new CopyObjectCommand({
				Bucket: bucket,
				Key: s3Key,
				CopySource: copySource,
				ContentType: contentType,
				ContentDisposition: `inline; filename="${filenameDownload}"; filename*=UTF-8''${encodedFilename}`,
				Metadata: existingMetadata,
				MetadataDirective: 'REPLACE',
			}));

			logger.info(`[s3-metadata] Set Content-Disposition for ${filenameDisk} → "${filenameDownload}"`);
		} catch (error: any) {
			logger.error(`[s3-metadata] Failed to update metadata: ${error.message}`);
		}
	});
});
