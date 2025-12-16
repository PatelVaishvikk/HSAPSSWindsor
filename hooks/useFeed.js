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
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      keepPreviousData: true
    }
  );

  return {
    posts: data?.posts || [],
    isLoading,
    error,
    mutate,
  };
}
