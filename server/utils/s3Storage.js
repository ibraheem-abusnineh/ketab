const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const bucketName = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';

let s3Client = null;
if (bucketName) {
  s3Client = new S3Client({ region });
}

function isConfigured() {
  return !!s3Client;
}

async function readJSON(key, defaultValue = null) {
  if (!s3Client) return defaultValue;
  try {
    const cmd = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const response = await s3Client.send(cmd);
    const body = await response.Body.transformToString();
    return JSON.parse(body);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return defaultValue;
    }
    console.error(`Error reading s3://${bucketName}/${key}:`, error);
    return defaultValue;
  }
}

async function writeJSON(key, data) {
  if (!s3Client) return false;
  try {
    const cmd = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });
    await s3Client.send(cmd);
    return true;
  } catch (error) {
    console.error(`Error writing s3://${bucketName}/${key}:`, error);
    return false;
  }
}

module.exports = { readJSON, writeJSON, isConfigured };
