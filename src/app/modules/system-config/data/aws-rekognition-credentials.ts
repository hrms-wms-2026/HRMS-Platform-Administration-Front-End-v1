export const AWS_REKOGNITION_SERVICE_KEY = 'aws_rekognition';

export const AWS_REKOGNITION_REGIONS = [
  { value: 'eu-west-2', label: 'Europe (London) — eu-west-2' },
  { value: 'eu-west-1', label: 'Europe (Ireland) — eu-west-1' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt) — eu-central-1' },
  { value: 'us-east-1', label: 'US East (N. Virginia) — us-east-1' },
  { value: 'us-east-2', label: 'US East (Ohio) — us-east-2' },
  { value: 'us-west-2', label: 'US West (Oregon) — us-west-2' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai) — ap-south-1' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) — ap-southeast-1' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) — ap-northeast-1' },
] as const;

export const AWS_REKOGNITION_DEFAULT_REGION = 'eu-west-2';

export function isAwsRekognitionServiceKey(serviceKey: string): boolean {
  return serviceKey === AWS_REKOGNITION_SERVICE_KEY;
}

export function buildAwsRekognitionBundle(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
): string {
  return JSON.stringify({
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    region: region.trim(),
  });
}

export function regionLabel(region: string): string {
  return AWS_REKOGNITION_REGIONS.find((item) => item.value === region)?.label ?? region;
}
