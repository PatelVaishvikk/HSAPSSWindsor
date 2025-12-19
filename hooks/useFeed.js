import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load feed');
  return res.json();
});

export function useFeed(scope = 'all', page = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/student-portal/posts?scope=${scope}&page=${page}&limit=20`, 
    fetcher, 
    {
      refreshInterval: 60000, 
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, 
      keepPreviousData: true,
      focusThrottleInterval: 5000
    }
  );

  return {
    posts: data?.posts || [],
    isLoading,
    error,
    mutate,
  };
}
