import { apiJson } from './client';

/** Matches backend `JobCard` / jobs handoff doc. */
export type JobCard = {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  sourceUrl: string;
  salaryRange?: string | null;
  jobType?: string | null;
  source: string;
  postedAt?: string | null;
  skills: string[];
  status: string;
};

type JobsPayload = { jobs: JobCard[] };

function parseJobsJson(json: unknown): {
  success: boolean;
  jobs: JobCard[];
  message: string | null;
} {
  let success = false;
  let message: string | null = null;
  const jobs: JobCard[] = [];
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (typeof o.success === 'boolean') success = o.success;
    if (o.message != null) message = String(o.message);
    const data = o.data;
    if (data && typeof data === 'object' && Array.isArray((data as JobsPayload).jobs)) {
      jobs.push(...(data as JobsPayload).jobs);
    }
  }
  return { success, jobs, message };
}

export async function fetchRecommendedJobs(token: string) {
  const res = await apiJson<JobsPayload>('/api/jobs/recommended', { method: 'GET', token });
  const parsed = parseJobsJson(res.json);
  return { ...res, ...parsed };
}

export async function refreshJobs(token: string, offset = 0) {
  const res = await apiJson<JobsPayload>('/api/jobs/refresh', {
    method: 'POST',
    token,
    body: JSON.stringify({ offset }),
  });
  const parsed = parseJobsJson(res.json);
  return { ...res, ...parsed };
}

export async function swipeJob(jobId: string, action: 'like' | 'pass' | 'apply', token: string) {
  return apiJson<{ jobId: string; status: string }>(`/api/jobs/${encodeURIComponent(jobId)}/swipe`, {
    method: 'POST',
    body: JSON.stringify({ action }),
    token,
  });
}
