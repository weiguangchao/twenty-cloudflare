import { apiError } from '@/shared/errors/api-error.util';
import {
  executeRecordSql,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

type OffsetPeriod = { start: number; minutes: number };
const periodsByZoneYear = new Map<string, OffsetPeriod[]>();

const offsetPeriods = (timeZone: string, year: number): OffsetPeriod[] => {
  const key = `${timeZone}:${year}`;
  const cached = periodsByZoneYear.get(key);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
  } catch {
    throw apiError('Invalid time zone');
  }
  const offset = (timestamp: number) => {
    const name = formatter
      .formatToParts(timestamp)
      .find((part) => part.type === 'timeZoneName')!.value;
    const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name);
    return match
      ? (Number(match[2]) * 60 +
          Number(match[3]) +
          Number(match[4] ?? 0) / 60) *
          (match[1] === '-' ? -1 : 1)
      : 0;
  };
  const start = Date.parse(
    `${String(year).padStart(4, '0')}-01-01T00:00:00.000Z`,
  );
  const end = Date.parse(
    `${String(year + 1).padStart(4, '0')}-01-01T00:00:00.000Z`,
  );
  const periods: OffsetPeriod[] = [{ start, minutes: offset(start) }];
  for (let day = start + 86_400_000; day <= end; day += 86_400_000) {
    const minutes = offset(day);
    if (minutes === periods.at(-1)!.minutes) continue;
    let lower = day - 86_400_000,
      upper = day;
    while (upper - lower > 1000) {
      const midpoint = Math.floor((lower + upper) / 2000) * 1000;
      if (offset(midpoint) === minutes) upper = midpoint;
      else lower = midpoint;
    }
    if (upper < end) periods.push({ start: upper, minutes });
  }
  if (periodsByZoneYear.size >= 128) periodsByZoneYear.clear();
  periodsByZoneYear.set(key, periods);
  return periods;
};

export const timeZoneModifier = (
  context: RecordQueryContext,
  object: RecordObject,
  column: string,
  timeZone: string,
) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw apiError('Invalid time zone');
  }
  const years = executeRecordSql(
    context.sql,
    `SELECT DISTINCT CAST(strftime('%Y', ${column}) AS INTEGER) AS "year" FROM ${recordTable(object)} AS "record" WHERE ${column} IS NOT NULL ORDER BY "year"`,
  );
  const clauses = years.flatMap(({ year }) => {
    const periods = offsetPeriods(timeZone, Number(year));
    return periods.map((period, index) => {
      const end =
        periods[index + 1]?.start ??
        Date.parse(`${Number(year) + 1}-01-01T00:00:00.000Z`);
      return `WHEN ${column} >= '${new Date(period.start).toISOString()}' AND ${column} < '${new Date(end).toISOString()}' THEN '${period.minutes} minutes'`;
    });
  });
  return clauses.length
    ? `CASE ${clauses.join(' ')} ELSE '0 minutes' END`
    : "'0 minutes'";
};
