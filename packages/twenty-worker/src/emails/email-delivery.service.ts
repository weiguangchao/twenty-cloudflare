import { normalizeEmail } from '@/auth/credentials.service';
import { renderTransactionalEmail } from '@/emails/render-transactional-email.util';
import { type EmailJob } from '@/emails/types/email-job.type';
import { apiError } from '@/shared/errors/api-error.util';

export const requireEmailSending = (env: Env) => {
  if (!env.EMAIL || !env.EMAIL_FROM)
    throw apiError('Email sending is not configured', 'NOT_IMPLEMENTED');
  return { binding: env.EMAIL, from: normalizeEmail(env.EMAIL_FROM) };
};

export const enqueueEmail = async (
  env: Env,
  job: EmailJob,
  expiresAt: number,
) => {
  requireEmailSending(env);
  const id = crypto.randomUUID();
  await env.CORE_DB.prepare(
    'INSERT INTO "emailDelivery" ("id", "payload", "availableAt", "expiresAt", "createdAt") VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      JSON.stringify(job),
      Date.now(),
      expiresAt,
      new Date().toISOString(),
    )
    .run();
  try {
    await env.JOBS.send({ kind: 'email-send', jobId: id });
  } catch {
    // The scheduled dispatcher retries the persisted job if Queue is unavailable.
  }
  return id;
};

export const deliverEmail = async (env: Env, id: string) => {
  const { binding, from } = requireEmailSending(env);
  const job = await env.CORE_DB.prepare(
    'UPDATE "emailDelivery" SET "status" = \'sending\', "leaseUntil" = ?, "attempts" = "attempts" + 1 WHERE "id" = ? AND "expiresAt" > ? AND "attempts" < 10 AND (("status" = \'pending\' AND "availableAt" <= ?) OR ("status" = \'sending\' AND "leaseUntil" <= ?)) RETURNING "payload", "attempts"',
  )
    .bind(Date.now() + 60_000, id, Date.now(), Date.now(), Date.now())
    .first<{ payload: string; attempts: number }>();
  if (!job) {
    const existing = await env.CORE_DB.prepare(
      'SELECT "status", "expiresAt", "attempts" FROM "emailDelivery" WHERE "id" = ?',
    )
      .bind(id)
      .first<{ status: string; expiresAt: number; attempts: number }>();
    if (
      existing &&
      existing.status !== 'sent' &&
      existing.expiresAt > Date.now() &&
      existing.attempts < 10
    )
      throw new Error(
        'Email delivery is already leased or scheduled for retry',
      );
    return;
  }
  try {
    const payload = JSON.parse(job.payload) as EmailJob;
    const content = await renderTransactionalEmail(payload);
    await binding.send({
      from,
      to: payload.to,
      ...content,
      headers: { 'X-Twenty-Delivery-Id': id },
    });
    await env.CORE_DB.prepare(
      'UPDATE "emailDelivery" SET "status" = \'sent\', "payload" = \'{}\', "leaseUntil" = NULL WHERE "id" = ? AND "attempts" = ?',
    )
      .bind(id, job.attempts)
      .run();
  } catch {
    await env.CORE_DB.prepare(
      'UPDATE "emailDelivery" SET "status" = \'pending\', "leaseUntil" = NULL, "availableAt" = ? WHERE "id" = ? AND "attempts" = ?',
    )
      .bind(
        Date.now() + Math.min(3_600_000, 1000 * 2 ** job.attempts),
        id,
        job.attempts,
      )
      .run();
    throw new Error('Transactional email delivery failed');
  }
};

export const dispatchPendingEmails = async (env: Env) => {
  const jobs = await env.CORE_DB.prepare(
    'SELECT "id" FROM "emailDelivery" WHERE "status" != \'sent\' AND "attempts" < 10 AND "availableAt" <= ? AND ("leaseUntil" IS NULL OR "leaseUntil" <= ?) AND "expiresAt" > ? LIMIT 50',
  )
    .bind(Date.now(), Date.now(), Date.now())
    .all<{ id: string }>();
  if (jobs.results.length)
    await env.JOBS.sendBatch(
      jobs.results.map((job) => ({
        body: { kind: 'email-send', jobId: job.id },
      })),
    );
  await env.CORE_DB.prepare(
    'DELETE FROM "emailDelivery" WHERE "expiresAt" <= ? OR "status" = \'sent\'',
  )
    .bind(Date.now())
    .run();
};
