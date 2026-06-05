import { z } from 'zod'

// mirror RateVendorDto: score @IsInt @Min(1) @Max(5) required · comment? @IsOptional @IsString
export const rateVendorSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

export type RateVendorFormValues = z.infer<typeof rateVendorSchema>
