import { useQuery } from '@tanstack/react-query';
import Home from '../pages/Home';
import api from '../api/axios';

export default function PublicSite() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get('/public/settings').then((response) => response.data),
    staleTime: 60000,
  });

  if (data?.maintenance_mode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
        <section className="max-w-lg">
          <img src="/logo.png" alt="Obotantim Cooperative" className="mx-auto mb-6 h-16 w-16 object-contain" />
          <h1 className="font-sans text-3xl font-bold text-dark">We’ll be back shortly</h1>
          <p className="mt-3 text-gray-600">Our website is temporarily unavailable while we carry out maintenance.</p>
          {data.contact_email && <a className="mt-5 inline-block text-primary underline" href={`mailto:${data.contact_email}`}>{data.contact_email}</a>}
        </section>
      </main>
    );
  }
  return <Home />;
}
