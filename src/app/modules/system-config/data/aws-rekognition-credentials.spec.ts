import { buildAwsRekognitionBundle, isAwsRekognitionServiceKey } from './aws-rekognition-credentials';

describe('aws-rekognition-credentials', () => {
  it('identifies the rekognition service key', () => {
    expect(isAwsRekognitionServiceKey('aws_rekognition')).toBe(true);
    expect(isAwsRekognitionServiceKey('resend')).toBe(false);
  });

  it('serializes the JSON bundle the backend decrypts at runtime', () => {
    expect(
      buildAwsRekognitionBundle(' AKIAEXAMPLE ', 'secret-value', 'eu-west-2'),
    ).toBe(
      '{"accessKeyId":"AKIAEXAMPLE","secretAccessKey":"secret-value","region":"eu-west-2"}',
    );
  });
});
