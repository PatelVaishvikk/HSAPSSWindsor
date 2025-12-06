import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load feed');
  return res.json();
});

export function useFeed() {
  const { data, error, isLoading, mutate } = useSWR('/api/student-portal/posts', fetcher, {
    refreshInterval: 30000, // Poll every 30 seconds
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  return {
    posts: data?.posts || [],
    isLoading,
    error,
    mutate,
  };
}
