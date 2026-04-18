import { useEffect, useState } from 'react';
import { Alert, Skeleton } from 'antd';
import { GithubOutlined, LinkOutlined } from '@ant-design/icons';

const REPO_OWNER = 'Brandon82';
const REPO_NAME = 'WarcraftJournal';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=100`;
const COMMITS_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/commits/main`;
const CACHE_KEY = 'changelog-commits-v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CommitEntry {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorLogin?: string;
  avatarUrl?: string;
  date: string;
  htmlUrl: string;
}

interface CachedPayload {
  fetchedAt: number;
  commits: CommitEntry[];
}

interface GithubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  author: { login: string; avatar_url: string } | null;
}

type Status = 'loading' | 'ready' | 'error';

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(commits: CommitEntry[]) {
  try {
    const payload: CachedPayload = { fetchedAt: Date.now(), commits };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota or disabled — ignore
  }
}

function normalize(raw: GithubCommitResponse[]): CommitEntry[] {
  return raw.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message,
    authorName: c.commit.author?.name ?? 'Unknown',
    authorLogin: c.author?.login,
    avatarUrl: c.author?.avatar_url,
    date: c.commit.author?.date ?? '',
    htmlUrl: c.html_url,
  }));
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.round(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

function splitMessage(message: string): { title: string; body: string | null } {
  const trimmed = message.trim();
  const newlineIdx = trimmed.indexOf('\n');
  if (newlineIdx === -1) return { title: trimmed, body: null };
  const title = trimmed.slice(0, newlineIdx).trim();
  const body = trimmed.slice(newlineIdx + 1).trim();
  return { title, body: body.length > 0 ? body : null };
}

export default function ChangelogPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = readCache();
    if (cached) {
      setCommits(cached.commits);
      setStatus('ready');
      return;
    }

    (async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? 'GitHub API rate limit reached. Try again in a few minutes.'
              : `GitHub API returned ${res.status}.`
          );
        }
        const raw = (await res.json()) as GithubCommitResponse[];
        const normalized = normalize(raw);
        if (cancelled) return;
        writeCache(normalized);
        setCommits(normalized);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load commits.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        Changelog
      </h2>
      <p className="text-wow-text-secondary mb-2">
        Recent changes to WarcraftJournal, pulled live from GitHub.
      </p>
      <a
        href={COMMITS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-wow-text-dim hover:text-wow-gold transition-colors mb-8"
      >
        <GithubOutlined />
        <span>View full history on GitHub</span>
        <LinkOutlined className="text-xs" />
      </a>

      {status === 'loading' && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border border-wow-border rounded-lg p-4 bg-wow-bg-surface"
            >
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <Alert
          type="warning"
          showIcon
          message="Could not load commits"
          description={
            <div>
              <p className="m-0 mb-2">{error}</p>
              <a href={COMMITS_URL} target="_blank" rel="noopener noreferrer">
                View commits on GitHub
              </a>
            </div>
          }
        />
      )}

      {status === 'ready' && <CommitList commits={commits} />}
    </div>
  );
}

function CommitList({ commits }: { commits: CommitEntry[] }) {
  if (commits.length === 0) {
    return <p className="text-wow-text-secondary">No commits to display.</p>;
  }

  const rows: React.ReactNode[] = [];
  let currentDay = '';

  for (const commit of commits) {
    const dayKey = commit.date.slice(0, 10);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      rows.push(
        <div
          key={`day-${dayKey}`}
          className="text-[11px] font-semibold uppercase tracking-wider text-wow-text-dim mt-6 first:mt-0 mb-2 px-1"
        >
          {formatDateHeader(commit.date)}
        </div>
      );
    }
    rows.push(<CommitRow key={commit.sha} commit={commit} />);
  }

  return <div>{rows}</div>;
}

function CommitRow({ commit }: { commit: CommitEntry }) {
  const { title, body } = splitMessage(commit.message);
  const authorProfile = commit.authorLogin
    ? `https://github.com/${commit.authorLogin}`
    : null;

  return (
    <div className="border border-wow-border rounded-lg p-4 mb-2 bg-wow-bg-surface hover:border-wow-gold-muted transition-colors">
      <div className="flex items-start gap-3">
        {commit.avatarUrl ? (
          <img
            src={commit.avatarUrl}
            alt={`${commit.authorName} avatar`}
            className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 bg-wow-bg-elevated" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-wow-text font-medium break-words">{title}</span>
          </div>
          {body && (
            <pre className="text-[13px] text-wow-text-secondary whitespace-pre-wrap font-sans m-0 mt-1.5">
              {body}
            </pre>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-wow-text-dim flex-wrap">
            {authorProfile ? (
              <a
                href={authorProfile}
                target="_blank"
                rel="noopener noreferrer"
                className="text-wow-text-dim hover:text-wow-gold transition-colors"
              >
                {commit.authorName}
              </a>
            ) : (
              <span>{commit.authorName}</span>
            )}
            <span>·</span>
            <span title={new Date(commit.date).toLocaleString()}>
              {formatRelative(commit.date)}
            </span>
            <span>·</span>
            <a
              href={commit.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-wow-text-dim hover:text-wow-gold transition-colors"
            >
              {commit.shortSha}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
