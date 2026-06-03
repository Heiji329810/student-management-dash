import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, MapPin, Mail } from 'lucide-react';

export function Founder() {
  const { clubs, currentUser, getRegisteredStudents } = useApp();

  if (!currentUser) {
    return null;
  }

  const myClubs = clubs.filter((club) => club.founderId === currentUser.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (currentUser.role !== 'founder') {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is only accessible to organization founders.
        </p>
      </div>
    );
  }

  if (myClubs.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">My Organizations</h2>
        <p className="text-muted-foreground">
          You haven't created any organizations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Organizations</h2>
        <p className="text-muted-foreground">
          Manage your organizations and view registered students
        </p>
      </div>

      <div className="space-y-6">
        {myClubs.map((club) => (
          <Card key={club.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{club.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {club.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{club.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {club.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activities scheduled for this organization.
                </p>
              ) : (
                club.activities.map((activity) => {
                  const registeredStudents = getRegisteredStudents(activity.id, club.id);
                  return (
                    <div key={activity.id} className="space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{activity.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {registeredStudents.length}
                            {activity.maxParticipants && ` / ${activity.maxParticipants}`} registered
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(activity.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {activity.location}
                          </div>
                        </div>
                      </div>

                      {registeredStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No students registered yet.
                        </p>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Student ID</TableHead>
                                <TableHead>Email</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {registeredStudents.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium">
                                    {student.name}
                                  </TableCell>
                                  <TableCell>{student.studentId}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      {student.email}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
