import {
  getNamedType,
  isInputObjectType,
  isScalarType,
  isListType,
  isNonNullType,
} from 'graphql';
import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';
import { CurrencyCode } from 'crm-shared/constants';
import {
  emailSchema,
  isPlainObject,
  isValidCountryCode,
  isValidDomain,
  isValidUuid,
  getCountryCodesForCallingCode,
  getLinkUrlNormalizer,
  richTextDocumentSchema,
  isSafeUrl,
} from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { COMPOSITE_GRAPHQL_TYPES } from '@/workspace/record-api/record-catalog.util';
import { RECORD_COMPOSITE_NULL_EQUIVALENTS } from '@/workspace/record-api/record-null-equivalents.constant';
import {
  type RecordData,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';
import { MAX_RECORD_VALUE_BYTES } from '@/workspace/record-api/mutations/record-mutation.constants';

const invalid: (name: string) => never = (name) => {
  throw apiError(
    `Invalid value for ${name}`,
    'BAD_USER_INPUT',
    'INVALID_ARGS_DATA',
  );
};
const text = (value: unknown, name: string) => {
  if (value !== null && typeof value !== 'string') invalid(name);
  return value === '' ? null : (value as string | null);
};
const numeric = (value: unknown, name: string) => {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !Number.isFinite(Number(value)) ||
    Math.abs(Number(value)) > Number.MAX_SAFE_INTEGER
  )
    invalid(name);
  return Number(value);
};

const validateLegacyContentUrls = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.every(validateLegacyContentUrls)
    : !isPlainObject(value) ||
      Object.entries(value).every(([key, item]) =>
        ['url', 'src', 'href'].includes(key) &&
        typeof item === 'string' &&
        item.trim()
          ? isSafeUrl(item)
          : validateLegacyContentUrls(item),
      );

const normalizePhone = (value: RecordData, primary: boolean) => {
  const numberName = primary ? 'primaryPhoneNumber' : 'number';
  const countryName = primary ? 'primaryPhoneCountryCode' : 'countryCode';
  const callingName = primary ? 'primaryPhoneCallingCode' : 'callingCode';
  const number = value[numberName],
    country = value[countryName],
    calling =
      typeof value[callingName] === 'string'
        ? value[callingName].replace(/^\+/, '')
        : value[callingName];
  if (country && (typeof country !== 'string' || !isValidCountryCode(country)))
    invalid(countryName);
  if (
    calling &&
    (typeof calling !== 'string' ||
      !getCountryCodesForCallingCode(calling).length ||
      (country &&
        !getCountryCodesForCallingCode(calling).includes(
          country as CountryCode,
        )))
  )
    invalid(callingName);
  if (number === null || number === undefined || number === '')
    return { ...value, [numberName]: number === '' ? null : number };
  if (typeof number !== 'string' || /\p{L}/u.test(number)) invalid(numberName);
  try {
    const phone = parsePhoneNumberWithError(number, {
      defaultCountry: country as CountryCode | undefined,
      defaultCallingCode: calling as string | undefined,
    });
    if (
      !phone.isPossible() ||
      (country && phone.country && country !== phone.country) ||
      (calling && calling !== phone.countryCallingCode)
    )
      invalid(numberName);
    return {
      ...value,
      [numberName]: phone.nationalNumber,
      [countryName]: phone.country ?? country ?? null,
      [callingName]: phone.countryCallingCode,
    };
  } catch {
    return invalid(numberName);
  }
};

export const normalizeRecordField = (
  context: RecordQueryContext,
  field: FieldMetadataRow,
  input: unknown,
  before?: unknown,
): unknown => {
  const name = field.name;
  const serialized = JSON.stringify(input);
  if (
    serialized &&
    new TextEncoder().encode(serialized).length > MAX_RECORD_VALUE_BYTES
  )
    invalid(name);
  if (input === null) {
    if (!field.isNullable) invalid(name);
    return null;
  }
  if (COMPOSITE_GRAPHQL_TYPES[field.type]) {
    if (!isPlainObject(input)) invalid(name);
    const definition = context.schema.getType(
      `${COMPOSITE_GRAPHQL_TYPES[field.type]}CreateInput`,
    );
    if (!isInputObjectType(definition)) invalid(name);
    const result: RecordData = {
      ...RECORD_COMPOSITE_NULL_EQUIVALENTS[field.type],
      ...(isPlainObject(before) ? before : {}),
    };
    for (const [key, value] of Object.entries(input)) {
      const property = definition.getFields()[key];
      if (!property) invalid(`${name}.${key}`);
      const type = getNamedType(property.type);
      result[key] =
        value === null
          ? null
          : !isListType(
                isNonNullType(property.type)
                  ? property.type.ofType
                  : property.type,
              ) &&
              isScalarType(type) &&
              type.name === 'String'
            ? text(value, `${name}.${key}`)
            : value;
    }
    if (field.type === 'EMAILS') {
      const emails = [
        result.primaryEmail,
        ...(Array.isArray(result.additionalEmails)
          ? result.additionalEmails
          : []),
      ];
      for (const email of emails)
        if (
          email &&
          (typeof email !== 'string' || !emailSchema.safeParse(email).success)
        )
          invalid(name);
      if (result.primaryEmail)
        result.primaryEmail = String(result.primaryEmail).trim().toLowerCase();
      if (Array.isArray(result.additionalEmails))
        result.additionalEmails = result.additionalEmails.map((email) =>
          String(email).trim().toLowerCase(),
        );
    }
    if (field.type === 'LINKS') {
      const normalize = getLinkUrlNormalizer(
        field.settings?.type === 'domain' ? 'domain' : 'url',
      );
      if (typeof result.primaryLinkUrl === 'string')
        result.primaryLinkUrl = normalize(result.primaryLinkUrl);
      if (Array.isArray(result.secondaryLinks))
        result.secondaryLinks = result.secondaryLinks.map((link) =>
          isPlainObject(link) && typeof link.url === 'string'
            ? { ...link, url: normalize(link.url) }
            : link,
        );
      if (field.settings?.type === 'domain') {
        for (const url of [
          result.primaryLinkUrl,
          ...(Array.isArray(result.secondaryLinks)
            ? result.secondaryLinks.map((link) =>
                isPlainObject(link) ? link.url : undefined,
              )
            : []),
        ])
          if (url && (typeof url !== 'string' || !isValidDomain(url)))
            invalid(name);
      }
    }
    if (field.type === 'CURRENCY') {
      if (result.amountMicros !== undefined && result.amountMicros !== null)
        result.amountMicros = numeric(result.amountMicros, name);
      if (
        result.currencyCode &&
        !Object.values<string>(CurrencyCode).includes(
          String(result.currencyCode),
        )
      )
        invalid(name);
    }
    if (field.type === 'RICH_TEXT') {
      for (const key of ['tiptap', 'blocknote'])
        if (typeof result[key] === 'string' && result[key]) {
          let content: unknown;
          try {
            content = JSON.parse(result[key]);
          } catch {
            invalid(name);
          }
          if (
            key === 'tiptap'
              ? !richTextDocumentSchema.safeParse(content).success
              : !Array.isArray(content) || !validateLegacyContentUrls(content)
          )
            invalid(name);
        }
    }
    if (field.type === 'ADDRESS')
      for (const key of ['addressLat', 'addressLng'])
        if (result[key] !== undefined && result[key] !== null)
          result[key] = numeric(result[key], name);
    if (field.type === 'PHONES') {
      Object.assign(result, normalizePhone(result, true));
      if (Array.isArray(result.additionalPhones))
        result.additionalPhones = result.additionalPhones.map((phone) =>
          isPlainObject(phone) ? normalizePhone(phone, false) : invalid(name),
        );
    }
    return result;
  }
  if (
    field.options &&
    ['SELECT', 'RATING', 'MULTI_SELECT'].includes(field.type)
  ) {
    const values = field.type === 'MULTI_SELECT' ? input : [input];
    if (
      !Array.isArray(values) ||
      values.some(
        (value) => !field.options!.some((option) => option.value === value),
      )
    )
      invalid(name);
    return field.type === 'MULTI_SELECT' ? [...new Set(values)] : input;
  }
  switch (field.type) {
    case 'TEXT':
      return text(input, name);
    case 'UUID':
      if (typeof input !== 'string' || !isValidUuid(input)) invalid(name);
      return input.toLowerCase();
    case 'NUMBER':
    case 'NUMERIC':
      return numeric(input, name);
    case 'BOOLEAN':
      if (typeof input !== 'boolean') invalid(name);
      return input;
    case 'DATE_TIME': {
      const date = new Date(input as string);
      if (!Number.isFinite(date.getTime())) invalid(name);
      return date.toISOString();
    }
    case 'DATE':
      if (
        typeof input !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input) ||
        new Date(input).toISOString().slice(0, 10) !== input
      )
        invalid(name);
      return input;
    case 'ARRAY':
      if (
        !Array.isArray(input) ||
        input.some((value) => typeof value !== 'string')
      )
        invalid(name);
      return input;
    case 'FILES':
      if (
        !Array.isArray(input) ||
        input.length > Number(field.settings?.maxNumberOfValues ?? 100) ||
        input.some(
          (file) =>
            !isPlainObject(file) ||
            typeof file.fileId !== 'string' ||
            !isValidUuid(file.fileId) ||
            typeof file.label !== 'string',
        )
      )
        invalid(name);
      return (input as { fileId: string; label: string }[]).map((item) => {
        const file = new WorkspaceFileStore(context.sql).find(item.fileId);
        if (
          !file ||
          file.status !== 'UPLOADED' ||
          file.fieldMetadataId !== field.id
        )
          throw apiError(
            'File is not available for this field',
            'BAD_USER_INPUT',
          );
        return { fileId: item.fileId, label: item.label };
      });
    case 'RAW_JSON':
      if (typeof input === 'string') {
        try {
          return JSON.parse(input) as unknown;
        } catch {
          invalid(name);
        }
      }
      return input;
    case 'POSITION':
      if (input === 'first' || input === 'last') return input;
      return numeric(input, name);
    default:
      invalid(name);
  }
};
