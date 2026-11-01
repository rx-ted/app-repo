import { ApiProperty } from '@rx-ted/packages-honest-plugins/api-doc';

export class HelloRequestDto {
  @ApiProperty({ type: String, required: true, description: 'Name to greet', example: 'world', minLength: 1, maxLength: 50 })
  name!: string;

  @ApiProperty({ type: Number, required: false, description: 'Repeat count', example: 1, minimum: 1, maximum: 10 })
  repeat?: number;
}

export class HelloResponseDto {
  @ApiProperty({ type: String, description: 'Greeting message', example: 'Hello, world!' })
  message!: string;

  @ApiProperty({ type: Number, required: false, description: 'HTTP status code', example: 200 })
  status?: number;
}
