import { apiJson } from './client';

// ---------------------------------------------------------------------------
// ML API client — talks to the backend which proxies to the ML server
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------
export type FakeJobPrediction = {
  isFake: boolean;
  confidence: number;
  label: string; // "Real" | "Fake"
};

export type ResumeGenResult = {
  generatedText: string;
  section: string;
  engine?: string;
  extractedText?: string | null;
  extractedTextPreview?: string | null;
  extractedTextLength?: number;
};

export type MlHealthData = {
  status: string;
  fakeJobModelLoaded: boolean;
  resumeModelLoaded: boolean;
};

// ---- Health check ---------------------------------------------------------
export async function checkMlHealth(): Promise<{
  ok: boolean;
  fakeJobLoaded: boolean;
  resumeLoaded: boolean;
}> {
  try {
    const res = await apiJson<MlHealthData>('/api/ml/health', { method: 'GET' });
    if (res.ok && res.json.success) {
      const d = res.json.data;
      return {
        ok: d.status === 'ok',
        fakeJobLoaded: d.fakeJobModelLoaded,
        resumeLoaded: d.resumeModelLoaded,
      };
    }
    return { ok: false, fakeJobLoaded: false, resumeLoaded: false };
  } catch {
    return { ok: false, fakeJobLoaded: false, resumeLoaded: false };
  }
}

// ---- Fake-job detection (single) ------------------------------------------
export async function predictFakeJob(
  job: { title: string; company: string; description: string; location: string },
  token: string,
): Promise<{ ok: boolean; data: FakeJobPrediction | null; message: string | null }> {
  const res = await apiJson<FakeJobPrediction>('/api/ml/predict/fake-job', {
    method: 'POST',
    body: JSON.stringify(job),
    token,
  });
  if (res.ok && res.json.success) {
    return { ok: true, data: res.json.data, message: null };
  }
  const msg = !res.json.success ? res.json.message ?? 'Prediction failed' : 'Prediction failed';
  return { ok: false, data: null, message: msg };
}

// ---- Fake-job detection (batch) -------------------------------------------
export async function predictFakeJobBatch(
  jobs: Array<{ title: string; company: string; description: string; location: string }>,
  token: string,
): Promise<{ ok: boolean; results: FakeJobPrediction[]; message: string | null }> {
  const res = await apiJson<{ results: FakeJobPrediction[] }>('/api/ml/predict/fake-job/batch', {
    method: 'POST',
    body: JSON.stringify({ jobs }),
    token,
  });
  if (res.ok && res.json.success) {
    return { ok: true, results: res.json.data.results, message: null };
  }
  const msg = !res.json.success ? res.json.message ?? 'Batch prediction failed' : 'Batch prediction failed';
  return { ok: false, results: [], message: msg };
}

// ---- Resume generation ----------------------------------------------------
export async function generateResume(
  opts: {
    jobTitle?: string;
    jobDescription?: string;
    section?: 'summary' | 'experience' | 'cover_letter';
  },
  token: string,
): Promise<{ ok: boolean; data: ResumeGenResult | null; message: string | null }> {
  const res = await apiJson<ResumeGenResult>('/api/ml/generate/resume', {
    method: 'POST',
    body: JSON.stringify({
      jobTitle: opts.jobTitle ?? '',
      jobDescription: opts.jobDescription ?? '',
      section: opts.section ?? 'summary',
    }),
    token,
  });
  if (res.ok && res.json.success) {
    return { ok: true, data: res.json.data, message: null };
  }
  const msg = !res.json.success ? res.json.message ?? 'Generation failed' : 'Generation failed';
  return { ok: false, data: null, message: msg };
}

// ---- Tailor Resume from Uploaded File or Text ------------------------------
export async function tailorResumeWithUpload(
  opts: {
    jobTitle: string;
    jobCompany?: string;
    jobDescription: string;
    section?: string;
    engine?: 'ai' | 'local';
    file?: File | null;
    resumeText?: string;
  },
  token: string,
): Promise<{ ok: boolean; data: ResumeGenResult | null; message: string | null }> {
  try {
    if (opts.file) {
      const formData = new FormData();
      formData.append('resume', opts.file);
      formData.append('jobTitle', opts.jobTitle);
      if (opts.jobCompany) formData.append('jobCompany', opts.jobCompany);
      formData.append('jobDescription', opts.jobDescription);
      formData.append('section', opts.section || 'tailored_resume');
      formData.append('engine', opts.engine || 'ai');

      const url = `${(await import('./client')).apiBaseUrl}/api/ml/tailor-resume`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { ok: true, data: json.data, message: null };
      }
      return { ok: false, data: null, message: json.message || 'Tailoring failed' };
    }

    const res = await apiJson<ResumeGenResult>('/api/ml/tailor-resume', {
      method: 'POST',
      body: JSON.stringify({
        jobTitle: opts.jobTitle,
        jobCompany: opts.jobCompany || '',
        jobDescription: opts.jobDescription,
        section: opts.section || 'tailored_resume',
        engine: opts.engine || 'ai',
        resumeText: opts.resumeText || '',
      }),
      token,
    });
    if (res.ok && res.json.success) {
      return { ok: true, data: res.json.data, message: null };
    }
    const msg = !res.json.success ? res.json.message ?? 'Tailoring failed' : 'Tailoring failed';
    return { ok: false, data: null, message: msg };
  } catch (err) {
    return { ok: false, data: null, message: (err as Error).message || 'Network error' };
  }
}
