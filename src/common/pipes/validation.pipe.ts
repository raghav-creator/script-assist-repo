import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: ValidationError[]): string[] {
    const result: string[] = [];

    const traverse = (errs: ValidationError[], parentPath = '') => {
      errs.forEach((err) => {
        const path = parentPath ? `${parentPath}.${err.property}` : err.property;

        if (err.constraints) {
          result.push(...Object.values(err.constraints).map(msg => `${path}: ${msg}`));
        }

        if (err.children && err.children.length > 0) {
          traverse(err.children, path);
        }
      });
    };

    traverse(errors);
    return result;
  }
}
