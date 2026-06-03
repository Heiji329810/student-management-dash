import { Navigate, useParams } from 'react-router-dom';

export function RedirectAddActivity() {
  const { clubId } = useParams<{ clubId: string }>();
  return (
    <Navigate
      to={clubId ? `/manage-activities/${clubId}` : '/manage-activities'}
      replace
    />
  );
}
