import { useState, useEffect, useCallback } from "react";

// Cache per modul dengan stale-while-revalidate.
// Ketika tab diganti, data lama tetap ditampilkan hingga data baru datang.
// Setiap modul punya timestamp terakhir fetch.
const cache = {};

function useModulData(modul, apiFunc, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc();
      setData(result);
      cache[modul] = { data: result, timestamp: Date.now() };
      setLastFetch(Date.now());
    } catch (err) {
      setError(err.message);
      // Jika sudah pernah sukses, tampilkan data lama (stale)
      if (cache[modul]) {
        setData(cache[modul].data);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunc, ...deps]);

  // Saat tab berubah, coba refresh data (tapi tidak wajib)
  useEffect(() => {
    // Jika ada data cache yang fresh (< 30 detik), jangan fetch
    if (cache[modul] && Date.now() - cache[modul].timestamp < 30000) return;
    fetch();
  }, [fetch, modul]);

  return { data, loading, error, refetch: fetch };
}

export default useModulData;