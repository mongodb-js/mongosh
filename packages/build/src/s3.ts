import type S3 from 'aws-sdk/clients/s3';

/**
 * The default ACL.
 */
const PUBLIC_READ = 'public-read';

/**
 * Takes a configured S3 instance and uploads its data.
 *
 * @param {any} params - The upload parameters.
 * @param {S3} s3 - The s3 service.
 *
 * @returns {Promise} - A Promise.
 */
const upload = (params: any, s3: S3): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    s3.upload(params, (error: Error | null, data: unknown) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

export default upload;
export { PUBLIC_READ };
