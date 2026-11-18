import { Link, useParams } from 'react-router-dom';
import { useApp } from '@/context/useApp';
import { StudentFiles } from '@/components/StudentFiles';
import { Button } from '@/components/ui/button';
export function ApplicationFiles() {
  const { applicationId } = useParams();
  const { currentUser, clubApplications } = useApp();
  const application = clubApplications.find(a => a.id === applicationId);
  if (!application) return <p>Application not found.</p>;
  return <div className="space-y-6">
    <Button asChild variant="outline"><Link to={currentUser?.role === 'founder' ? '/' : '/create-club'}>Back to applications</Link></Button>
    <div><h2 className="text-3xl font-bold">{application.name}</h2><p className="mt-2 text-muted-foreground">Submitted by {application.applicantName} · {application.status.replaceAll('_', ' ')}</p><p className="mt-3">{application.description}</p></div>
    <StudentFiles key={application.id} applicationId={application.id} />
  </div>;
}
