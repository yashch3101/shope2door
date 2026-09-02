import {
  IsInt,
  Min,
} from 'class-validator';

export class UpdateProductStockDto {
  @IsInt({
    message: 'Stock must be an integer',
  })
  @Min(0, {
    message: 'Stock cannot be negative',
  })
  stock: number;
}