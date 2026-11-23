import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
export const useFieldsWidgetFields = (
  objectMetadataItem: EnrichedObjectMetadataItem | undefined,
) => objectMetadataItem?.readableFields ?? [];
